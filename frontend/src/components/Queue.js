import React, { useState, useEffect } from 'react';
import axiosInstance from '../axiosInstance';
import { useTranslation } from 'react-i18next';
import { Container, Table, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const Queue = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [queues, setQueues] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchQueues();
  }, []);

  const fetchQueues = async () => {
    try {
      const res = await axiosInstance.get('/queues');
      setQueues(res.data);
      setError('');
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.response?.data?.message || t('fetch_queues_failed'));
      }
    }
  };

  return (
    <Container className="main-content mt-4">
      <h1>{t('queue')}</h1>
      {error && <Alert variant="danger">{error}</Alert>}
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>{t('code')}</th>
            <th>{t('service')}</th>
            <th>{t('status')}</th>
          </tr>
        </thead>
        <tbody>
          {queues.map((order) => (
            <tr key={order.id}>
              <td>{order.code}</td>
              <td>{order.service_name}</td>
              <td>{order.status}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
};

export default Queue;