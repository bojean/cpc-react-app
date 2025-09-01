require('dotenv').config();
const pool = require('../db');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    await pool.query(`
      -- Drop stocks table if it exists (no longer needed)
      DROP TABLE IF EXISTS stocks;

      -- Products table with quantity and threshold
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        quantity INT NOT NULL DEFAULT 0,
        numlot VARCHAR(50),
        issued_date DATE,
        expired_date DATE,
        threshold INT NOT NULL DEFAULT 10, -- Default threshold, admin-adjustable
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Commands table with validation status
      CREATE TABLE IF NOT EXISTS commands (
        id SERIAL PRIMARY KEY,
        agent_id INT NOT NULL, -- References users.id from user service
        product_id INT REFERENCES products(id) ON DELETE CASCADE,
        quantity INT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending', -- pending -> agent_validated -> admin_validated -> completed
        agent_validated BOOLEAN DEFAULT FALSE,
        admin_validated BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Product logs for tracking updates/deletes
      CREATE TABLE IF NOT EXISTS product_logs (
        id SERIAL PRIMARY KEY,
        product_id INT REFERENCES products(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        user_id INT NOT NULL, -- References users.id from user service
        details JSONB, -- Store name, quantity, unit_price, updated_date
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Usage logs for agent product usage
      CREATE TABLE IF NOT EXISTS usage_logs (
        id SERIAL PRIMARY KEY,
        agent_id INT NOT NULL, -- References users.id from user service
        product_id INT REFERENCES products(id) ON DELETE CASCADE,
        quantity_used INT NOT NULL,
        command_id INT REFERENCES commands(id) ON DELETE SET NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Tables created successfully');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
    process.exit();
  }
})();