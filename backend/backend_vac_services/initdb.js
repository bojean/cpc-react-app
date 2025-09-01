require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'your_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'your_database',
  password: process.env.DB_PASSWORD || 'your_password',
  port: process.env.DB_PORT || 5432,
});

const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS patient_category_info (
        id SERIAL PRIMARY KEY,
        patient_category VARCHAR(50),
        patient_name VARCHAR(255) NOT NULL,
        patient_sex VARCHAR(10) NOT NULL,
        patient_age INT NOT NULL,
        city VARCHAR(100) NOT NULL,
        neighborhood VARCHAR(100) NOT NULL,
        contact_number VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attack_exposure_info (
        id SERIAL PRIMARY KEY,
        patient_category_info_id INT REFERENCES patient_category_info(id),
        attack_type VARCHAR(100),
        attack_context VARCHAR(255),
        exposure_type VARCHAR(100),
        exposure_part VARCHAR(100) NOT NULL,
        bleeding VARCHAR(8), -- Increased to 8 for 'Inconnue'
        bleeding_part VARCHAR(100),
        severity VARCHAR(10),
        clothing VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS animal_description_info (
        id SERIAL PRIMARY KEY,
        attack_exposure_info_id INT REFERENCES attack_exposure_info(id),
        animal_type VARCHAR(100),
        animal_status VARCHAR(100),
        animal_address TEXT,
        animal_travel VARCHAR(8), -- Increased to 8 for 'Inconnue'
        travel_country VARCHAR(100),
        lab_result VARCHAR(255),
        lab_number VARCHAR(50),
        lab_date DATE,
        animal_vaccination VARCHAR(8), -- Increased to 8 for 'Inconnue'
        animal_vaccination_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS medical_dossier_info (
        id SERIAL PRIMARY KEY,
        animal_description_info_id INT REFERENCES animal_description_info(id),
        medical_history VARCHAR(8), -- Increased to 8 for 'Inconnue'
        medical_history_details TEXT,
        coagulation_issue VARCHAR(8), -- Increased to 8 for 'Inconnue'
        coagulation_details TEXT,
        immunosuppression VARCHAR(8), -- Increased to 8 for 'Inconnue'
        immunosuppression_details TEXT,
        pregnancy VARCHAR(8), -- Increased to 8 for 'Inconnue'
        pregnancy_details TEXT,
        allergies VARCHAR(8), -- Increased to 8 for 'Inconnue'
        allergies_details TEXT,
        vat_vaccination VARCHAR(8), -- Increased to 8 for 'Inconnue'
        antirabies_vaccination VARCHAR(8), -- Increased to 8 for 'Inconnue'
        antirabies_date DATE,
        antirabies_lot VARCHAR(50),
        hospitalization VARCHAR(8), -- Increased to 8 for 'Inconnue'
        hospitalization_details TEXT,
        wound_disinfection VARCHAR(8), -- Increased to 8 for 'Inconnue'
        disinfection_delay VARCHAR(50),
        sutures VARCHAR(8), -- Increased to 8 for 'Inconnue'
        antibiotic VARCHAR(8), -- Increased to 8 for 'Inconnue'
        antibiotic_details VARCHAR(255),
        antibiotic_dosage VARCHAR(50),
        antibiotic_duration VARCHAR(50),
        comments TEXT,
        signature TEXT,
        reporter_name VARCHAR(255) NOT NULL,
        reporter_position VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Vaccination exposure tables initialized');
  } catch (err) {
    console.error('Database initialization error:', err.stack);
    throw err;
  }
};

initDb().catch(err => console.error('Failed to initialize database:', err));

module.exports = pool;