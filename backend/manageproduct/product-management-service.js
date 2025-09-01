const express = require('express');
const pool = require('../db');
const axios = require('axios');
const app = express();
app.use(express.json());

const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:5000'; // Points to first service
const currentDate = new Date().toISOString().split('T')[0]; // 2025-08-29

// Authentication middleware
const authMiddleware = (requiredRole) => async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    // Validate token by fetching user details from the first service
    const response = await axios.get(`${userServiceUrl}/api/users/${token}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    req.user = response.data; // Expected: { id, email, role, profile_picture, username }
    if (req.user.role !== requiredRole) return res.status(403).json({ error: 'Unauthorized' });
    next();
  } catch (err) {
    if (err.response && err.response.status === 401) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    res.status(500).json({ error: 'Authentication service error' });
  }
};

// Admin-only CRUD operations
app.get('/products', authMiddleware('admin'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/products', authMiddleware('admin'), async (req, res) => {
  const { name, unit_price, quantity, numlot, issued_date, expired_date, threshold } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO products (name, unit_price, quantity, numlot, issued_date, expired_date, threshold) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, unit_price, quantity, numlot, issued_date, expired_date, threshold || 10]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/products/:id', authMiddleware('admin'), async (req, res) => {
  const { id } = req.params;
  const { name, unit_price, quantity, numlot, issued_date, expired_date, threshold } = req.body;
  try {
    // Log before update
    const product = (await pool.query('SELECT * FROM products WHERE id = $1', [id])).rows[0];
    await pool.query(
      'INSERT INTO product_logs (product_id, action, user_id, details) VALUES ($1, $2, $3, $4)',
      [id, 'update', req.user.id, JSON.stringify({ ...product, updated_date: new Date() })]
    );

    const result = await pool.query(
      'UPDATE products SET name = $1, unit_price = $2, quantity = $3, numlot = $4, issued_date = $5, expired_date = $6, threshold = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *',
      [name, unit_price, quantity, numlot, issued_date, expired_date, threshold, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/products/:id', authMiddleware('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    // Log before delete
    const product = (await pool.query('SELECT * FROM products WHERE id = $1', [id])).rows[0];
    await pool.query(
      'INSERT INTO product_logs (product_id, action, user_id, details) VALUES ($1, $2, $3, $4)',
      [id, 'delete', req.user.id, JSON.stringify({ ...product, updated_date: new Date() })]
    );

    await pool.query('DELETE FROM products WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Agent command management
app.post('/commands', authMiddleware('agent'), async (req, res) => {
  const { product_id, quantity } = req.body;
  try {
    const product = (await pool.query('SELECT quantity, threshold FROM products WHERE id = $1', [product_id])).rows[0];
    if (!product || product.quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient quantity or product not found' });
    }
    const result = await pool.query(
      'INSERT INTO commands (agent_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, product_id, quantity]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/commands/:id/validate-agent', authMiddleware('agent'), async (req, res) => {
  const { id } = req.params;
  try {
    const command = (await pool.query('SELECT * FROM commands WHERE id = $1 AND agent_id = $2', [id, req.user.id])).rows[0];
    if (!command) return res.status(403).json({ error: 'Unauthorized or command not found' });
    await pool.query('UPDATE commands SET agent_validated = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    res.json({ message: 'Agent validated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/commands/:id/validate-admin', authMiddleware('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const command = (await pool.query('SELECT * FROM commands WHERE id = $1 AND agent_validated = TRUE', [id])).rows[0];
    if (!command) return res.status(400).json({ error: 'Agent validation required or command not found' });
    await pool.query(
      'UPDATE commands SET admin_validated = TRUE, status = \'validated\', updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    await pool.query(
      'UPDATE products SET quantity = quantity - $1 WHERE id = $2',
      [command.quantity, command.product_id]
    );
    res.json({ message: 'Admin validated, quantity updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Agent usage
app.post('/usage', authMiddleware('agent'), async (req, res) => {
  const { product_id, quantity_used, command_id } = req.body;
  try {
    const command = (await pool.query('SELECT * FROM commands WHERE id = $1 AND agent_id = $2 AND status = \'validated\'', [command_id, req.user.id])).rows[0];
    if (!command || command.quantity < quantity_used) return res.status(400).json({ error: 'Invalid command or insufficient quantity' });
    await pool.query(
      'INSERT INTO usage_logs (agent_id, product_id, quantity_used, command_id) VALUES ($1, $2, $3, $4)',
      [req.user.id, product_id, quantity_used, command_id]
    );
    res.status(201).json({ message: 'Usage logged' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alerts endpoint (admin can check)
app.get('/alerts', authMiddleware('admin'), async (req, res) => {
  try {
    const lowQuantity = await pool.query(
      'SELECT id, name, quantity, threshold FROM products WHERE quantity < threshold'
    );
    const expired = await pool.query(
      'SELECT id, name, expired_date FROM products WHERE expired_date <= $1',
      [currentDate]
    );
    res.json({ lowQuantity: lowQuantity.rows, expired: expired.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5010, () => console.log('Product Management service running on port 5010'));