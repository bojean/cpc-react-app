import React, { useState, useEffect, useCallback, useRef } from 'react'; // Added useRef to import
import { useTranslation } from 'react-i18next';
import { Container, Row, Col, Form, Button, Table, Alert, Card } from 'react-bootstrap';
import axios from 'axios';
import Swal from 'sweetalert2';
import '../AgentCommands.css'; // Custom CSS file

const AgentCommands = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [commands, setCommands] = useState([]);
  const [newCommand, setNewCommand] = useState({ product_id: '', quantity: 1 });
  const [usage, setUsage] = useState({ product_id: '', quantity_used: 1, command_id: '' });
  const [error, setError] = useState(null);
  const token = localStorage.getItem('token');
  const isMounted = useRef(true); // useRef is now properly imported

  // Memoized fetch functions
  const fetchProducts = useCallback(async () => {
    if (!isMounted.current) return;
    try {
      const response = await axios.get('http://localhost:5009/products', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Products response for commands:', response.data); // Debug
      setProducts(response.data);
    } catch (err) {
      setError(t('fetch_failed'));
      console.error('Fetch products error:', err.response?.data || err.message);
    }
  }, [token]);

  const fetchCommands = useCallback(async () => {
    if (!isMounted.current) return;
    try {
      const response = await axios.get('http://localhost:5009/commands', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Commands response:', response.data); // Debug
      setCommands(response.data);
    } catch (err) {
      setError(t('fetch_failed'));
      console.error('Fetch commands error:', err.response?.data || err.message);
    }
  }, [token]);

  useEffect(() => {
    fetchProducts();
    fetchCommands();
    return () => {
      isMounted.current = false;
    };
  }, [fetchProducts, fetchCommands]);

  const createCommand = async (e) => {
    e.preventDefault();
    if (!isMounted.current) return;
    try {
      await axios.post('http://localhost:5009/commands', newCommand, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewCommand({ product_id: '', quantity: 1 });
      fetchCommands();
      Swal.fire({
        icon: 'success',
        title: t('command_created'),
        showConfirmButton: false,
        timer: 1500
      });
    } catch (err) {
      setError(t('command_failed'));
      Swal.fire({
        icon: 'error',
        title: t('command_failed'),
        text: err.response?.data?.message || t('try_again')
      });
    }
  };

  const receiveCommand = async (id) => {
    if (!isMounted.current) return;
    try {
      await axios.put(`http://localhost:5009/commands/${id}/receive`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCommands();
      Swal.fire({
        icon: 'success',
        title: t('command_received'),
        showConfirmButton: false,
        timer: 1500
      });
    } catch (err) {
      setError(t('receive_failed'));
      Swal.fire({
        icon: 'error',
        title: t('receive_failed'),
        text: err.response?.data?.message || t('try_again')
      });
    }
  };

  const logUsage = async (e) => {
    e.preventDefault();
    if (!isMounted.current) return;
    try {
      await axios.post('http://localhost:5009/usage', usage, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsage({ product_id: '', quantity_used: 1, command_id: '' });
      fetchCommands();
      Swal.fire({
        icon: 'success',
        title: t('usage_logged'),
        showConfirmButton: false,
        timer: 1500
      });
    } catch (err) {
      setError(t('usage_failed'));
      Swal.fire({
        icon: 'error',
        title: t('usage_failed'),
        text: err.response?.data?.message || t('try_again')
      });
    }
  };

  return (
    <Container className="p-4">
      <h2 className="text-primary fw-bold mb-4">{t('agent_commands')}</h2>
      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      <Row className="mb-5">
        <Col md={6}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="bg-primary text-white">
              <h3 className="mb-0">{t('create_command')}</h3>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={createCommand}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('product')}</Form.Label>
                      <Form.Select
                        value={newCommand.product_id}
                        onChange={(e) => setNewCommand({ ...newCommand, product_id: e.target.value })}
                        required
                        className="form-control-lg"
                      >
                        <option value="">{t('select_product')}</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>{product.name}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('quantity')}</Form.Label>
                      <Form.Control
                        type="number"
                        value={newCommand.quantity}
                        onChange={(e) => setNewCommand({ ...newCommand, quantity: parseInt(e.target.value) || 1 })}
                        min="1"
                        required
                        className="form-control-lg"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Button variant="primary" type="submit" className="w-100">
                  {t('create')}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="bg-primary text-white">
              <h3 className="mb-0">{t('usage_tracking')}</h3>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={logUsage}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('product')}</Form.Label>
                      <Form.Select
                        value={usage.product_id}
                        onChange={(e) => setUsage({ ...usage, product_id: e.target.value })}
                        required
                        className="form-control-lg"
                      >
                        <option value="">{t('select_product')}</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>{product.name}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('quantity_used')}</Form.Label>
                      <Form.Control
                        type="number"
                        value={usage.quantity_used}
                        onChange={(e) => setUsage({ ...usage, quantity_used: parseInt(e.target.value) || 1 })}
                        min="1"
                        required
                        className="form-control-lg"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mb-3">
                  <Form.Label>{t('command_id')}</Form.Label>
                  <Form.Control
                    type="text"
                    value={usage.command_id}
                    onChange={(e) => setUsage({ ...usage, command_id: e.target.value })}
                    className="form-control-lg"
                  />
                </Form.Group>
                <Button variant="primary" type="submit" className="w-100">
                  {t('log_usage')}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Card className="shadow-sm border-0 mt-5">
        <Card.Header className="bg-primary text-white">
          <h3 className="mb-0">{t('command_list')}</h3>
        </Card.Header>
        <Card.Body>
          <Table striped bordered hover responsive className="command-table">
            <thead>
              <tr>
                <th>{t('id')}</th>
                <th>{t('product')}</th>
                <th>{t('quantity')}</th>
                <th>{t('status')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {commands.map((command) => {
                const product = products.find(p => p.id === command.product_id);
                return (
                  <tr key={command.id}>
                    <td>{command.id}</td>
                    <td>{product ? product.name : 'Unknown'}</td>
                    <td>{command.quantity}</td>
                    <td>{command.status}</td>
                    {command.status === 'confirmed' && (
                      <td>
                        <Button
                          variant="success"
                          onClick={() => receiveCommand(command.id)}
                          size="sm"
                          className="me-2"
                        >
                          {t('receive')}
                        </Button>
                      </td>
                    )}
                    {command.status === 'received' && <td>{t('received')}</td>}
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default AgentCommands;