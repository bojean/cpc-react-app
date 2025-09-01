require('dotenv').config();
  const pool = require('../db');
  const bcrypt = require('bcryptjs');

  (async () => {
    try {
      await pool.query(`

    CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    issued_date DATE,
    expired_date DATE,
    unit_price DECIMAL(10, 2),
    lot_number VARCHAR(50),
    threshold INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS stocks (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id),
    quantity INT NOT NULL,
    user_id INT, -- null for central stock, agent id for agent stock
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS commands (
    id SERIAL PRIMARY KEY,
    agent_id INT NOT NULL,
    product_id INT REFERENCES products(id),
    quantity INT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS product_logs (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id),
    action VARCHAR(50) NOT NULL,
    user_id INT NOT NULL,
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS usage_logs (
    id SERIAL PRIMARY KEY,
    agent_id INT NOT NULL,
    product_id INT REFERENCES products(id),
    quantity_used INT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    command_id INT REFERENCES commands(id)
  );

      `);

      

      console.log('Tables created ');
    } catch (err) {
      console.error(err);
    } finally {
      await pool.end();
      process.exit();
    }
  })();