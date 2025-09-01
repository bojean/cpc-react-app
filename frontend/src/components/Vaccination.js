import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SignatureCanvas from 'react-signature-canvas';
import { Form, Button, Container, Row, Col, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLanguage } from '@fortawesome/free-solid-svg-icons';
import { jwtDecode } from 'jwt-decode';

const Vaccination = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const sigCanvas = useRef(null);
  const [formData, setFormData] = useState({
    patientCategory: '',
    patientName: '',
    patientSex: '',
    patientAge: '',
    city: '',
    neighborhood: '',
    contactNumber: '',
    attackType: '',
    attackContext: '',
    exposureType: '',
    exposurePart: '',
    bleeding: '',
    bleedingPart: '',
    severity: '',
    clothing: '',
    animalType: '',
    animalStatus: '',
    animalAddress: '',
    animalTravel: '',
    travelCountry: '',
    labResult: '',
    labNumber: '',
    labDate: '',
    animalVaccination: '',
    animalVaccinationDate: '',
    medicalHistory: '',
    medicalHistoryDetails: '',
    coagulationIssue: '',
    coagulationDetails: '',
    immunosuppression: '',
    immunosuppressionDetails: '',
    pregnancy: '',
    pregnancyDetails: '',
    allergies: '',
    allergiesDetails: '',
    vatVaccination: '',
    antirabiesVaccination: '',
    antirabiesDate: '',
    antirabiesLot: '',
    hospitalization: '',
    hospitalizationDetails: '',
    woundDisinfection: '',
    disinfectionDelay: '',
    sutures: '',
    antibiotic: '',
    antibioticDetails: '',
    antibioticDosage: '',
    antibioticDuration: '',
    comments: '',
    signature: '',
    id: null // Stores patient_category_info_id
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        if (decoded.exp < currentTime) {
          localStorage.removeItem('token');
        } else {
          setUserRole(decoded.role);
        }
      } catch (err) {
        console.error('JWT decode error:', err);
        localStorage.removeItem('token');
      }
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSignatureEnd = () => {
    setFormData({ ...formData, signature: sigCanvas.current.toDataURL() });
  };

  const clearSignature = () => {
    sigCanvas.current.clear();
    setFormData({ ...formData, signature: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const data = {
        patient_category_info: {
          patientCategory: formData.patientCategory,
          patientName: formData.patientName,
          patientSex: formData.patientSex,
          patientAge: parseInt(formData.patientAge) || 0,
          city: formData.city,
          neighborhood: formData.neighborhood,
          contactNumber: formData.contactNumber || 'N/A'
        },
        attack_exposure_info: {
          attackType: formData.attackType,
          attackContext: formData.attackContext,
          exposureType: formData.exposureType,
          exposurePart: formData.exposurePart,
          bleeding: formData.bleeding,
          bleedingPart: formData.bleedingPart,
          severity: formData.severity,
          clothing: formData.clothing
        },
        animal_description_info: {
          animalType: formData.animalType,
          animalStatus: formData.animalStatus,
          animalAddress: formData.animalAddress,
          animalTravel: formData.animalTravel,
          travelCountry: formData.travelCountry,
          labResult: formData.labResult,
          labNumber: formData.labNumber,
          labDate: formData.labDate,
          animalVaccination: formData.animalVaccination,
          animalVaccinationDate: formData.animalVaccinationDate
        },
        medical_dossier_info: {
          medicalHistory: formData.medicalHistory,
          medicalHistoryDetails: formData.medicalHistoryDetails,
          coagulationIssue: formData.coagulationIssue,
          coagulationDetails: formData.coagulationDetails,
          immunosuppression: formData.immunosuppression,
          immunosuppressionDetails: formData.immunosuppressionDetails,
          pregnancy: formData.pregnancy,
          pregnancyDetails: formData.pregnancyDetails,
          allergies: formData.allergies,
          allergiesDetails: formData.allergiesDetails,
          vatVaccination: formData.vatVaccination,
          antirabiesVaccination: formData.antirabiesVaccination,
          antirabiesDate: formData.antirabiesDate,
          antirabiesLot: formData.antirabiesLot,
          hospitalization: formData.hospitalization,
          hospitalizationDetails: formData.hospitalizationDetails,
          woundDisinfection: formData.woundDisinfection,
          disinfectionDelay: formData.disinfectionDelay,
          sutures: formData.sutures,
          antibiotic: formData.antibiotic,
          antibioticDetails: formData.antibioticDetails,
          antibioticDosage: formData.antibioticDosage,
          antibioticDuration: formData.antibioticDuration,
          comments: formData.comments,
          signature: formData.signature,
          reporterName: formData.patientName,
          reporterPosition: userRole || 'Guest'
        }
      };

      const response = await axios.post('http://localhost:5003/vaccination-exposures', data);
      setFormData({ ...formData, id: response.data.data.patient_category_info_id });
      setSuccess(t('declaration_submitted'));
      if (userRole) {
        setTimeout(() => navigate('/agent'), 2000);
      } else {
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (err) {
      console.error('Submission error:', err);
      if (err.response) {
        if (err.response.status === 400) {
          setError(err.response.data.message || t('submission_failed'));
        } else if (err.response.status === 404) {
          setError(t('endpoint_not_found'));
        } else if (err.response.status === 429) {
          setError(t('too_many_requests'));
        } else {
          setError(t('submission_failed'));
        }
      } else {
        setError(t('submission_failed'));
      }
    }
  };

  const generatePDF = async () => {
    try {
      if (!userRole || !['admin', 'agent'].includes(userRole)) {
        setError(t('not_authorized_pdf'));
        return;
      }
      const token = localStorage.getItem('token');
      if (!token) {
        setError(t('no_token'));
        return;
      }
      if (!formData.id) {
        setError(t('no_record_selected'));
        return;
      }
      const response = await axios.get(`http://localhost:5003/vaccination-exposures/${formData.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CPC30-PR002-EN01_RAGE_${formData.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation error:', err);
      setError(t('pdf_generation_failed'));
    }
  };

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
  };

  return (
    <Container className="p-4 bg-light rounded shadow-sm">
      <Row className="mb-3">
        <Col>
          <h2>{t('rabies_exposure_declaration')}</h2>
        </Col>
        <Col className="text-end">
          <Button variant="link" onClick={() => changeLanguage('en')}>
            <FontAwesomeIcon icon={faLanguage} /> EN
          </Button>
          <Button variant="link" onClick={() => changeLanguage('fr')}>
            <FontAwesomeIcon icon={faLanguage} /> FR
          </Button>
        </Col>
      </Row>
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      <Form onSubmit={handleSubmit}>
        {/* Section 1: Patient Category Information */}
        <h3>{t('patient_category')}</h3>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Check
                type="radio"
                label={t('patient_minor')}
                name="patientCategory"
                value="Mineur"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('patient_adult')}
                name="patientCategory"
                value="Adulte"
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('patient_name')}</Form.Label>
              <Form.Control
                type="text"
                name="patientName"
                value={formData.patientName}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('patient_sex')}</Form.Label>
              <Form.Select name="patientSex" value={formData.patientSex} onChange={handleChange} required>
                <option value="">{t('select')}</option>
                <option value="Homme">{t('male')}</option>
                <option value="Femme">{t('female')}</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('patient_age')}</Form.Label>
              <Form.Control
                type="number"
                name="patientAge"
                value={formData.patientAge}
                onChange={handleChange}
                required
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>{t('city')}</Form.Label>
              <Form.Control
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('neighborhood')}</Form.Label>
              <Form.Control
                type="text"
                name="neighborhood"
                value={formData.neighborhood}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('contact_number')}</Form.Label>
              <Form.Control
                type="text"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
              />
            </Form.Group>
          </Col>
        </Row>

        {/* Section 2: Attack Description and Nature of Exposition Information */}
        <h3>{t('attack_description_and_exposure')}</h3>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Check
                type="radio"
                label={t('spontaneous_attack')}
                name="attackType"
                value="Attaque spontanée"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('reactionary_attack')}
                name="attackType"
                value="Attaque réactionnelle"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('collective_attack')}
                name="attackType"
                value="Attaque collective"
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check
                type="radio"
                label={t('lab_manipulation')}
                name="attackContext"
                value="En cours de manipulation de prélèvement au laboratoire"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('during_care')}
                name="attackContext"
                value="Pendant les soins"
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check
                type="radio"
                label={t('bite')}
                name="exposureType"
                value="Morsure"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('scratch')}
                name="exposureType"
                value="Griffure"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('lick')}
                name="exposureType"
                value="Léchage"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('other')}
                name="exposureType"
                value="Autre"
                onChange={handleChange}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>{t('exposure_part')}</Form.Label>
              <Form.Control
                type="text"
                name="exposurePart"
                value={formData.exposurePart}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('bleeding')}</Form.Label>
              <Form.Check
                type="radio"
                label={t('no')}
                name="bleeding"
                value="Non"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('yes')}
                name="bleeding"
                value="Oui"
                onChange={handleChange}
              />
              {formData.bleeding === 'Oui' && (
                <Form.Control
                  type="text"
                  name="bleedingPart"
                  value={formData.bleedingPart}
                  onChange={handleChange}
                  placeholder={t('bleeding_part')}
                />
              )}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('severity')}</Form.Label>
              <Form.Select name="severity" value={formData.severity} onChange={handleChange}>
                <option value="">{t('select')}</option>
                <option value="I">I</option>
                <option value="II">II</option>
                <option value="III">III</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('clothing')}</Form.Label>
              <Form.Check
                type="radio"
                label={t('torn_clothing')}
                name="clothing"
                value="Déchirés"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('thick_intact')}
                name="clothing"
                value="Épais intacts"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('light_intact')}
                name="clothing"
                value="Léger intact"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('bare_skin')}
                name="clothing"
                value="Peau nue"
                onChange={handleChange}
              />
            </Form.Group>
          </Col>
        </Row>

        {/* Section 3: Animal Description */}
        <h3>{t('animal_description')}</h3>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>{t('animal_type')}</Form.Label>
              <Form.Check
                type="radio"
                label={t('dog')}
                name="animalType"
                value="Chien"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('cat')}
                name="animalType"
                value="Chat"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('monkey')}
                name="animalType"
                value="Singe"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('bat')}
                name="animalType"
                value="Chauve-souris"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('other')}
                name="animalType"
                value="Autre"
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('animal_status')}</Form.Label>
              <Form.Check
                type="radio"
                label={t('known_available')}
                name="animalStatus"
                value="Animal connu et disponible"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('known_missing')}
                name="animalStatus"
                value="Animal connu disparu"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('unknown_stray')}
                name="animalStatus"
                value="Animal inconnu errant"
                onChange={handleChange}
              />
              {formData.animalStatus === 'Animal connu et disponible' && (
                <Form.Control
                  type="text"
                  name="animalAddress"
                  value={formData.animalAddress}
                  onChange={handleChange}
                  placeholder={t('animal_address')}
                />
              )}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('animal_travel')}</Form.Label>
              <Form.Check
                type="radio"
                label={t('no')}
                name="animalTravel"
                value="Non"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('yes')}
                name="animalTravel"
                value="Oui"
                onChange={handleChange}
              />
              {formData.animalTravel === 'Oui' && (
                <Form.Control
                  type="text"
                  name="travelCountry"
                  value={formData.travelCountry}
                  onChange={handleChange}
                  placeholder={t('travel_country')}
                />
              )}
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>{t('lab_result')}</Form.Label>
              <Form.Control
                type="text"
                name="labResult"
                value={formData.labResult}
                onChange={handleChange}
                placeholder={t('lab_result')}
              />
              <Form.Control
                type="text"
                name="labNumber"
                value={formData.labNumber}
                onChange={handleChange}
                placeholder={t('lab_number')}
              />
              <Form.Control
                type="date"
                name="labDate"
                value={formData.labDate}
                onChange={handleChange}
                placeholder={t('lab_date')}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('animal_vaccination')}</Form.Label>
              <Form.Check
                type="radio"
                label={t('yes')}
                name="animalVaccination"
                value="Oui"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('no')}
                name="animalVaccination"
                value="Non"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('unknown')}
                name="animalVaccination"
                value="Inconnue"
                onChange={handleChange}
              />
              {formData.animalVaccination === 'Oui' && (
                <Form.Control
                  type="date"
                  name="animalVaccinationDate"
                  value={formData.animalVaccinationDate}
                  onChange={handleChange}
                  placeholder={t('animal_vaccination_date')}
                />
              )}
            </Form.Group>
          </Col>
        </Row>

        {/* Section 4: Dossier Medical Information */}
        <h3>{t('medical_history')}</h3>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>{t('medical_history')}</Form.Label>
              <Form.Check
                type="radio"
                label={t('no')}
                name="medicalHistory"
                value="Non"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('yes')}
                name="medicalHistory"
                value="Oui"
                onChange={handleChange}
              />
              {formData.medicalHistory === 'Oui' && (
                <Form.Control
                  type="text"
                  name="medicalHistoryDetails"
                  value={formData.medicalHistoryDetails}
                  onChange={handleChange}
                  placeholder={t('medical_history_details')}
                />
              )}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('coagulation_issue')}</Form.Label>
              <Form.Check
                type="radio"
                label={t('no')}
                name="coagulationIssue"
                value="Non"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('yes')}
                name="coagulationIssue"
                value="Oui"
                onChange={handleChange}
              />
              {formData.coagulationIssue === 'Oui' && (
                <Form.Control
                  type="text"
                  name="coagulationDetails"
                  value={formData.coagulationDetails}
                  onChange={handleChange}
                  placeholder={t('coagulation_details')}
                />
              )}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('immunosuppression')}</Form.Label>
              <Form.Check
                type="radio"
                label={t('no')}
                name="immunosuppression"
                value="Non"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('yes')}
                name="immunosuppression"
                value="Oui"
                onChange={handleChange}
              />
              {formData.immunosuppression === 'Oui' && (
                <Form.Control
                  type="text"
                  name="immunosuppressionDetails"
                  value={formData.immunosuppressionDetails}
                  onChange={handleChange}
                  placeholder={t('immunosuppression_details')}
                />
              )}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('pregnancy')}</Form.Label>
              <Form.Check
                type="radio"
                label={t('no')}
                name="pregnancy"
                value="Non"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('yes')}
                name="pregnancy"
                value="Oui"
                onChange={handleChange}
              />
              {formData.pregnancy === 'Oui' && (
                <Form.Control
                  type="text"
                  name="pregnancyDetails"
                  value={formData.pregnancyDetails}
                  onChange={handleChange}
                  placeholder={t('pregnancy_details')}
                />
              )}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('allergies')}</Form.Label>
              <Form.Check
                type="radio"
                label={t('no')}
                name="allergies"
                value="Non"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('yes')}
                name="allergies"
                value="Oui"
                onChange={handleChange}
              />
              {formData.allergies === 'Oui' && (
                <Form.Control
                  type="text"
                  name="allergiesDetails"
                  value={formData.allergiesDetails}
                  onChange={handleChange}
                  placeholder={t('allergies_details')}
                />
              )}
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>{t('vaccination_history')}</Form.Label>
              <Form.Check
                type="radio"
                label={t('vat_vaccination')}
                name="vatVaccination"
                value="Oui"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('no')}
                name="vatVaccination"
                value="Non"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('antirabies_vaccination')}
                name="antirabiesVaccination"
                value="Oui"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('no')}
                name="antirabiesVaccination"
                value="Non"
                onChange={handleChange}
              />
              {formData.antirabiesVaccination === 'Oui' && (
                <>
                  <Form.Control
                    type="date"
                    name="antirabiesDate"
                    value={formData.antirabiesDate}
                    onChange={handleChange}
                    placeholder={t('antirabies_date')}
                  />
                  <Form.Control
                    type="text"
                    name="antirabiesLot"
                    value={formData.antirabiesLot}
                    onChange={handleChange}
                    placeholder={t('antirabies_lot')}
                  />
                </>
              )}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('current_episode')}</Form.Label>
              <Form.Check
                type="radio"
                label={t('no')}
                name="hospitalization"
                value="Non"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('yes')}
                name="hospitalization"
                value="Oui"
                onChange={handleChange}
              />
              {formData.hospitalization === 'Oui' && (
                <Form.Control
                  type="text"
                  name="hospitalizationDetails"
                  value={formData.hospitalizationDetails}
                  onChange={handleChange}
                  placeholder={t('hospitalization_details')}
                />
              )}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('wound_disinfection')}</Form.Label>
              <Form.Check
                type="radio"
                label={t('no')}
                name="woundDisinfection"
                value="Non"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('yes')}
                name="woundDisinfection"
                value="Oui"
                onChange={handleChange}
              />
              {formData.woundDisinfection === 'Oui' && (
                <Form.Control
                  type="text"
                  name="disinfectionDelay"
                  value={formData.disinfectionDelay}
                  onChange={handleChange}
                  placeholder={t('disinfection_delay')}
                />
              )}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('sutures')}</Form.Label>
              <Form.Check
                type="radio"
                label={t('no')}
                name="sutures"
                value="Non"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('yes')}
                name="sutures"
                value="Oui"
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('antibiotic')}</Form.Label>
              <Form.Check
                type="radio"
                label={t('no')}
                name="antibiotic"
                value="Non"
                onChange={handleChange}
              />
              <Form.Check
                type="radio"
                label={t('yes')}
                name="antibiotic"
                value="Oui"
                onChange={handleChange}
              />
              {formData.antibiotic === 'Oui' && (
                <>
                  <Form.Control
                    type="text"
                    name="antibioticDetails"
                    value={formData.antibioticDetails}
                    onChange={handleChange}
                    placeholder={t('antibiotic_details')}
                  />
                  <Form.Control
                    type="text"
                    name="antibioticDosage"
                    value={formData.antibioticDosage}
                    onChange={handleChange}
                    placeholder={t('antibiotic_dosage')}
                  />
                  <Form.Control
                    type="text"
                    name="antibioticDuration"
                    value={formData.antibioticDuration}
                    onChange={handleChange}
                    placeholder={t('antibiotic_duration')}
                  />
                </>
              )}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('comments')}</Form.Label>
              <Form.Control
                as="textarea"
                name="comments"
                value={formData.comments}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('signature')}</Form.Label>
              <SignatureCanvas
                ref={sigCanvas}
                canvasProps={{ width: 500, height: 200, className: 'signature-canvas' }}
                onEnd={handleSignatureEnd}
              />
              <Button variant="secondary" onClick={clearSignature}>
                {t('clear_signature')}
              </Button>
            </Form.Group>
          </Col>
        </Row>

        {/* Submission and PDF Generation Buttons */}
        <Row className="mt-3">
          <Col>
            <Button variant="primary" type="submit">
              {t('submit_declaration')}
            </Button>
            {(userRole === 'admin' || userRole === 'agent') && (
              <Button variant="success" onClick={generatePDF} className="ms-2">
                {t('generate_pdf')}
              </Button>
            )}
          </Col>
        </Row>
      </Form>
    </Container>
  );
};

// Error Boundary Component
class VaccinationErrorBoundary extends React.Component {
  state = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container className="p-4">
          <Alert variant="danger">
            <h4>Error in Vaccination Form</h4>
            <p>{this.state.errorMessage}</p>
            <p>Please try refreshing the page or contact support.</p>
          </Alert>
        </Container>
      );
    }
    return this.props.children;
  }
}

export default function VaccinationWithErrorBoundary() {
  return (
    <VaccinationErrorBoundary>
      <Vaccination />
    </VaccinationErrorBoundary>
  );
}