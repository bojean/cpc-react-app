require('dotenv').config();
  const pool = require('./db');
  const bcrypt = require('bcryptjs');

  (async () => {
    try {
      await pool.query(`
        DROP TABLE IF EXISTS orders CASCADE;
        DROP TABLE IF EXISTS agent_assignments CASCADE;
        DROP TABLE IF EXISTS station_service_assignments CASCADE;
        DROP TABLE IF EXISTS services CASCADE;
        DROP TABLE IF EXISTS settings CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
        DROP TABLE IF EXISTS rabies_exposures CASCADE;

        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(20) DEFAULT 'admin'
        );

        CREATE TABLE IF NOT EXISTS settings (
          id SERIAL PRIMARY KEY,
          english_message VARCHAR(255) DEFAULT '{code} is waiting at {station} for {service}',
          french_message VARCHAR(255) DEFAULT '{code} attend à {station} pour {service}'
        );

        CREATE TABLE IF NOT EXISTS services (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          code VARCHAR(10) NOT NULL,
          description TEXT,
          status BOOLEAN DEFAULT TRUE,
          type VARCHAR(20) DEFAULT 'normal'
        );

        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          service_id INTEGER REFERENCES services(id),
          order_number VARCHAR(12) NOT NULL,
          code VARCHAR(20) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          called_at TIMESTAMP,
          waiting_time INTEGER,
          reception_start_at TIMESTAMP,
          reception_time INTEGER,
          status VARCHAR(20) DEFAULT 'pending'
        );

        CREATE TABLE IF NOT EXISTS agent_assignments (
          id SERIAL PRIMARY KEY,
          agent_id INTEGER REFERENCES users(id),
          station_id INTEGER REFERENCES services(id),
          start_day TEXT,
          end_day TEXT,
          start_time TIME,
          end_time TIME,
          UNIQUE (agent_id, start_day, end_day, start_time, end_time)
        );

        CREATE TABLE IF NOT EXISTS station_service_assignments (
          id SERIAL PRIMARY KEY,
          station_id INTEGER REFERENCES services(id),
          service_id INTEGER REFERENCES services(id)
        );

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

      const password = '123'; // Same password for all users
      await pool.query(`
        INSERT INTO users (email, password, role) VALUES
          ('admin@example.com', $1, 'admin'),
          ('amina@example.com', $2, 'agent'),
          ('agent2@example.com', $3, 'agent')
        ON CONFLICT DO NOTHING;
      `, [
        await bcrypt.hash(password, 10),
        await bcrypt.hash(password, 10),
        await bcrypt.hash(password, 10)
      ]);

      await pool.query('INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING');

      await pool.query(`
        INSERT INTO services (name, code, description, status, type) VALUES
          ('Analyse', 'A', 'Analyse service', true, 'normal'),
          ('Retrait', 'R', 'Retrait service', true, 'normal'),
          ('Vaccination', 'V', 'Vaccination service', true, 'normal'),
          ('Caisse 1', 'C1', 'Caisse 1', true, 'caisse'),
          ('Box 1', 'B1', 'Box for redirected codes', true, 'box'),
          ('Box 2', 'B2', 'Box for redirected codes', true, 'box'),
          ('Prelevement', 'P', 'Prelevement des patients', true, 'box')
        ON CONFLICT DO NOTHING;
      `);

      await pool.query(`
        INSERT INTO agent_assignments (agent_id, station_id, start_day, end_day, start_time, end_time) VALUES
          (2, 4, 'Monday', 'Tuesday', '07:00:00', '12:00:00'), -- Amina to Caisse 1
          (3, 5, 'Monday', 'Tuesday', '07:00:00', '12:00:00')  -- Agent2 to Box 1
        ON CONFLICT DO NOTHING;
      `);

      await pool.query(`
        INSERT INTO station_service_assignments (station_id, service_id) VALUES
          (4, 1), -- Caisse 1 to Analyse
          (4, 2)  -- Caisse 1 to Retrait
        ON CONFLICT DO NOTHING;
      `);

      console.log('Tables created and seeded');
    } catch (err) {
      console.error(err);
    } finally {
      await pool.end();
      process.exit();
    }
  })();