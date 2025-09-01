import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SignatureCanvas from 'react-signature-canvas';
import { Form, Button, Container, Row, Col, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLanguage } from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';

const ConsentFormService = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const sigCanvas = useRef(null);
  const [formData, setFormData] = useState({
    patientTitle: '', // For "Mlle/Mme/M"
    patientName: '',
    allergiesToMedications: '',
    date: new Date().toISOString().split('T')[0], // Auto-filled with 2025-08-21
    signature: ''
  });
  const [error, setError] = useState(null);

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

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const response = await axios.post('http://localhost:5005/save-consent-form', {
        patientTitle: formData.patientTitle,
        patientName: formData.patientName,
        allergiesToMedications: formData.allergiesToMedications,
        date: formData.date,
        signature: formData.signature
      });
      Swal.fire({
        icon: 'success',
        title: t('consent_saved'),
        showConfirmButton: false,
        timer: 1500
      });
    } catch (err) {
      console.error('Save error:', err);
      if (err.response) {
        setError(err.response.data.message || t('save_failed'));
      } else {
        setError(t('save_failed'));
      }
    }
  };

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
  };

  return (
    <Container className="p-4 bg-light rounded shadow-sm">
      <Row className="mb-3">
        <Col>
          <h2>{t('consent_form_service')}</h2>
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
      <Form onSubmit={handleSave}>
        <div className="form-content">
          <p>
            {t('i_the_undersigned')} <strong>Mlle/Mme/M</strong>{' '}
            <Form.Control
              type="text"
              name="patientTitle"
              value={formData.patientTitle}
              onChange={handleChange}
              placeholder="..."
              style={{ display: 'inline', width: '100px' }}
            />{' '}
            <Form.Control
              type="text"
              name="patientName"
              value={formData.patientName}
              onChange={handleChange}
              placeholder="..."
              style={{ display: 'inline', width: '300px' }}
            />
            {'\n'}
            {t('certifies_no_contraindications')}
          </p>
          <ul>
            <li>{t('fever_defer_vaccination')}</li>
            <li>{t('previous_allergic_reaction')}</li>
            <li>{t('egg_chicken_allergy')}</li>
            <li>
              {t('medication_allergy')}{' '}
              <Form.Control
                type="text"
                name="allergiesToMedications"
                value={formData.allergiesToMedications}
                onChange={handleChange}
                placeholder="..."
                style={{ display: 'inline', width: '300px' }}
              />
            </li>
            <li>{t('hiv_infection')}</li>
            <li>{t('general_degradation')}</li>
            <li>{t('pregnancy')}</li>
            <li>{t('abnormal_sensitivity')}</li>
            <li>{t('corticosteroid_treatment_defer')}</li>
          </ul>
          <p><strong>{t('date')}:</strong> {formData.date} (Auto-filled)</p>
          <Form.Group className="mb-3">
            <Form.Label>{t('signature')}:</Form.Label>
            <SignatureCanvas
              ref={sigCanvas}
              canvasProps={{ width: 500, height: 200, className: 'signature-canvas' }}
              onEnd={handleSignatureEnd}
            />
            <Button variant="secondary" onClick={clearSignature} className="mt-2">
              {t('clear_signature')}
            </Button>
          </Form.Group>
        </div>
        <Row className="mt-3">
          <Col>
            <Button variant="primary" type="submit">
              {t('save')}
            </Button>
          </Col>
        </Row>
      </Form>
    </Container>
  );
};

// Error Boundary Component
class ConsentFormServiceErrorBoundary extends React.Component {
  state = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container className="p-4">
          <Alert variant="danger">
            <h4>Error in Consent Form Service</h4>
            <p>{this.state.errorMessage}</p>
            <p>Please try refreshing the page or contact support.</p>
          </Alert>
        </Container>
      );
    }
    return this.props.children;
  }
}

export default function ConsentFormServiceWithErrorBoundary() {
  return (
    <ConsentFormServiceErrorBoundary>
      <ConsentFormService />
    </ConsentFormServiceErrorBoundary>
  );
}