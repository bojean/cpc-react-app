import React, { useState, useEffect } from 'react';
import axiosInstance from '../axiosInstance';
import { useTranslation } from 'react-i18next';
import { Container, Form, Button, Card, Table, Alert, Modal } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faEdit } from '@fortawesome/free-solid-svg-icons';
import { jwtDecode } from 'jwt-decode';

const Settings = () => {
  const { t } = useTranslation();
  const [englishMessage, setEnglishMessage] = useState('');
  const [frenchMessage, setFrenchMessage] = useState('');
  const [agents, setAgents] = useState([]);
  const [caisses, setCaisses] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [services, setServices] = useState([]);
  const [agentAssignments, setAgentAssignments] = useState([]);
  const [stationServiceAssignments, setStationServiceAssignments] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedStation, setSelectedStation] = useState('');
  const [selectedCaisse, setSelectedCaisse] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [days, setDays] = useState([]);
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('12:00');
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteInfo, setDeleteInfo] = useState({ type: '', id: '' });
  const [editType, setEditType] = useState('');
  const [editAgentAssignment, setEditAgentAssignment] = useState(null);
  const [editCaisseServiceAssignment, setEditCaisseServiceAssignment] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const dayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    fetchMessages();
    fetchAgents();
    fetchCaisses();
    fetchBoxes();
    fetchServices();
    fetchAssignments();
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await axiosInstance.get('/messages');
      setEnglishMessage(res.data.english_message);
      setFrenchMessage(res.data.french_message);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('fetch_messages_failed'));
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await axiosInstance.get('/users?role=agent');
      setAgents(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('fetch_users_failed'));
    }
  };

  const fetchCaisses = async () => {
    try {
      const res = await axiosInstance.get('/caisses');
      setCaisses(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('fetch_data_failed'));
    }
  };

  const fetchBoxes = async () => {
    try {
      const res = await axiosInstance.get('/boxes');
      setBoxes(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('fetch_data_failed'));
    }
  };

  const fetchServices = async () => {
    try {
      const res = await axiosInstance.get('/services');
      setServices(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('fetch_services_failed'));
    }
  };

  const fetchAssignments = async () => {
    try {
      const res = await axiosInstance.get('/assignments');
      setAgentAssignments(res.data.agentAssignments);
      setStationServiceAssignments(res.data.stationServiceAssignments);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('fetch_data_failed'));
    }
  };

  const handleMessageSubmit = async () => {
    try {
      await axiosInstance.put('/messages', { englishMessage, frenchMessage });
      setError('');
      alert(t('messages_updated'));
    } catch (err) {
      setError(err.response?.data?.message || t('messages_update_failed'));
    }
  };

  const handleAgentAssignment = async () => {
    if (!selectedAgent || !selectedStation || !days.length || !startTime || !endTime) {
      setError(t('fill_all_fields'));
      return;
    }
    try {
      await axiosInstance.post('/assignments', {
        type: 'agent_station',
        agentId: selectedAgent,
        stationId: selectedStation,
        startDay: days[0],
        endDay: days[days.length - 1],
        startTime,
        endTime
      });
      setSelectedAgent('');
      setSelectedStation('');
      setDays([]);
      setStartTime('07:00');
      setEndTime('12:00');
      setError('');
      setShowAgentModal(false);
      fetchAssignments();
    } catch (err) {
      setError(err.response?.data?.message || t('assignment_failed'));
    }
  };

  const handleEditAgentAssignment = async () => {
    if (!editAgentAssignment.agent_id || !editAgentAssignment.station_id || !editAgentAssignment.start_day || !editAgentAssignment.end_day || !editAgentAssignment.start_time || !editAgentAssignment.end_time) {
      setError(t('fill_all_fields'));
      return;
    }
    try {
      await axiosInstance.put(`/assignments/agent_station/${editAgentAssignment.id}`, {
        type: 'agent_station',
        agentId: editAgentAssignment.agent_id,
        stationId: editAgentAssignment.station_id,
        startDay: editAgentAssignment.start_day,
        endDay: editAgentAssignment.end_day,
        startTime: editAgentAssignment.start_time,
        endTime: editAgentAssignment.end_time
      });
      setEditAgentAssignment(null);
      setShowEditModal(false);
      setError('');
      fetchAssignments();
    } catch (err) {
      setError(err.response?.data?.message || t('assignment_update_failed'));
    }
  };

  const handleCaisseServiceAssignment = async () => {
    if (!selectedCaisse || !selectedService) {
      setError(t('fill_all_fields'));
      return;
    }
    try {
      await axiosInstance.post('/assignments', {
        type: 'caisse_service',
        stationId: selectedCaisse,
        serviceId: selectedService
      });
      setSelectedCaisse('');
      setSelectedService('');
      setError('');
      fetchAssignments();
    } catch (err) {
      setError(err.response?.data?.message || t('assignment_failed'));
    }
  };

  const handleEditCaisseServiceAssignment = async () => {
    if (!editCaisseServiceAssignment.station_id || !editCaisseServiceAssignment.service_id) {
      setError(t('fill_all_fields'));
      return;
    }
    try {
      await axiosInstance.put(`/assignments/caisse_service/${editCaisseServiceAssignment.id}`, {
        type: 'caisse_service',
        stationId: editCaisseServiceAssignment.station_id,
        serviceId: editCaisseServiceAssignment.service_id
      });
      setEditCaisseServiceAssignment(null);
      setShowEditModal(false);
      setError('');
      fetchAssignments();
    } catch (err) {
      setError(err.response?.data?.message || t('assignment_update_failed'));
    }
  };

  const handleDeleteAssignment = async () => {
    try {
      await axiosInstance.delete(`/assignments/${deleteInfo.type}/${deleteInfo.id}`);
      setShowDeleteModal(false);
      setDeleteInfo({ type: '', id: '' });
      setError('');
      fetchAssignments();
    } catch (err) {
      setError(err.response?.data?.message || t('delete_assignment_failed'));
    }
  };

  const confirmDelete = (type, id) => {
    setDeleteInfo({ type, id });
    setShowDeleteModal(true);
  };

  const openEditModal = (type, assignment) => {
    if (type === 'agent_station') {
      setEditAgentAssignment(assignment);
      setEditCaisseServiceAssignment(null);
    } else if (type === 'caisse_service') {
      setEditCaisseServiceAssignment(assignment);
      setEditAgentAssignment(null);
    }
    setEditType(type);
    setShowEditModal(true);
  };

  const handlePasswordUpdate = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t('fill_all_fields'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('passwords_do_not_match'));
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const decoded = jwtDecode(token);
      await axiosInstance.put(`/users/${decoded.id}/password`, { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      alert(t('password_updated'));
    } catch (err) {
      setError(err.response?.data?.message || t('password_update_failed'));
    }
  };

  return (
    <Container className="mt-4 bg-light rounded shadow-sm p-4">
      <h1>{t('settings')}</h1>
      {error && <Alert variant="danger">{error}</Alert>}
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <h3>{t('update_password')}</h3>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>{t('current_password')}</Form.Label>
              <Form.Control
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('new_password')}</Form.Label>
              <Form.Control
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('confirm_password')}</Form.Label>
              <Form.Control
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Form.Group>
            <Button variant="primary" onClick={handlePasswordUpdate}>
              {t('update_password')}
            </Button>
          </Form>
        </Card.Body>
      </Card>
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <h3>{t('update_messages')}</h3>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>{t('english_message')}</Form.Label>
              <Form.Control
                type="text"
                value={englishMessage}
                onChange={(e) => setEnglishMessage(e.target.value)}
                placeholder="{code} is waiting at {station} for {service}"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('french_message')}</Form.Label>
              <Form.Control
                type="text"
                value={frenchMessage}
                onChange={(e) => setFrenchMessage(e.target.value)}
                placeholder="{code} attend à {station} pour {service}"
              />
            </Form.Group>
            <Button variant="primary" onClick={handleMessageSubmit}>
              {t('save')}
            </Button>
          </Form>
        </Card.Body>
      </Card>
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <h3>{t('assign_agents_to_stations')}</h3>
          <Button variant="primary" onClick={ () => setShowAgentModal(true) }>
            {t('add_assignment')}
          </Button>
          <Modal show={showAgentModal} onHide={() => setShowAgentModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>{t('assign_agent_to_station')}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>{t('agent')}</Form.Label>
                  <Form.Select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}>
                    <option value="">{t('select_agent')}</option>
                    {agents.map(agent => (
                      <option key={agent.id} value={agent.id}>{agent.email}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>{t('station')}</Form.Label>
                  <Form.Select value={selectedStation} onChange={(e) => setSelectedStation(e.target.value)}>
                    <option value="">{t('select_station')}</option>
                    {[...caisses, ...boxes].map(station => (
                      <option key={station.id} value={station.id}>{station.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>{t('days')}</Form.Label>
                  <Form.Select multiple value={days} onChange={(e) => setDays([...e.target.selectedOptions].map(o => o.value))}>
                    {dayOptions.map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>{t('start_time')}</Form.Label>
                  <Form.Control
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>{t('end_time')}</Form.Label>
                  <Form.Control
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </Form.Group>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowAgentModal(false)}>
                {t('cancel')}
              </Button>
              <Button variant="primary" onClick={handleAgentAssignment}>
                {t('assign')}
              </Button>
            </Modal.Footer>
          </Modal>
        </Card.Body>
      </Card>
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <h3>{t('agent_assignments')}</h3>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>{t('agent')}</th>
                <th>{t('station')}</th>
                <th>{t('start_day')}</th>
                <th>{t('end_day')}</th>
                <th>{t('start_time')}</th>
                <th>{t('end_time')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {agentAssignments.map(assignment => (
                <tr key={assignment.id}>
                  <td>{agents.find(a => a.id === assignment.agent_id)?.email}</td>
                  <td>{[...caisses, ...boxes].find(s => s.id === assignment.station_id)?.name}</td>
                  <td>{assignment.start_day}</td>
                  <td>{assignment.end_day}</td>
                  <td>{assignment.start_time}</td>
                  <td>{assignment.end_time}</td>
                  <td>
                    <Button
                      variant="primary"
                      size="sm"
                      className="me-2"
                      onClick={() => openEditModal('agent_station', assignment)}
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => confirmDelete('agent_station', assignment.id)}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <h3>{t('assign_services_to_caisses')}</h3>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>{t('caisse')}</Form.Label>
              <Form.Select value={selectedCaisse} onChange={(e) => setSelectedCaisse(e.target.value)}>
                <option value="">{t('select_caisse')}</option>
                {caisses.map(caisse => (
                  <option key={caisse.id} value={caisse.id}>{caisse.name}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{t('service')}</Form.Label>
              <Form.Select value={selectedService} onChange={(e) => setSelectedService(e.target.value)}>
                <option value="">{t('select_service')}</option>
                {services.filter(s => s.type === 'normal').map(service => (
                  <option key={service.id} value={service.id}>{service.name}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Button variant="primary" onClick={handleCaisseServiceAssignment}>
              {t('assign')}
            </Button>
          </Form>
        </Card.Body>
      </Card>
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <h3>{t('caisse_service_assignments')}</h3>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>{t('caisse')}</th>
                <th>{t('service')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {stationServiceAssignments.map(assignment => (
                <tr key={assignment.id}>
                  <td>{caisses.find(c => c.id === assignment.station_id)?.name}</td>
                  <td>{services.find(s => s.id === assignment.service_id)?.name}</td>
                  <td>
                    <Button
                      variant="primary"
                      size="sm"
                      className="me-2"
                      onClick={() => openEditModal('caisse_service', assignment)}
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => confirmDelete('caisse_service', assignment.id)}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{t('confirm_delete')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{t('confirm_delete_message')}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            {t('cancel')}
          </Button>
          <Button variant="danger" onClick={handleDeleteAssignment}>
            {t('delete')}
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{t(editType === 'agent_station' ? 'edit_agent_assignment' : 'edit_caisse_service_assignment')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editType === 'agent_station' && editAgentAssignment && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>{t('agent')}</Form.Label>
                <Form.Select
                  value={editAgentAssignment.agent_id}
                  onChange={(e) => setEditAgentAssignment({ ...editAgentAssignment, agent_id: e.target.value })}
                >
                  <option value="">{t('select_agent')}</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>{agent.email}</option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>{t('station')}</Form.Label>
                <Form.Select
                  value={editAgentAssignment.station_id}
                  onChange={(e) => setEditAgentAssignment({ ...editAgentAssignment, station_id: e.target.value })}
                >
                  <option value="">{t('select_station')}</option>
                  {[...caisses, ...boxes].map(station => (
                    <option key={station.id} value={station.id}>{station.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>{t('start_day')}</Form.Label>
                <Form.Select
                  value={editAgentAssignment.start_day}
                  onChange={(e) => setEditAgentAssignment({ ...editAgentAssignment, start_day: e.target.value })}
                >
                  <option value="">{t('select_day')}</option>
                  {dayOptions.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>{t('end_day')}</Form.Label>
                <Form.Select
                  value={editAgentAssignment.end_day}
                  onChange={(e) => setEditAgentAssignment({ ...editAgentAssignment, end_day: e.target.value })}
                >
                  <option value="">{t('select_day')}</option>
                  {dayOptions.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>{t('start_time')}</Form.Label>
                <Form.Control
                  type="time"
                  value={editAgentAssignment.start_time}
                  onChange={(e) => setEditAgentAssignment({ ...editAgentAssignment, start_time: e.target.value })}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>{t('end_time')}</Form.Label>
                <Form.Control
                  type="time"
                  value={editAgentAssignment.end_time}
                  onChange={(e) => setEditAgentAssignment({ ...editAgentAssignment, end_time: e.target.value })}
                />
              </Form.Group>
            </Form>
          )}
          {editType === 'caisse_service' && editCaisseServiceAssignment && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>{t('caisse')}</Form.Label>
                <Form.Select
                  value={editCaisseServiceAssignment.station_id}
                  onChange={(e) => setEditCaisseServiceAssignment({ ...editCaisseServiceAssignment, station_id: e.target.value })}
                >
                  <option value="">{t('select_caisse')}</option>
                  {caisses.map(caisse => (
                    <option key={caisse.id} value={caisse.id}>{caisse.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>{t('service')}</Form.Label>
                <Form.Select
                  value={editCaisseServiceAssignment.service_id}
                  onChange={(e) => setEditCaisseServiceAssignment({ ...editCaisseServiceAssignment, service_id: e.target.value })}
                >
                  <option value="">{t('select_service')}</option>
                  {services.filter(s => s.type === 'normal').map(service => (
                    <option key={service.id} value={service.id}>{service.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={editType === 'agent_station' ? handleEditAgentAssignment : handleEditCaisseServiceAssignment}
          >
            {t('save')}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Settings;