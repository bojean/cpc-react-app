const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config({ debug: true }); // Enable dotenv debug logging

const app = express();
app.use(cors({
  origin: 'http://localhost:3000', // Adjust based on your frontend URL
  credentials: true
}));
app.use(express.json());

const poolConfig = {
  user: process.env.DB_USER || 'product_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'product_database',
  password: process.env.DB_PASSWORD || '', // Ensure password is a string
  port: parseInt(process.env.DB_PORT) || 5432
};
console.log('Pool Configuration:', poolConfig); // Debug pool config

const pool = new Pool(poolConfig);

// Middleware to authenticate and authorize
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  console.log('Authentication Token:', token ? 'Present' : 'Missing');
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    if (decoded.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    req.user = decoded;
    console.log('Authenticated User:', req.user);
    next();
  } catch (err) {
    console.error('Authentication Error:', err.message);
    res.status(401).json({ message: 'Invalid token' });
  }
};



// CRUD Endpoints
app.get('/products', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT p.*, s.quantity FROM products p LEFT JOIN stocks s ON p.id = s.id');
    console.log('Fetched products:', result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch products error:', err.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/products', authenticate, async (req, res) => {
  const { name, description, issued_date, expired_date, unit_price, lot_number, threshold, quantity } = req.body;
  console.log('Received Add Product Request:', req.body);
  try {
    const result = await pool.query(
      'INSERT INTO products (name, description, issued_date, expired_date, unit_price, lot_number, threshold) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, description, issued_date, expired_date, unit_price, lot_number, threshold]
    );
    await pool.query('INSERT INTO stocks (product_id, quantity) VALUES ($1, $2)', [result.rows[0].id, quantity || 0]);
    await pool.query(
      'INSERT INTO product_logs (product_id, action, user_id, details) VALUES ($1, $2, $3, $4)',
      [result.rows[0].id, 'create', req.user.id, JSON.stringify(req.body)]
    );
    console.log('Added product:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add product error:', err.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/products/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { name, description, issued_date, expired_date, unit_price, lot_number, threshold } = req.body;
  console.log('Received Update Product Request:', { id, body: req.body });
  try {
    const result = await pool.query(
      'UPDATE products SET name = $1, description = $2, issued_date = $3, expired_date = $4, unit_price = $5, lot_number = $6, threshold = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *',
      [name, description, issued_date, expired_date, unit_price, lot_number, threshold, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Product not found' });
    console.log('Updated product:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update product error:', err.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/products/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  console.log('Received Delete Product Request:', { id });
  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Product not found' });
    console.log('Deleted product:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Delete product error:', err.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/alerts', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT p.id, p.name, s.quantity, p.threshold FROM products p LEFT JOIN stocks s ON p.id = s.id WHERE s.quantity < p.threshold'
    );
    console.log('Fetched alerts:', result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch alerts error:', err.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
});

const port = 5010;
app.listen(port, () => console.log(`Product Management Service running on port ${port}`));