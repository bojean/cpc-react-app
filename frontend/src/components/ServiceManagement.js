import React, { useState, useEffect } from 'react';
import axiosInstance from '../axiosInstance';
import { useTranslation } from 'react-i18next';
import { Table, Button, Modal, Form, Container, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const ServiceManagement = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', description: '', status: true, type: 'normal' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await axiosInstance.get('/services');
      setServices(res.data);
      setError('');
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.response?.data?.message || t('fetch_services_failed'));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        code: form.code,
        description: form.description,
        status: form.status,
        type: form.type
      };
      if (editing) {
        await axiosInstance.put(`/services/${form.id}`, payload);
      } else {
        await axiosInstance.post('/services', payload);
      }
      setShowModal(false);
      fetchServices();
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.response?.data?.message || t('service_operation_failed'));
      }
    }
  };

  const editService = (service) => {
    setForm(service);
    setEditing(true);
    setShowModal(true);
  };

  const handleDelete = async () => {
    try {
      await axiosInstance.delete(`/services/${deleteId}`);
      fetchServices();
      setConfirmDelete(false);
      setDeleteId(null);
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.response?.data?.message || t('delete_service_failed'));
      }
    }
  };

  return (
    <Container className="main-content mt-4">
      <h1>{t('services')}</h1>
      {error && <Alert variant="danger">{error}</Alert>}
      <Button variant="primary" onClick={() => { setForm({ name: '', code: '', description: '', status: true, type: 'normal' }); setEditing(false); setShowModal(true); }}>
        {t('add_service')}
      </Button>
      <Table striped bordered hover className="mt-4">
        <thead>
          <tr>
            <th>{t('name')}</th>
            <th>{t('code')}</th>
            <th>{t('description')}</th>
            <th>{t('status')}</th>
            <th>{t('type')}</th>
            <th>{t('actions')}</th>
          </tr>
        </thead>
        <tbody>
          {services.map((service) => (
            <tr key={service.id}>
              <td>{service.name}</td>
              <td>{service.code}</td>
              <td>{service.description}</td>
              <td>{service.status ? t('active') : t('inactive')}</td>
              <td>{service.type}</td>
              <td>
                <Button variant="warning" size="sm" onClick={() => editService(service)}>{t('edit')}</Button>
                <Button variant="danger" size="sm" onClick={() => { setDeleteId(service.id); setConfirmDelete(true); }}>{t('delete')}</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editing ? t('edit_service') : t('add_service')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>{t('name')}</Form.Label>
              <Form.Control value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('code')}</Form.Label>
              <Form.Control value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder={t('auto_if_blank')} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('description')}</Form.Label>
              <Form.Control value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check type="switch" label={t('status')} checked={form.status} onChange={(e) => setForm({ ...form, status: e.target.checked })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('type')}</Form.Label>
              <Form.Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="normal">{t('normal')}</option>
                <option value="caisse">{t('caisse')}</option>
                <option value="box">{t('box')}</option>
              </Form.Select>
            </Form.Group>
            <Button variant="primary" type="submit">
              {editing ? t('update') : t('add')}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal show={confirmDelete} onHide={() => setConfirmDelete(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{t('confirm_delete')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{t('confirm_delete_service')}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            {t('cancel')}
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            {t('delete')}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ServiceManagement;