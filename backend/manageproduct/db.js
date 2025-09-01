const { Pool } = require('pg');
require('dotenv').config(); // Load environment variables in db.js

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'prod_manage',
  password: process.env.DB_PASSWORD || '123',
  port: process.env.DB_PORT || 5432,
  
  
});

module.exports = pool;