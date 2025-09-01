const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const pool = require('./initdb');
const WebSocket = require('ws');
const PDFDocument = require('pdfkit');

const app = express();
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
  preflightContinue: false
}));

app.use(express.json());

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  res.on('finish', () => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Status: ${res.statusCode}`);
  });
  next();
});

// Increase payload limit for JSON requests (e.g., for base64 signatures)
app.use(express.json({ limit: '10mb' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Payload too large. Maximum size is 10MB.' });
  }
  res.status(500).json({ message: 'Internal server error' });
});

// Middleware for auth
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// WebSocket setup for real-time updates
const wss = new WebSocket.Server({ port: 5004 });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected on port 5004');
  ws.on('message', async (message) => {
    try {
      const { type } = JSON.parse(message);
      if (type === 'subscribe_vaccination_exposures') {
        const result1 = await pool.query('SELECT * FROM patient_category_info ORDER BY created_at DESC');
        const result2 = await pool.query('SELECT * FROM attack_exposure_info ORDER BY created_at DESC');
        const result3 = await pool.query('SELECT * FROM animal_description_info ORDER BY created_at DESC');
        const result4 = await pool.query('SELECT * FROM medical_dossier_info ORDER BY created_at DESC');
        ws.send(JSON.stringify({
          type: 'vaccination_exposures_update',
          data: {
            patient_category: result1.rows,
            attack_exposure: result2.rows,
            animal_description: result3.rows,
            medical_dossier: result4.rows
          }
        }));
      }
    } catch (err) {
      console.error('WebSocket error:', err);
    }
  });
  ws.on('close', () => console.log('WebSocket client disconnected from port 5004'));
});

const notifyVaccinationExposuresUpdate = async () => {
  try {
    const result1 = await pool.query('SELECT * FROM patient_category_info ORDER BY created_at DESC');
    const result2 = await pool.query('SELECT * FROM attack_exposure_info ORDER BY created_at DESC');
    const result3 = await pool.query('SELECT * FROM animal_description_info ORDER BY created_at DESC');
    const result4 = await pool.query('SELECT * FROM medical_dossier_info ORDER BY created_at DESC');
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'vaccination_exposures_update',
          data: {
            patient_category: result1.rows,
            attack_exposure: result2.rows,
            animal_description: result3.rows,
            medical_dossier: result4.rows
          }
        }));
      }
    });
  } catch (err) {
    console.error('Error broadcasting vaccination exposures update:', err);
  }
};

// Save vaccination exposure form into four tables sequentially
app.post('/vaccination-exposures', async (req, res) => {
  console.log('Received body:', req.body); // Debug log to check incoming data
  const {
    patient_category_info: { patientCategory, patientName, patientSex, patientAge, city, neighborhood, contactNumber } = {},
    attack_exposure_info: { attackType, attackContext, exposureType, exposurePart, bleeding, bleedingPart, severity, clothing } = {},
    animal_description_info: { animalType, animalStatus, animalAddress, animalTravel, travelCountry, labResult, labNumber, labDate, animalVaccination, animalVaccinationDate } = {},
    medical_dossier_info: { medicalHistory, medicalHistoryDetails, coagulationIssue, coagulationDetails, immunosuppression, immunosuppressionDetails, pregnancy, pregnancyDetails, allergies, allergiesDetails, vatVaccination, antirabiesVaccination, antirabiesDate, antirabiesLot, hospitalization, hospitalizationDetails, woundDisinfection, disinfectionDelay, sutures, antibiotic, antibioticDetails, antibioticDosage, antibioticDuration, comments, signature, reporterName, reporterPosition } = {}
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Validate required fields
    if (!patientName || !patientSex || !patientAge || !city || !neighborhood || !exposurePart || !reporterName || !reporterPosition) {
      throw new Error('All required fields must be provided');
    }

    // Insert into patient_category_info
    const patientResult = await client.query(
      `INSERT INTO patient_category_info (
        patient_category, patient_name, patient_sex, patient_age, city, neighborhood, contact_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      [patientCategory || null, patientName, patientSex, patientAge, city, neighborhood, contactNumber || null]
    );
    const patientId = patientResult.rows[0].id;

    // Insert into attack_exposure_info
    const attackResult = await client.query(
      `INSERT INTO attack_exposure_info (
        patient_category_info_id, attack_type, attack_context, exposure_type, exposure_part,
        bleeding, bleeding_part, severity, clothing
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [patientId, attackType || null, attackContext || null, exposureType || null, exposurePart, bleeding || null, bleedingPart || null, severity || null, clothing || null]
    );
    const attackId = attackResult.rows[0].id;

    // Insert into animal_description_info
    const animalResult = await client.query(
      `INSERT INTO animal_description_info (
        attack_exposure_info_id, animal_type, animal_status, animal_address, animal_travel,
        travel_country, lab_result, lab_number, lab_date, animal_vaccination, animal_vaccination_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [attackId, animalType || null, animalStatus || null, animalAddress || null, animalTravel || null, travelCountry || null, labResult || null, labNumber || null, labDate || null, animalVaccination || null, animalVaccinationDate || null]
    );
    const animalId = animalResult.rows[0].id;

    // Insert into medical_dossier_info
    const medicalResult = await client.query(
      `INSERT INTO medical_dossier_info (
        animal_description_info_id, medical_history, medical_history_details, coagulation_issue,
        coagulation_details, immunosuppression, immunosuppression_details, pregnancy,
        pregnancy_details, allergies, allergies_details, vat_vaccination, antirabies_vaccination,
        antirabies_date, antirabies_lot, hospitalization, hospitalization_details, wound_disinfection,
        disinfection_delay, sutures, antibiotic, antibiotic_details, antibiotic_dosage,
        antibiotic_duration, comments, signature, reporter_name, reporter_position
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
      RETURNING id`,
      [
        animalId, medicalHistory || null, medicalHistoryDetails || null, coagulationIssue || null,
        coagulationDetails || null, immunosuppression || null, immunosuppressionDetails || null,
        pregnancy || null, pregnancyDetails || null, allergies || null, allergiesDetails || null,
        vatVaccination || null, antirabiesVaccination || null, antirabiesDate || null, antirabiesLot || null,
        hospitalization || null, hospitalizationDetails || null, woundDisinfection || null,
        disinfectionDelay || null, sutures || null, antibiotic || null, antibioticDetails || null,
        antibioticDosage || null, antibioticDuration || null, comments || null, signature || null,
        reporterName, reporterPosition
      ]
    );
    const medicalId = medicalResult.rows[0].id;

    await client.query('COMMIT');

    const responseData = {
      patient_category_info_id: patientId,
      attack_exposure_info_id: attackId,
      animal_description_info_id: animalId,
      medical_dossier_info_id: medicalId
    };
    res.status(201).json({ message: 'Vaccination exposure submitted successfully', data: responseData });
    notifyVaccinationExposuresUpdate();
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Vaccination exposure submission error:', err.stack);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// Generate PDF for admin or agent (combining data from all tables)
app.get('/vaccination-exposures/:patientId/pdf', authenticate, async (req, res) => {
  const { patientId } = req.params;
  try {
    const client = await pool.connect();
    await client.query('BEGIN');

    const patientResult = await client.query(
      'SELECT * FROM patient_category_info WHERE id = $1',
      [patientId]
    );
    if (patientResult.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ message: 'Patient record not found' });
    }
    const patient = patientResult.rows[0];

    const attackResult = await client.query(
      'SELECT * FROM attack_exposure_info WHERE patient_category_info_id = $1',
      [patientId]
    );
    const attack = attackResult.rows[0] || {};

    const animalResult = await client.query(
      'SELECT * FROM animal_description_info WHERE attack_exposure_info_id = $1',
      [attack.id || null]
    );
    const animal = animalResult.rows[0] || {};

    const medicalResult = await client.query(
      'SELECT * FROM medical_dossier_info WHERE animal_description_info_id = $1',
      [animal.id || null]
    );
    const medical = medicalResult.rows[0] || {};

    await client.query('COMMIT');
    client.release();

    if (!['admin', 'agent'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Only admins and agents can generate PDFs.' });
    }

    const doc = new PDFDocument();
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="CPC30-PR002-EN01_RAGE_${patientId}.pdf"`);
      res.status(200).send(pdfBuffer);
    });

    doc.fontSize(12).text('CPC030-PR002-EN01 Déclaration de Cas d’Exposition : RAGE', 20, 20);
    doc.text(`Version: 2, Date d’application: Juin 2025`, 20, 30);
    doc.text('CATÉGORIE PATIENT', 20, 40);
    doc.text(`Patient: ${patient.patient_category || 'N/A'}`, 20, 50);
    doc.text(`Noms prénoms: ${patient.patient_name || 'N/A'}`, 20, 60);
    doc.text(`Sexe: ${patient.patient_sex || 'N/A'}`, 20, 70);
    doc.text(`Age: ${patient.patient_age || 'N/A'}`, 20, 80);
    doc.text(`Adresse: ${patient.city}, ${patient.neighborhood || 'N/A'}`, 20, 90);
    doc.text(`Numéro de contact: ${patient.contact_number || 'N/A'}`, 20, 100);
    doc.text('DESCRIPTION DE L’ATTAQUE', 20, 110);
    doc.text(`Type d’attaque: ${attack.attack_type || 'N/A'}`, 20, 120);
    doc.text(`Contexte: ${attack.attack_context || 'N/A'}`, 20, 130);
    doc.text('NATURE DE L’EXPOSITION', 20, 140);
    doc.text(`Type: ${attack.exposure_type || 'N/A'}`, 20, 150);
    doc.text(`Partie du corps: ${attack.exposure_part || 'N/A'}`, 20, 160);
    doc.text(`Saignement: ${attack.bleeding || 'N/A'}${attack.bleeding === 'Oui' ? `, Partie: ${attack.bleeding_part || 'N/A'}` : ''}`, 20, 170);
    doc.text(`Gravité: ${attack.severity || 'N/A'}`, 20, 180);
    doc.text(`Vêtements: ${attack.clothing || 'N/A'}`, 20, 190);
    doc.text('DESCRIPTION DE L’ANIMAL', 20, 200);
    doc.text(`Type: ${animal.animal_type || 'N/A'}`, 20, 210);
    doc.text(`Statut: ${animal.animal_status || 'N/A'}`, 20, 220);
    doc.text(`Adresse: ${animal.animal_address || 'N/A'}`, 20, 230);
    doc.text(`Voyage: ${animal.animal_travel || 'N/A'}${animal.animal_travel === 'Oui' ? `, Pays: ${animal.travel_country || 'N/A'}` : ''}`, 20, 240);
    doc.text(`Résultat labo: ${animal.lab_result || 'N/A'}, N°: ${animal.lab_number || 'N/A'}, Date: ${animal.lab_date || 'N/A'}`, 20, 250);
    doc.text(`Vaccination animal: ${animal.animal_vaccination || 'N/A'}${animal.animal_vaccination === 'Oui' ? `, Date: ${animal.animal_vaccination_date || 'N/A'}` : ''}`, 20, 260);
    doc.text('DOSSIER MÉDICAL', 20, 270);
    doc.text(`Antécédents: ${medical.medical_history || 'N/A'}${medical.medical_history === 'Oui' ? `, Détails: ${medical.medical_history_details || 'N/A'}` : ''}`, 20, 280);
    doc.text(`Coagulation: ${medical.coagulation_issue || 'N/A'}${medical.coagulation_issue === 'Oui' ? `, Détails: ${medical.coagulation_details || 'N/A'}` : ''}`, 20, 290);
    doc.text(`Immunodépression: ${medical.immunosuppression || 'N/A'}${medical.immunosuppression === 'Oui' ? `, Détails: ${medical.immunosuppression_details || 'N/A'}` : ''}`, 20, 300);
    doc.text(`Grossesse: ${medical.pregnancy || 'N/A'}${medical.pregnancy === 'Oui' ? `, Détails: ${medical.pregnancy_details || 'N/A'}` : ''}`, 20, 310);
    doc.text(`Allergies: ${medical.allergies || 'N/A'}${medical.allergies === 'Oui' ? `, Détails: ${medical.allergies_details || 'N/A'}` : ''}`, 20, 320);
    doc.text(`Antécédents vaccinaux: VAT: ${medical.vat_vaccination || 'N/A'}, Antirabique: ${medical.antirabies_vaccination || 'N/A'}${medical.antirabies_vaccination === 'Oui' ? `, Date: ${medical.antirabies_date || 'N/A'}, N°Lot: ${medical.antirabies_lot || 'N/A'}` : ''}`, 20, 330);
    doc.text('ÉPISODE ACTUEL', 20, 340);
    doc.text(`Hospitalisation: ${medical.hospitalization || 'N/A'}${medical.hospitalization === 'Oui' ? `, Détails: ${medical.hospitalization_details || 'N/A'}` : ''}`, 20, 350);
    doc.text(`Désinfection: ${medical.wound_disinfection || 'N/A'}${medical.wound_disinfection === 'Oui' ? `, Délai: ${medical.disinfection_delay || 'N/A'}` : ''}`, 20, 360);
    doc.text(`Sutures: ${medical.sutures || 'N/A'}`, 20, 370);
    doc.text(`Antibiotique: ${medical.antibiotic || 'N/A'}${medical.antibiotic === 'Oui' ? `, Détails: ${medical.antibiotic_details || 'N/A'}, Posologie: ${medical.antibiotic_dosage || 'N/A'}, Durée: ${medical.antibiotic_duration || 'N/A'}` : ''}`, 20, 380);
    doc.text(`Commentaires: ${medical.comments || 'N/A'}`, 20, 390);
    if (medical.signature) {
      doc.text('Signature: [Image omitted]', 20, 400); // Placeholder due to pdfkit limitation
    }
    doc.text('Revue des données : Chef service Vaccination', 20, 430);

    doc.end();
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ message: 'Error generating PDF' });
  }
});

const port = process.env.PORT || 5003;
app.listen(port, () => console.log(`Vaccination Exposure Service running on port ${port}`));