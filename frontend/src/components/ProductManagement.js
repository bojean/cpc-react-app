import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Container, Row, Col, Form, Button, Table, Alert, Modal, Card, OverlayTrigger, Tooltip } from 'react-bootstrap';
import axios from 'axios';
import Swal from 'sweetalert2';
import '../ProductManagement.css'; // Custom CSS file

const ProductManagement = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    issued_date: '',
    expired_date: '',
    unit_price: '',
    lot_number: '',
    threshold: 5,
    quantity: 0
  });
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const token = localStorage.getItem('token');
  const isMounted = useRef(true);

  const fetchProducts = useCallback(async () => {
    if (!isMounted.current) return;
    try {
      const response = await axios.get('http://localhost:5010/products', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Fetch Products Request:', { url: 'http://localhost:5010/products', token, headers: response.config.headers });
      console.log('Products Response:', response.data, { status: response.status, statusText: response.statusText });
      const productsWithNumericPrice = response.data.map(product => ({
        ...product,
        unit_price: typeof product.unit_price === 'number' ? product.unit_price : parseFloat(product.unit_price) || 0
      }));
      setProducts(productsWithNumericPrice);
      console.log('Products State Updated:', productsWithNumericPrice);
    } catch (err) {
      setError(t('fetch_failed'));
      console.error('Fetch Products Error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText
      });
      Swal.fire({
        icon: 'error',
        title: t('fetch_failed'),
        text: err.response?.data?.message || err.message || t('try_again')
      });
    }
  }, [token, t]);

  const fetchAlerts = useCallback(async () => {
    if (!isMounted.current) return;
    try {
      const response = await axios.get('http://localhost:5010/alerts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Fetch Alerts Request:', { url: 'http://localhost:5010/alerts', token, headers: response.config.headers });
      console.log('Alerts Response:', response.data, { status: response.status, statusText: response.statusText });
      setAlerts(response.data);
    } catch (err) {
      setError(t('alert_fetch_failed'));
      console.error('Fetch Alerts Error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText
      });
      Swal.fire({
        icon: 'error',
        title: t('alert_fetch_failed'),
        text: err.response?.data?.message || err.message || t('try_again')
      });
    }
  }, [token, t]);

  useEffect(() => {
    fetchProducts();
    fetchAlerts();
    return () => {
      isMounted.current = false;
    };
  }, [fetchProducts, fetchAlerts]);

  const addProduct = async () => {
    if (!isMounted.current) return;
    console.log('Adding Product Request:', { url: 'http://localhost:5010/products', data: newProduct, token });
    try {
      const response = await axios.post('http://localhost:5010/products', newProduct, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Add Product Response:', response.data, { status: response.status, statusText: response.statusText });
      setNewProduct({
        name: '',
        description: '',
        issued_date: '',
        expired_date: '',
        unit_price: '',
        lot_number: '',
        threshold: 5,
        quantity: 0
      });
      setShowAddModal(false);
      await fetchProducts();
      Swal.fire({
        icon: 'success',
        title: t('add_success'),
        showConfirmButton: false,
        timer: 1500,
        customClass: { popup: 'animated fadeIn' }
      });
    } catch (err) {
      setError(t('add_failed'));
      console.error('Add Product Error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText
      });
      Swal.fire({
        icon: 'error',
        title: t('add_failed'),
        text: err.response?.data?.message || err.message || t('try_again'),
        customClass: { popup: 'animated shake' }
      });
    }
  };

  const updateProduct = async () => {
    if (!isMounted.current || !selectedProduct) return;
    console.log('Updating Product Request:', { url: `http://localhost:5010/products/${selectedProduct.id}`, data: selectedProduct, token });
    try {
      const response = await axios.put(`http://localhost:5010/products/${selectedProduct.id}`, selectedProduct, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Update Product Response:', response.data, { status: response.status, statusText: response.statusText });
      setShowUpdateModal(false);
      setSelectedProduct(null);
      await fetchProducts();
      Swal.fire({
        icon: 'success',
        title: t('update_success'),
        showConfirmButton: false,
        timer: 1500,
        customClass: { popup: 'animated fadeIn' }
      });
    } catch (err) {
      setError(t('update_failed'));
      console.error('Update Product Error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText
      });
      Swal.fire({
        icon: 'error',
        title: t('update_failed'),
        text: err.response?.data?.message || err.message || t('try_again'),
        customClass: { popup: 'animated shake' }
      });
    }
  };

  const deleteProduct = async (id) => {
    if (!isMounted.current) return;
    console.log('Deleting Product Request:', { url: `http://localhost:5010/products/${id}`, token });
    const result = await Swal.fire({
      title: t('confirm_delete'),
      text: t('delete_confirmation'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: t('yes_delete'),
      cancelButtonText: t('cancel'),
      customClass: { popup: 'animated bounceIn' }
    });
    if (result.isConfirmed) {
      try {
        const response = await axios.delete(`http://localhost:5010/products/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Delete Product Response:', response.data, { status: response.status, statusText: response.statusText });
        await fetchProducts();
        Swal.fire({
          icon: 'success',
          title: t('delete_success'),
          showConfirmButton: false,
          timer: 1500,
          customClass: { popup: 'animated fadeIn' }
        });
      } catch (err) {
        setError(t('delete_failed'));
        console.error('Delete Product Error:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          statusText: err.response?.statusText
        });
        Swal.fire({
          icon: 'error',
          title: t('delete_failed'),
          text: err.response?.data?.message || err.message || t('try_again'),
          customClass: { popup: 'animated shake' }
        });
      }
    }
  };

  const openUpdateModal = (product) => {
    if (!isMounted.current) return;
    setSelectedProduct({ ...product });
    setShowUpdateModal(true);
  };

  const renderActionButtons = ({ product }) => {
    const currentDate = new Date().toISOString().split('T')[0];
    const isExpired = product.expired_date && new Date(product.expired_date) < new Date(currentDate);
    return (
      <>
        <OverlayTrigger placement="top" overlay={<Tooltip id={`tooltip-update-${product.id}`}>{t('update_product')}</Tooltip>}>
          <Button
            variant="warning"
            onClick={() => openUpdateModal(product)}
            className="me-2"
            disabled={isExpired}
            size="sm"
          >
            <i className="bi bi-pencil-fill"></i>
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="top" overlay={<Tooltip id={`tooltip-delete-${product.id}`}>{t('delete_product')}</Tooltip>}>
          <Button
            variant="danger"
            onClick={() => deleteProduct(product.id)}
            disabled={isExpired}
            size="sm"
          >
            <i className="bi bi-trash-fill"></i>
          </Button>
        </OverlayTrigger>
      </>
    );
  };

  return (
    <Container className="p-4">
      <h2 className="text-primary fw-bold mb-4">{t('product_management')}</h2>
      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {alerts.length > 0 && (
        <Alert variant="warning" className="mb-4">
          <h4 className="alert-heading">{t('low_stock_alerts')}</h4>
          <ul className="list-unstyled">
            {alerts.map((alert, index) => (
              <li key={index} className="mb-2">{`${alert.name}: ${alert.quantity} < ${alert.threshold}`}</li>
            ))}
          </ul>
        </Alert>
      )}
      <Row className="mb-5">
        <Col md={6}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="bg-primary text-white">
              <h3 className="mb-0">{t('add_product')}</h3>
            </Card.Header>
            <Card.Body>
              <Button
                variant="primary"
                onClick={() => setShowAddModal(true)}
                className="w-100 mb-3"
              >
                {t('add_product')}
              </Button>
              <Modal
                show={showAddModal}
                onHide={() => setShowAddModal(false)}
                centered
                className="fade"
              >
                <Modal.Header closeButton className="bg-light">
                  <Modal.Title>{t('add_product')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <Form onSubmit={(e) => { e.preventDefault(); addProduct(); }}>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>{t('product_name')}</Form.Label>
                          <Form.Control
                            type="text"
                            value={newProduct.name}
                            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                            required
                            className="form-control-lg"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>{t('threshold')}</Form.Label>
                          <Form.Control
                            type="number"
                            value={newProduct.threshold}
                            onChange={(e) => setNewProduct({ ...newProduct, threshold: parseInt(e.target.value) || 5 })}
                            required
                            className="form-control-lg"
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('description')}</Form.Label>
                      <Form.Control
                        as="textarea"
                        value={newProduct.description}
                        onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                        className="form-control-lg"
                      />
                    </Form.Group>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>{t('issued_date')}</Form.Label>
                          <Form.Control
                            type="date"
                            value={newProduct.issued_date}
                            onChange={(e) => setNewProduct({ ...newProduct, issued_date: e.target.value })}
                            className="form-control-lg"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>{t('expired_date')}</Form.Label>
                          <Form.Control
                            type="date"
                            value={newProduct.expired_date}
                            onChange={(e) => setNewProduct({ ...newProduct, expired_date: e.target.value })}
                            className="form-control-lg"
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>{t('unit_price')}</Form.Label>
                          <Form.Control
                            type="number"
                            step="0.01"
                            value={newProduct.unit_price}
                            onChange={(e) => setNewProduct({ ...newProduct, unit_price: e.target.value })}
                            className="form-control-lg"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>{t('lot_number')}</Form.Label>
                          <Form.Control
                            type="text"
                            value={newProduct.lot_number}
                            onChange={(e) => setNewProduct({ ...newProduct, lot_number: e.target.value })}
                            className="form-control-lg"
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>{t('quantity')}</Form.Label>
                          <Form.Control
                            type="number"
                            value={newProduct.quantity}
                            onChange={(e) => setNewProduct({ ...newProduct, quantity: parseInt(e.target.value) || 0 })}
                            className="form-control-lg"
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <div className="d-flex justify-content-end">
                      <Button variant="primary" type="submit" className="me-2">
                        {t('save')}
                      </Button>
                      <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                        {t('cancel')}
                      </Button>
                    </div>
                  </Form>
                </Modal.Body>
              </Modal>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="bg-primary text-white">
              <h3 className="mb-0">{t('product_list')}</h3>
            </Card.Header>
            <Card.Body>
              <Table striped bordered hover responsive className="product-table">
                <thead>
                  <tr>
                    <th>{t('id')}</th>
                    <th>{t('name')}</th>
                    <th>{t('description')}</th>
                    <th>{t('issued_date')}</th>
                    <th>{t('expired_date')}</th>
                    <th>{t('unit_price')}</th>
                    <th>{t('lot_number')}</th>
                    <th>{t('threshold')}</th>
                    <th>{t('quantity')}</th>
                    <th>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const currentDate = new Date().toISOString().split('T')[0];
                    const isExpired = product.expired_date && new Date(product.expired_date) < new Date(currentDate);
                    const displayUnitPrice = typeof product.unit_price === 'number' ? `$${product.unit_price.toFixed(2)}` : (parseFloat(product.unit_price) || 0) > 0 ? `$${parseFloat(product.unit_price).toFixed(2)}` : 'N/A';
                    return (
                      <tr key={product.id} className={isExpired ? 'table-danger' : ''}>
                        <td>{product.id}</td>
                        <td>{product.name}</td>
                        <td>{product.description}</td>
                        <td>{product.issued_date || 'N/A'}</td>
                        <td>{product.expired_date || 'N/A'}</td>
                        <td>{displayUnitPrice}</td>
                        <td>{product.lot_number || 'N/A'}</td>
                        <td>{product.threshold}</td>
                        <td>{product.quantity || 0}</td>
                        <td>{renderActionButtons({ product, openUpdateModal, deleteProduct })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Modal
        show={showUpdateModal}
        onHide={() => { setShowUpdateModal(false); setSelectedProduct(null); }}
        centered
        className="fade"
      >
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>{t('update_product')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={(e) => { e.preventDefault(); updateProduct(); }}>
            <Form.Group className="mb-3">
              <Form.Label>{t('id')}</Form.Label>
              <Form.Control
                type="text"
                value={selectedProduct?.id || ''}
                readOnly
                className="form-control-lg"
              />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('product_name')}</Form.Label>
                  <Form.Control
                    type="text"
                    value={selectedProduct?.name || ''}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, name: e.target.value })}
                    required
                    className="form-control-lg"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('threshold')}</Form.Label>
                  <Form.Control
                    type="number"
                    value={selectedProduct?.threshold || 5}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, threshold: parseInt(e.target.value) || 5 })}
                    required
                    className="form-control-lg"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>{t('description')}</Form.Label>
              <Form.Control
                as="textarea"
                value={selectedProduct?.description || ''}
                onChange={(e) => setSelectedProduct({ ...selectedProduct, description: e.target.value })}
                className="form-control-lg"
              />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('issued_date')}</Form.Label>
                  <Form.Control
                    type="date"
                    value={selectedProduct?.issued_date || ''}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, issued_date: e.target.value })}
                    className="form-control-lg"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('expired_date')}</Form.Label>
                  <Form.Control
                    type="date"
                    value={selectedProduct?.expired_date || ''}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, expired_date: e.target.value })}
                    className="form-control-lg"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('unit_price')}</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={selectedProduct?.unit_price || ''}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, unit_price: e.target.value })}
                    className="form-control-lg"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('lot_number')}</Form.Label>
                  <Form.Control
                    type="text"
                    value={selectedProduct?.lot_number || ''}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, lot_number: e.target.value })}
                    className="form-control-lg"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>{t('created_at')}</Form.Label>
              <Form.Control
                type="text"
                value={selectedProduct?.created_at ? new Date(selectedProduct.created_at).toISOString().split('T')[0] : ''}
                readOnly
                className="form-control-lg"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('updated_at')}</Form.Label>
              <Form.Control
                type="text"
                value={selectedProduct?.updated_at ? new Date(selectedProduct.updated_at).toISOString().split('T')[0] : ''}
                readOnly
                className="form-control-lg"
              />
            </Form.Group>
            <div className="d-flex justify-content-end">
              <Button variant="primary" type="submit" className="me-2">
                {t('save')}
              </Button>
              <Button variant="secondary" onClick={() => { setShowUpdateModal(false); setSelectedProduct(null); }}>
                {t('cancel')}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default ProductManagement;