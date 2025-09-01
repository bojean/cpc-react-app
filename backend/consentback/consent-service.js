const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');
const app = express();

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'consdb',
  password: process.env.DB_PASSWORD || '123',
  port: process.env.DB_PORT || 5432,
});

// Initialize new consent_forms table
const initConsentDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS consent_forms (
        id SERIAL PRIMARY KEY,
        patient_title VARCHAR(10),
        patient_name VARCHAR(255) NOT NULL,
        allergies_to_medications TEXT,
        date_administered DATE DEFAULT CURRENT_DATE,
        signature TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Consent forms table initialized');
  } catch (err) {
    console.error('Database initialization error:', err.stack);
    throw err;
  }
};

initConsentDb().catch(err => console.error('Failed to initialize consent database:', err));

// Save consent form endpoint
app.post('/save-consent-form', async (req, res) => {
  console.log(`${new Date().toISOString()} - POST /save-consent-form`);
  const { patientTitle, patientName, allergiesToMedications, date, signature } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO consent_forms (patient_title, patient_name, allergies_to_medications, date_administered, signature)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [patientTitle, patientName, allergiesToMedications, date, signature]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Consent form saved successfully', id: result.rows[0].id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Consent save error:', err.stack);
    res.status(500).json({ message: 'Failed to save consent form' });
  } finally {
    client.release();
  }
});

// Existing endpoints remain unchanged
const port = process.env.PORT || 5005;
app.listen(port, () => console.log(`Consent and Vaccination Service running on port ${port}`));