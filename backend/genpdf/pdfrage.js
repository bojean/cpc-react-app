require('dotenv').config();
const express = require('express');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PDF_SERVICE_PORT || 5007;

app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'your_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'your_database',
  password: process.env.DB_PASSWORD || 'your_password',
  port: process.env.DB_PORT || 5432,
});

// Function to fetch data from database
async function getVaccinationExposureDataById(id) {
  try {
    const query = `
      SELECT
        pci.*,
        aei.*,
        adi.*,
        mdi.*
      FROM patient_category_info pci
      LEFT JOIN attack_exposure_info aei ON aei.patient_category_info_id = pci.id
      LEFT JOIN animal_description_info adi ON adi.attack_exposure_info_id = aei.id
      LEFT JOIN medical_dossier_info mdi ON mdi.animal_description_info_id = adi.id
      WHERE pci.id = $1
      ORDER BY pci.created_at DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      throw new Error('Record not found');
    }
    const row = result.rows[0];
    return {
      patient_category_info: {
        patientCategory: row.patient_category,
        patientName: row.patient_name,
        patientSex: row.patient_sex,
        patientAge: row.patient_age,
        city: row.city,
        neighborhood: row.neighborhood,
        contactNumber: row.contact_number,
      },
      attack_exposure_info: {
        attackType: row.attack_type,
        attackContext: row.attack_context,
        exposureType: row.exposure_type,
        exposurePart: row.exposure_part,
        bleeding: row.bleeding,
        bleedingPart: row.bleeding_part,
        severity: row.severity,
        clothing: row.clothing,
      },
      animal_description_info: {
        animalType: row.animal_type,
        animalStatus: row.animal_status,
        animalAddress: row.animal_address,
        animalTravel: row.animal_travel,
        travelCountry: row.travel_country,
        labResult: row.lab_result,
        labNumber: row.lab_number,
        labDate: row.lab_date ? new Date(row.lab_date).toISOString().split('T')[0] : null,
        animalVaccination: row.animal_vaccination,
        animalVaccinationDate: row.animal_vaccination_date ? new Date(row.animal_vaccination_date).toISOString().split('T')[0] : null,
      },
      medical_dossier_info: {
        medicalHistory: row.medical_history,
        medicalHistoryDetails: row.medical_history_details,
        coagulationIssue: row.coagulation_issue,
        coagulationDetails: row.coagulation_details,
        immunosuppression: row.immunosuppression,
        immunosuppressionDetails: row.immunosuppression_details,
        pregnancy: row.pregnancy,
        pregnancyDetails: row.pregnancy_details,
        allergies: row.allergies,
        allergiesDetails: row.allergies_details,
        vatVaccination: row.vat_vaccination,
        antirabiesVaccination: row.antirabies_vaccination,
        antirabiesDate: row.antirabies_date ? new Date(row.antirabies_date).toISOString().split('T')[0] : null,
        antirabiesLot: row.antirabies_lot,
        hospitalization: row.hospitalization,
        hospitalizationDetails: row.hospitalization_details,
        woundDisinfection: row.wound_disinfection,
        disinfectionDelay: row.disinfection_delay,
        sutures: row.sutures,
        antibiotic: row.antibiotic,
        antibioticDetails: row.antibiotic_details,
        antibioticDosage: row.antibiotic_dosage,
        antibioticDuration: row.antibiotic_duration,
        comments: row.comments,
        signature: row.signature,
        reporterName: row.reporter_name,
        reporterPosition: row.reporter_position,
      },
    };
  } catch (error) {
    console.error('Error fetching data from database:', error);
    throw error;
  }
}

// Function to generate PDF from scratch
async function generateRabiesExposurePDF(data, res) {
  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const page = pdfDoc.addPage([595, 842]); // A4 size in points
    const fontSize = 10;
    const lineHeight = 15;
    const margin = 40;
    let y = 842 - margin - 20; // Start from top

    // Helper function to draw text
    function drawText(text, x, y, options = {}) {
      page.drawText(text, { x, y, size: fontSize, font: options.bold ? boldFont : font, color: rgb(0, 0, 0), ...options });
    }

    // Helper function to draw checkbox
    function drawCheckbox(x, y, checked = false, size = 10) {
      page.drawRectangle({
        x, y, width: size, height: size, borderWidth: 1, borderColor: rgb(0, 0, 0), color: rgb(1, 1, 1)
      });
      if (checked) {
        page.drawText('X', { x: x + 2, y: y + 2, size: size - 2, font, color: rgb(0, 0, 0) });
      }
    }

    // Helper function to draw line for text field
    function drawLine(x, y, width) {
      page.drawLine({
        start: { x, y: y - 2 }, end: { x: x + width, y: y - 2 }, thickness: 1, color: rgb(0, 0, 0)
      });
    }

    // Header
    drawText('Centre Pasteur du Cameroun', margin, 842 - 40, { bold: true, size: 14 });
    const headerX = 300;
    drawText('ENREGISTREMENT', headerX, 842 - 40, { bold: true });
    drawText('CPC030-PR002-EN01', headerX + 120, 842 - 40);
    page.drawLine({ start: { x: headerX, y: 842 - 30 }, end: { x: 595 - margin, y: 842 - 30 }, thickness: 1 });
    page.drawLine({ start: { x: headerX + 120, y: 842 - 50 }, end: { x: headerX + 120, y: 842 - 30 }, thickness: 1 });
    y = 842 - 60;
    drawText('Déclaration de Cas d\'Exposition :', headerX, y);
    drawText('Version : 2', headerX + 200, y);
    y -= 20;
    drawText('RAGE', headerX, y, { bold: true, size: 12 });
    drawText('Date d\'application : Juin 2025', headerX + 200, y);
    page.drawLine({ start: { x: headerX, y: y + lineHeight }, end: { x: 595 - margin, y: y + lineHeight }, thickness: 1 });
    page.drawLine({ start: { x: headerX, y: y - 10 }, end: { x: 595 - margin, y: y - 10 }, thickness: 1 });
    page.drawLine({ start: { x: headerX + 200, y: y + lineHeight }, end: { x: headerX + 200, y: y - 10 }, thickness: 1 });
    page.drawLine({ start: { x: headerX, y: y + lineHeight }, end: { x: headerX, y: y - 10 }, thickness: 1 });
    page.drawLine({ start: { x: 595 - margin, y: y + lineHeight }, end: { x: 595 - margin, y: y - 10 }, thickness: 1 });
    y -= 40;

    // CATÉGORIE PATIENT section
    let sectionStartY = y;
    drawText('CATÉGORIE PATIENT', margin, y, { bold: true });
    y -= lineHeight;
    drawCheckbox(margin, y, data.patient_category_info?.patientCategory === 'Mineur');
    drawText('Patient Mineur', margin + 15, y);
    drawCheckbox(margin + 150, y, data.patient_category_info?.patientCategory === 'Adulte');
    drawText('Patient Adulte', margin + 165, y);
    y -= lineHeight;
    drawText('Noms prénoms :', margin, y);
    drawLine(margin + 80, y, 200);
    drawText(data.patient_category_info?.patientName || '', margin + 85, y);
    drawCheckbox(margin + 300, y, data.patient_category_info?.patientSex === 'Homme');
    drawText('Homme', margin + 315, y);
    drawCheckbox(margin + 380, y, data.patient_category_info?.patientSex === 'Femme');
    drawText('Femme', margin + 395, y);
    y -= lineHeight;
    drawText('Age :', margin, y);
    drawLine(margin + 40, y, 50);
    drawText(data.patient_category_info?.patientAge?.toString() || '', margin + 45, y);
    drawText('Ville de résidence:', margin + 100, y);
    drawLine(margin + 180, y, 100);
    drawText(data.patient_category_info?.city || '', margin + 185, y);
    drawText('Quartier :', margin + 300, y);
    drawLine(margin + 360, y, 100);
    drawText(data.patient_category_info?.neighborhood || '', margin + 365, y);
    y -= lineHeight;
    drawText('Contact Number :', margin, y);
    drawLine(margin + 120, y, 100);
    drawText(data.patient_category_info?.contactNumber || '', margin + 125, y);
    let sectionHeight = sectionStartY - y + lineHeight;
    page.drawRectangle({ x: margin - 5, y: y - 5, width: 595 - 2*margin + 10, height: sectionHeight + 10, borderWidth: 1, borderColor: rgb(0,0,0) });
    y -= lineHeight * 2;

    // DESCRIPTION DE L'ATTAQUE section
    sectionStartY = y;
    drawText('DESCRIPTION DE L\'ATTAQUE', margin, y, { bold: true });
    y -= lineHeight;
    drawCheckbox(margin, y, data.attack_exposure_info?.attackType === 'Attaque spontanée');
    drawText('Attaque spontanée', margin + 15, y);
    drawCheckbox(margin + 150, y, data.attack_exposure_info?.attackType === 'Attaque réactionnelle');
    drawText('Attaque réactionnelle', margin + 165, y);
    drawCheckbox(margin + 320, y, data.attack_exposure_info?.attackType === 'Attaque collective');
    drawText('Attaque collective (plusieurs animaux en causes)', margin + 335, y);
    y -= lineHeight;
    drawCheckbox(margin, y, data.attack_exposure_info?.attackContext === 'En cours de manipulation de prélèvement au laboratoire');
    drawText('En cours de manipulation de prélèvement au laboratoire', margin + 15, y);
    drawCheckbox(margin + 300, y, data.attack_exposure_info?.attackContext === 'Pendant les soins');
    drawText('Pendant les soins', margin + 315, y);
    sectionHeight = sectionStartY - y + lineHeight;
    page.drawRectangle({ x: margin - 5, y: y - 5, width: 595 - 2*margin + 10, height: sectionHeight + 10, borderWidth: 1, borderColor: rgb(0,0,0) });
    y -= lineHeight * 2;

    // NATURE DE L'EXPOSITION section
    sectionStartY = y;
    drawText('NATURE DE L\'EXPOSITION', margin, y, { bold: true });
    y -= lineHeight;
    drawCheckbox(margin, y, data.attack_exposure_info?.exposureType === 'Morsure');
    drawText('Morsure', margin + 15, y);
    drawCheckbox(margin + 80, y, data.attack_exposure_info?.exposureType === 'Griffure');
    drawText('Griffure', margin + 95, y);
    drawCheckbox(margin + 160, y, data.attack_exposure_info?.exposureType === 'Léchage');
    drawText('Léchage', margin + 175, y);
    drawCheckbox(margin + 240, y, data.attack_exposure_info?.exposureType === 'Autre');
    drawText('Autre', margin + 255, y);
    y -= lineHeight;
    drawText('Quelle partie du corps a été exposé ?', margin, y);
    drawLine(margin + 220, y, 300);
    drawText(data.attack_exposure_info?.exposurePart || '', margin + 225, y);
    y -= lineHeight;
    drawText('Saignement immédiat :', margin, y);
    drawCheckbox(margin + 120, y, data.attack_exposure_info?.bleeding === 'Non');
    drawText('Non', margin + 135, y);
    drawCheckbox(margin + 170, y, data.attack_exposure_info?.bleeding === 'Oui');
    drawText('Oui : quelle partie du corps', margin + 185, y);
    drawLine(margin + 320, y, 200);
    drawText(data.attack_exposure_info?.bleedingPart || '', margin + 325, y);
    y -= lineHeight;
    drawText('Gravité :', margin, y);
    drawCheckbox(margin + 60, y, data.attack_exposure_info?.severity === 'I');
    drawText('I', margin + 75, y);
    drawCheckbox(margin + 100, y, data.attack_exposure_info?.severity === 'II');
    drawText('II', margin + 115, y);
    drawCheckbox(margin + 140, y, data.attack_exposure_info?.severity === 'III');
    drawText('III', margin + 155, y);
    y -= lineHeight;
    drawText('Vêtements :', margin, y);
    drawCheckbox(margin + 80, y, data.attack_exposure_info?.clothing === 'Déchirés');
    drawText('Déchirés', margin + 95, y);
    drawCheckbox(margin + 160, y, data.attack_exposure_info?.clothing === 'Épais intacts');
    drawText('Épais intacts', margin + 175, y);
    drawCheckbox(margin + 260, y, data.attack_exposure_info?.clothing === 'Léger intact');
    drawText('Léger intact', margin + 275, y);
    drawCheckbox(margin + 360, y, data.attack_exposure_info?.clothing === 'Peau nue');
    drawText('Peau nue', margin + 375, y);
    sectionHeight = sectionStartY - y + lineHeight;
    page.drawRectangle({ x: margin - 5, y: y - 5, width: 595 - 2*margin + 10, height: sectionHeight + 10, borderWidth: 1, borderColor: rgb(0,0,0) });
    y -= lineHeight * 2;

    // DESCRIPTION DE L'ANIMAL section
    sectionStartY = y;
    drawText('DESCRIPTION DE L\'ANIMAL', margin, y, { bold: true });
    y -= lineHeight;
    drawCheckbox(margin, y, data.animal_description_info?.animalType === 'Chien');
    drawText('Chien', margin + 15, y);
    drawCheckbox(margin + 60, y, data.animal_description_info?.animalType === 'Chat');
    drawText('Chat', margin + 75, y);
    drawCheckbox(margin + 110, y, data.animal_description_info?.animalType === 'Singe');
    drawText('Singe', margin + 125, y);
    drawCheckbox(margin + 170, y, data.animal_description_info?.animalType === 'Chauve-souris');
    drawText('Chauve-souris', margin + 185, y);
    drawCheckbox(margin + 280, y, data.animal_description_info?.animalType === 'Autre');
    drawText('Autre :', margin + 295, y);
    drawLine(margin + 340, y, 200);
    drawText(data.animal_description_info?.animalType === 'Autre' ? data.animal_description_info?.animalType : '', margin + 345, y);
    y -= lineHeight;
    drawCheckbox(margin, y, data.animal_description_info?.animalStatus === 'Animal connu et disponible');
    drawText('Animal connu et disponible', margin + 15, y);
    drawText('Adresse du Maitre de l\'animal :', margin + 200, y);
    drawLine(margin + 350, y, 200);
    drawText(data.animal_description_info?.animalAddress || '', margin + 355, y);
    y -= lineHeight;
    drawCheckbox(margin, y, data.animal_description_info?.animalStatus === 'Animal connu disparu');
    drawText('Animal connu disparu', margin + 15, y);
    y -= lineHeight;
    drawCheckbox(margin, y, data.animal_description_info?.animalStatus === 'Animal inconnu errant');
    drawText('Animal inconnu errant', margin + 15, y);
    y -= lineHeight;
    drawText('L\'animal a-t-il voyagé ?', margin, y);
    drawCheckbox(margin + 150, y, data.animal_description_info?.animalTravel === 'Non');
    drawText('Non', margin + 165, y);
    drawCheckbox(margin + 200, y, data.animal_description_info?.animalTravel === 'Oui');
    drawText('Oui', margin + 215, y);
    drawText('Pays :', margin + 250, y);
    drawLine(margin + 280, y, 200);
    drawText(data.animal_description_info?.travelCountry || '', margin + 285, y);
    y -= lineHeight;
    drawText('Positif laboratoire', margin, y);
    drawLine(margin + 120, y, 100);
    if (data.animal_description_info?.labResult === 'Positif') {
      drawText('Positif', margin + 125, y);
      drawText(data.animal_description_info?.labNumber || '', margin + 325, y);
      drawText(data.animal_description_info?.labDate || '', margin + 475, y);
    }
    drawText('N° de diagnostic', margin + 230, y);
    drawLine(margin + 320, y, 100);
    drawText('Date :', margin + 430, y);
    drawLine(margin + 470, y, 100);
    y -= lineHeight;
    drawText('Négatif laboratoire', margin, y);
    drawLine(margin + 120, y, 100);
    if (data.animal_description_info?.labResult === 'Négatif') {
      drawText('Négatif', margin + 125, y);
      drawText(data.animal_description_info?.labNumber || '', margin + 325, y);
      drawText(data.animal_description_info?.labDate || '', margin + 475, y);
    }
    drawText('N° de diagnostic', margin + 230, y);
    drawLine(margin + 320, y, 100);
    drawText('Date :', margin + 430, y);
    drawLine(margin + 470, y, 100);
    y -= lineHeight;
    drawText('Vaccination de l\'animal à jour ?', margin, y);
    drawCheckbox(margin + 200, y, data.animal_description_info?.animalVaccination === 'Oui');
    drawText('Oui : date', margin + 215, y);
    drawLine(margin + 270, y, 100);
    drawText(data.animal_description_info?.animalVaccinationDate || '', margin + 275, y);
    drawCheckbox(margin + 380, y, data.animal_description_info?.animalVaccination === 'Non');
    drawText('Non', margin + 395, y);
    drawCheckbox(margin + 430, y, data.animal_description_info?.animalVaccination === 'Inconnue');
    drawText('Inconnue', margin + 445, y);
    sectionHeight = sectionStartY - y + lineHeight;
    page.drawRectangle({ x: margin - 5, y: y - 5, width: 595 - 2*margin + 10, height: sectionHeight + 10, borderWidth: 1, borderColor: rgb(0,0,0) });
    y -= lineHeight * 2;

    // DOSSIER MÉDICAL section
    sectionStartY = y;
    drawText('DOSSIER MÉDICAL', margin, y, { bold: true });
    y -= lineHeight;
    drawText('Antécédents médicaux :', margin, y);
    drawCheckbox(margin + 140, y, data.medical_dossier_info?.medicalHistory === 'Non');
    drawText('Non', margin + 155, y);
    drawCheckbox(margin + 190, y, data.medical_dossier_info?.medicalHistory === 'Oui');
    drawText('Oui : précisez', margin + 205, y);
    drawLine(margin + 280, y, 250);
    drawText(data.medical_dossier_info?.medicalHistoryDetails || '', margin + 285, y);
    y -= lineHeight;
    drawText('Problème de coagulation :', margin, y);
    drawCheckbox(margin + 120, y, data.medical_dossier_info?.coagulationIssue === 'Non');
    drawText('Non', margin + 135, y);
    drawCheckbox(margin + 230, y, data.medical_dossier_info?.coagulationIssue === 'Oui');
    drawText('Oui : précisez', margin + 160, y);
    drawLine(margin + 270, y, 250);
    drawText(data.medical_dossier_info?.coagulationDetails || '', margin + 305, y);
    y -= lineHeight;
    drawText('Immunodépression :', margin, y);
    drawCheckbox(margin + 130, y, data.medical_dossier_info?.immunosuppression === 'Non');
    drawText('Non', margin + 145, y);
    drawCheckbox(margin + 180, y, data.medical_dossier_info?.immunosuppression === 'Oui');
    drawText('Oui : précisez', margin + 195, y);
    drawLine(margin + 270, y, 250);
    drawText(data.medical_dossier_info?.immunosuppressionDetails || '', margin + 275, y);
    drawText('Nature : cortic, aniti TNF, I-, chimiotherapie, VIH…', margin, y - lineHeight, { size: 8 });
    drawText('Profondeur: poso immunosupressueurs, nb CD4', margin, y - lineHeight * 2, { size: 8 });
    y -= lineHeight * 2;
    drawText('Grosses en cours :', margin, y);
    drawCheckbox(margin + 120, y, data.medical_dossier_info?.pregnancy === 'Non');
    drawText('Non', margin + 135, y);
    drawCheckbox(margin + 170, y, data.medical_dossier_info?.pregnancy === 'Oui');
    drawText('Oui : précisez', margin + 185, y);
    drawLine(margin + 260, y, 250);
    drawText(data.medical_dossier_info?.pregnancyDetails || '', margin + 265, y);
    y -= lineHeight;
    drawText('Allergies :', margin, y);
    drawCheckbox(margin + 80, y, data.medical_dossier_info?.allergies === 'Non');
    drawText('Non', margin + 95, y);
    drawCheckbox(margin + 130, y, data.medical_dossier_info?.allergies === 'Oui');
    drawText('Oui : précisez', margin + 145, y);
    drawLine(margin + 220, y, 250);
    drawText(data.medical_dossier_info?.allergiesDetails || '', margin + 225, y);
    y -= lineHeight;
    drawText('Antécédents vaccinaux :', margin, y);
    drawText('VAT', margin + 160, y);
    drawCheckbox(margin + 180, y, data.medical_dossier_info?.vatVaccination === 'Oui');
    drawText('Oui', margin + 195, y);
    drawCheckbox(margin + 220, y, data.medical_dossier_info?.vatVaccination === 'Non');
    drawText('Non', margin + 235, y);
    drawText('Antirabique', margin + 260, y);
    drawCheckbox(margin + 330, y, data.medical_dossier_info?.antirabiesVaccination === 'Oui');
    drawText('si oui Date / / N°Lot', margin + 345, y);
    drawLine(margin + 420, y, 50);
    drawText(data.medical_dossier_info?.antirabiesDate || '', margin + 425, y);
    drawLine(margin + 480, y, 100);
    drawText(data.medical_dossier_info?.antirabiesLot || '', margin + 485, y);
    y -= lineHeight;
    drawText('ÉPISODE ACTUEL : Hospitalisation', margin, y);
    drawCheckbox(margin + 200, y, data.medical_dossier_info?.hospitalization === 'Non');
    drawText('Non', margin + 215, y);
    drawCheckbox(margin + 250, y, data.medical_dossier_info?.hospitalization === 'Oui');
    drawText('Oui à', margin + 265, y);
    drawLine(margin + 290, y, 250);
    drawText(data.medical_dossier_info?.hospitalizationDetails || '', margin + 295, y);
    y -= lineHeight;
    drawText('Désinfection des plaies :', margin, y);
    drawCheckbox(margin + 150, y, data.medical_dossier_info?.woundDisinfection === 'Non');
    drawText('Non', margin + 165, y);
    drawCheckbox(margin + 200, y, data.medical_dossier_info?.woundDisinfection === 'Oui');
    drawText('Oui : délai d\'exposition', margin + 215, y);
    drawLine(margin + 340, y, 200);
    drawText(data.medical_dossier_info?.disinfectionDelay || '', margin + 345, y);
    y -= lineHeight;
    drawText('Sutures :', margin, y);
    drawCheckbox(margin + 60, y, data.medical_dossier_info?.sutures === 'Non');
    drawText('Non', margin + 75, y);
    drawCheckbox(margin + 110, y, data.medical_dossier_info?.sutures === 'Oui');
    drawText('Oui', margin + 125, y);
    y -= lineHeight;
    drawText('Antibiotique :', margin, y);
    drawCheckbox(margin + 90, y, data.medical_dossier_info?.antibiotic === 'Non');
    drawText('Non', margin + 105, y);
    drawCheckbox(margin + 140, y, data.medical_dossier_info?.antibiotic === 'Oui');
    drawText('Oui :', margin + 155, y);
    drawLine(margin + 180, y, 100);
    drawText(data.medical_dossier_info?.antibioticDetails || '', margin + 185, y);
    drawText('posologie', margin + 290, y);
    drawLine(margin + 340, y, 100);
    drawText(data.medical_dossier_info?.antibioticDosage || '', margin + 345, y);
    drawText('Durée', margin + 450, y);
    drawLine(margin + 480, y, 100);
    drawText(data.medical_dossier_info?.antibioticDuration || '', margin + 485, y);
    y -= lineHeight;
    drawText('Commentaires :', margin, y);
    drawLine(margin + 100, y, 450);
    drawText(data.medical_dossier_info?.comments || '', margin + 105, y);
    y -= lineHeight * 2;
    // Signature part
    drawText('Signature :', margin, y);
    drawLine(margin + 70, y, 200);
    drawText(data.medical_dossier_info?.signature || '', margin + 75, y);
    y -= lineHeight;
    drawText('Reporter Name :', margin, y);
    drawLine(margin + 110, y, 200);
    drawText(data.medical_dossier_info?.reporterName || '', margin + 115, y);
    y -= lineHeight;
    drawText('Reporter Position :', margin, y);
    drawLine(margin + 130, y, 200);
    drawText(data.medical_dossier_info?.reporterPosition || '', margin + 135, y);
    sectionHeight = sectionStartY - y + lineHeight * 3;
    page.drawRectangle({ x: margin - 5, y: y - 5, width: 595 - 2*margin + 10, height: sectionHeight + 10, borderWidth: 1, borderColor: rgb(0,0,0) });
    y -= lineHeight;

    // Footer
    drawText('Revue des données : Chef De Centre Vaccination', margin, margin - 10);
    drawText('1/1', 595 - margin - 20, margin - 10);

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=rabies-exposure-declaration.pdf');
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: error.message || 'Failed to generate PDF' });
  }
}

// API endpoint to generate PDF by ID
app.get('/generate-rabies-pdf/:id', async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }
  try {
    const formData = await getVaccinationExposureDataById(id);
    await generateRabiesExposurePDF(formData, res);
  } catch (error) {
    console.error('Error processing request:', error);
    if (error.message === 'Record not found') {
      return res.status(404).json({ error: 'Record not found for the provided ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to generate PDF from raw data
app.post('/generate-rabies-pdf', async (req, res) => {
  try {
    const formData = req.body;
    if (!formData || typeof formData !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' });
    }
    await generateRabiesExposurePDF(formData, res);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'PDF Service is running' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down PDF Service...');
  await pool.end();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`PDF Service running on port ${PORT}`);
});