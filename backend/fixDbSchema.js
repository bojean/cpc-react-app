const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

async function fixDbSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rabies_exposures (
        id SERIAL PRIMARY KEY,
        patient_category VARCHAR(20),
        patient_name VARCHAR(255) NOT NULL,
        patient_age INTEGER NOT NULL,
        patient_sex VARCHAR(10) NOT NULL,
        patient_address TEXT NOT NULL,
        contact_number VARCHAR(20),
        attack_type VARCHAR(50),
        attack_context VARCHAR(100),
        exposure_type VARCHAR(50) NOT NULL,
        exposure_part TEXT NOT NULL,
        bleeding VARCHAR(10),
        bleeding_part TEXT,
        severity VARCHAR(10) NOT NULL,
        clothing VARCHAR(50),
        animal_type VARCHAR(50) NOT NULL,
        animal_status VARCHAR(50) NOT NULL,
        animal_address TEXT,
        animal_travel VARCHAR(10),
        travel_country TEXT,
        lab_result VARCHAR(50),
        lab_number VARCHAR(50),
        lab_date DATE,
        animal_vaccination VARCHAR(20),
        animal_vaccination_date DATE,
        medical_history VARCHAR(10),
        medical_history_details TEXT,
        coagulation_issue VARCHAR(10),
        coagulation_details TEXT,
        immunosuppression VARCHAR(10),
        immunosuppression_details TEXT,
        pregnancy VARCHAR(10),
        pregnancy_details TEXT,
        allergies VARCHAR(10),
        allergies_details TEXT,
        vat_vaccination VARCHAR(10),
        antirabies_vaccination VARCHAR(10),
        antirabies_date DATE,
        antirabies_lot VARCHAR(50),
        hospitalization VARCHAR(10),
        hospitalization_details TEXT,
        wound_disinfection VARCHAR(10),
        disinfection_delay TEXT,
        sutures VARCHAR(10),
        antibiotic VARCHAR(10),
        antibiotic_details TEXT,
        antibiotic_dosage TEXT,
        antibiotic_duration TEXT,
        comments TEXT,
        signature TEXT,
        reporter_name VARCHAR(255) NOT NULL,
        reporter_position VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL,
        client_ip VARCHAR(45)
      );
    `);
    console.log('Database schema updated successfully');
  } catch (err) {
    console.error('Error updating database schema:', err);
  } finally {
    await pool.end();
  }
}

fixDbSchema();