import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Form, Button, Container, Row, Col, Alert } from 'react-bootstrap';

const Client = () => {
  const { t } = useTranslation();
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchVisibleServices = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/visible-services');
        if (res.data.length === 0) {
          setError(t('noServicesAvailable'));
        } else {
          setServices(res.data);
          setError('');
        }
      } catch (err) {
        console.error('Fetch services error:', err.response?.data || err.message);
        setError(t('fetchServicesFailed') + ': ' + (err.response?.data?.message || err.message));
      }
    };
    fetchVisibleServices();
  }, [t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedService) {
      setError(t('chooseService'));
      return;
    }
    if (!/^[a-zA-Z0-9]{6,12}$/.test(orderNumber)) {
      setError(t('pleaseEnterFolderNumber'));
      return;
    }
    setError('');
    try {
      const res = await axios.post('http://localhost:5000/api/client/order', {
        serviceId: selectedService,
        orderNumber
      });
      setSuccess(`${t('orderSubmitted')} Code: ${res.data.code}`);
      setOrderNumber('');
      setSelectedService('');
    } catch (err) {
      setError(err.response?.data?.message || t('submissionFailed'));
    }
  };

  return (
    <Container className="mt-5">
      <h1>{t('clientAccess')}</h1>
      <Row className="justify-content-md-center">
        <Col md={6}>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>{t('chooseService')}</Form.Label>
              <Form.Select value={selectedService} onChange={(e) => setSelectedService(e.target.value)}>
                <option value="">{t('chooseService')}</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} ({service.code})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('orderNumber')}</Form.Label>
              <Form.Control
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder={t('enterFolderNumber')}
              />
            </Form.Group>
            <Button variant="primary" type="submit">
              {t('submit')}
            </Button>
          </Form>
          {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
          {success && <Alert variant="success" className="mt-3">{success}</Alert>}
        </Col>
      </Row>
    </Container>
  );
};

export default Client;