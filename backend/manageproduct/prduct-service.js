const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER || 'your_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'your_database',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT) || 5432
});

// Middleware to authenticate and authorize
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  next();
};

const isAgent = (req, res, next) => {
  if (req.user.role !== 'agent') return res.status(403).json({ message: 'Agent only' });
  next();
};


// Product management endpoints (admin only)
app.get('/products', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT p.*, s.quantity FROM products p LEFT JOIN stocks s ON p.id = s.product_id');
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch products error:', err.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/products', authenticate, isAdmin, async (req, res) => {
  const { name, description, issued_date, expired_date, unit_price, lot_number, threshold } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO products (name, description, issued_date, expired_date, unit_price, lot_number, threshold) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, description, issued_date, expired_date, unit_price, lot_number, threshold]
    );
    await pool.query('INSERT INTO stocks (product_id, quantity) VALUES ($1, 0)', [result.rows[0].id]);
    await pool.query(
      'INSERT INTO product_logs (product_id, action, user_id, details) VALUES ($1, $2, $3, $4)',
      [result.rows[0].id, 'create', req.user.id, JSON.stringify(req.body)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Add product error:', err.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/products/:id', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description, issued_date, expired_date, unit_price, lot_number, threshold } = req.body;
  const currentDate = new Date().toISOString().split('T')[0];
  try {
    const result = await pool.query(
      'UPDATE products SET name = $1, description = $2, issued_date = $3, expired_date = $4, unit_price = $5, lot_number = $6, threshold = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *',
      [name, description, issued_date, expired_date, unit_price, lot_number, threshold, id]
    );
    const isExpired = expired_date && new Date(expired_date) < new Date(currentDate);
    await pool.query(
      'INSERT INTO product_logs (product_id, action, user_id, details) VALUES ($1, $2, $3, $4)',
      [id, 'update', req.user.id, JSON.stringify({ ...req.body, isExpired, updatedBy: req.user.id, updatedAt: currentDate })]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update product error:', err.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/products/:id', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;
  const currentDate = new Date().toISOString().split('T')[0];
  try {
    await pool.query(
      'INSERT INTO product_logs (product_id, action, user_id, details) VALUES ($1, $2, $3, $4)',
      [id, 'delete', req.user.id, JSON.stringify({ deletedBy: req.user.id, deletedAt: currentDate })]
    );
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Delete product error:', err.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Command management endpoints
app.get('/commands', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const result = await pool.query('SELECT * FROM commands');
      res.json(result.rows);
    } else {
      const result = await pool.query('SELECT * FROM commands WHERE agent_id = $1', [req.user.id]);
      res.json(result.rows);
    }
  } catch (err) {
    console.error('Fetch commands error:', err.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/commands', authenticate, isAgent, async (req, res) => {
  const { product_id, quantity } = req.body;
  try {
    const result = await pool.query('INSERT INTO commands (agent_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING *', [req.user.id, product_id, quantity]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Create command error:', err.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/commands/:id/confirm', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('UPDATE commands SET status = $1 WHERE id = $2 RETURNING *', ['confirmed', id]);
    const command = result.rows[0];
    await pool.query('UPDATE stocks SET quantity = quantity - $1 WHERE product_id = $2 AND user_id IS NULL', [command.quantity, command.product_id]);
    const agentStock = await pool.query('SELECT * FROM stocks WHERE product_id = $1 AND user_id = $2', [command.product_id, command.agent_id]);
    if (agentStock.rows.length === 0) {
      await pool.query('INSERT INTO stocks (product_id, user_id, quantity) VALUES ($1, $2, $3)', [command.product_id, command.agent_id, command.quantity]);
    } else {
      await pool.query('UPDATE stocks SET quantity = quantity + $1 WHERE product_id = $2 AND user_id = $3', [command.quantity, command.product_id, command.agent_id]);
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Confirm command error:', err.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/commands/:id/receive', authenticate, isAgent, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('UPDATE commands SET status = $1 WHERE id = $2 AND agent_id = $3 RETURNING *', ['received', id, req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Receive command error:', err.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/commands/:id/complete', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('UPDATE commands SET status = $1 WHERE id = $2 RETURNING *', ['completed', id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Complete command error:', err.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Stock management endpoints
app.get('/stocks', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const result = await pool.query('SELECT * FROM stocks');
      res.json(result.rows);
    } else {
      const result = await pool.query('SELECT * FROM stocks WHERE user_id = $1 OR user_id IS NULL', [req.user.id]);
      res.json(result.rows);
    }
  } catch (err) {
    console.error('Fetch stocks error:', err.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Usage logging endpoint (agent only)
app.post('/usage', authenticate, isAgent, async (req, res) => {
  const { product_id, quantity_used, command_id } = req.body;
  try {
    const result = await pool.query('INSERT INTO usage_logs (agent_id, product_id, quantity_used, command_id) VALUES ($1, $2, $3, $4) RETURNING *', [req.user.id, product_id, quantity_used, command_id || null]);
    await pool.query('UPDATE stocks SET quantity = quantity - $1 WHERE product_id = $2 AND user_id = $3', [quantity_used, product_id, req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Log usage error:', err.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Alerts endpoint (low stock alerts)
app.get('/alerts', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT p.id, p.name, s.quantity, p.threshold FROM products p JOIN stocks s ON p.id = s.product_id WHERE s.quantity < p.threshold AND s.user_id IS NULL');
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch alerts error:', err.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Product logs endpoint (admin only)
app.get('/product-logs', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM product_logs ORDER BY timestamp DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch product logs error:', err.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Usage logs endpoint (admin and agent)
app.get('/usage-logs', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const result = await pool.query('SELECT * FROM usage_logs ORDER BY timestamp DESC');
      res.json(result.rows);
    } else {
      const result = await pool.query('SELECT * FROM usage_logs WHERE agent_id = $1 ORDER BY timestamp DESC', [req.user.id]);
      res.json(result.rows);
    }
  } catch (err) {
    console.error('Fetch usage logs error:', err.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
});

const port = 5009;
app.listen(port, () => console.log(`Product Management Service running on port ${port}`));