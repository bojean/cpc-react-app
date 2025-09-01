import React, { useState, useEffect } from 'react';
import axiosInstance from '../axiosInstance';
import { useTranslation } from 'react-i18next';
import { Table, Button, Modal, Form, Container, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const UserManagement = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', role: 'agent' });
  const [error, setError] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axiosInstance.get('/users');
      setUsers(res.data);
      setError('');
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.response?.data?.message || t('fetch_users_failed'));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await axiosInstance.put(`/users/${form.id}`, form);
      } else {
        await axiosInstance.post('/users', form);
      }
      setShowModal(false);
      setForm({ email: '', password: '', role: 'agent' });
      fetchUsers();
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.response?.data?.message || t('user_operation_failed'));
      }
    }
  };

  const editUser = (user) => {
    setForm({
      id: user.id,
      email: user.email || '',
      password: user.password || '',
      role: user.role || 'agent'
    });
    setEditing(true);
    setShowModal(true);
  };

  const deleteUser = async (id) => {
    if (!window.confirm(t('confirm_delete_user'))) return;
    try {
      await axiosInstance.delete(`/users/${id}`);
      fetchUsers();
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.response?.data?.message || t('delete_user_failed'));
      }
    }
  };

  return (
    <Container className="main-content mt-4">
      <h1>{t('users')}</h1>
      {error && <Alert variant="danger">{error}</Alert>}
      <Button variant="primary" onClick={() => { setForm({ email: '', password: '', role: 'agent' }); setEditing(false); setShowModal(true); }}>
        {t('add_user')}
      </Button>
      <Table striped bordered hover className="mt-4">
        <thead>
          <tr>
            <th>{t('email')}</th>
            <th>{t('role')}</th>
            <th>{t('actions')}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>
                <Button variant="warning" size="sm" onClick={() => editUser(user)}>{t('edit')}</Button>
                <Button variant="danger" size="sm" onClick={() => deleteUser(user.id)}>{t('delete')}</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editing ? t('edit_user') : t('add_user')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>{t('email')}</Form.Label>
              <Form.Control type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('password')}</Form.Label>
              <Form.Control type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('role')}</Form.Label>
              <Form.Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="admin">Admin</option>
                <option value="agent">Agent</option>
              </Form.Select>
            </Form.Group>
            <Button variant="primary" type="submit">
              {editing ? t('update') : t('add')}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default UserManagement;