import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../axiosInstance';
import { useTranslation } from 'react-i18next';
import { Container, Button, Card, Form, Alert, Table } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStop, faTimes, faUserTimes, faCheck, faUndo } from '@fortawesome/free-solid-svg-icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const AgentPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentOrder, setCurrentOrder] = useState(null);
  const [timer, setTimer] = useState(0);
  const [intervalId, setIntervalId] = useState(null);
  const [ttsInterval, setTtsInterval] = useState(null);
  const [voices, setVoices] = useState([]);
  const [nonVisibleServices, setNonVisibleServices] = useState([]);
  const [messages, setMessages] = useState({ english_message: '', french_message: '', stationName: '' });
  const [error, setError] = useState('');
  const [queue, setQueue] = useState([]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [username, setUsername] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const fetchUserProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const decoded = jwtDecode(token);
      const res = await axiosInstance.get(`/users/${decoded.id}`);
      setProfilePicture(res.data.profile_picture || 'https://via.placeholder.com/100'); // Default placeholder
      setUsername(res.data.username);
      setError('');
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.response?.data?.message || t('fetch_profile_failed'));
      }
    }
  }, [navigate, t]);

  const fetchNonVisibleServices = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/non-visible-services');
      setNonVisibleServices(res.data);
      setError('');
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.response?.data?.message || t('fetch_services_failed'));
      }
    }
  }, [navigate, t]);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/messages');
      setMessages(res.data);
      setError('');
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.response?.data?.message || t('fetch_messages_failed'));
      }
    }
  }, [navigate, t]);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/agent-queue');
      setQueue(res.data);
      setError('');
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.response?.data?.message || t('fetch_queue_failed'));
      }
    }
  }, [navigate, t]);

  useEffect(() => {
    const synth = window.speechSynthesis;
    const loadVoices = () => setVoices(synth.getVoices());
    synth.onvoiceschanged = loadVoices;
    loadVoices();
    fetchUserProfile();
    fetchNonVisibleServices();
    fetchMessages();
    fetchQueue();
    return () => {
      if (intervalId) clearInterval(intervalId);
      if (ttsInterval) clearInterval(ttsInterval);
    };
  }, [fetchUserProfile, fetchNonVisibleServices, fetchMessages, fetchQueue]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => setProfilePicture(reader.result); // Preview image
      reader.readAsDataURL(file);
    } else {
      setError(t('invalid_image'));
    }
  };

  const handlePictureUpload = async () => {
    if (!selectedFile) {
      setError(t('select_image'));
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const decoded = jwtDecode(token);
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onload = async () => {
        const base64String = reader.result.split(',')[1]; // Remove data:image/*;base64,
        await axiosInstance.post(`/users/${decoded.id}/profile-picture`, { profilePicture: base64String });
        setSelectedFile(null);
        setError('');
        alert(t('picture_updated'));
        fetchUserProfile();
      };
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.response?.data?.message || t('picture_upload_failed'));
      }
    }
  };

  const callNext = async () => {
    try {
      const res = await axiosInstance.get('/next-code');
      setCurrentOrder({ ...res.data, status: 'called' });
      const message = i18n.language === 'fr' ?
        (messages.french_message || '{code} attend à {station} pour {service}').replace('{code}', res.data.code).replace('{station}', messages.stationName).replace('{service}', res.data.service_name) :
        (messages.english_message || '{code} is waiting at {station} for {service}').replace('{code}', res.data.code).replace('{station}', messages.stationName).replace('{service}', res.data.service_name);
      const utterance = new SpeechSynthesisUtterance(message);
      const voiceName = i18n.language === 'fr' ? localStorage.getItem('frenchVoice') : localStorage.getItem('englishVoice');
      utterance.voice = voices.find(v => v.name === voiceName) || voices[0];
      window.speechSynthesis.speak(utterance);
      const timerId = setInterval(() => setTimer(prev => prev + 1), 1000);
      setIntervalId(timerId);
      const ttsId = setInterval(() => {
        const newUtterance = new SpeechSynthesisUtterance(message);
        newUtterance.voice = utterance.voice;
        window.speechSynthesis.speak(newUtterance);
      }, 5000);
      setTtsInterval(ttsId);
      setTimeout(async () => {
        if (currentOrder && currentOrder.status === 'called') {
          await markAbsent();
        }
      }, 30000);
      setError('');
      fetchQueue();
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else if (err.response?.status === 404) {
        setError(err.response?.data?.message === 'No assignment' ? t('no_assignment') : t('no_next_code'));
      } else {
        setError(err.response?.data?.message || t('call_next_failed'));
      }
    }
  };

  const stopWaiting = async () => {
    try {
      await axiosInstance.post(`/orders/${currentOrder.id}/stop-waiting`, { waitingTime: timer });
      clearInterval(intervalId);
      clearInterval(ttsInterval);
      setTtsInterval(null);
      setTimer(0);
      const receptionId = setInterval(() => setTimer(prev => prev + 1), 1000);
      setIntervalId(receptionId);
      setCurrentOrder({ ...currentOrder, status: 'reception' });
      setError('');
      fetchQueue();
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.response?.data?.message || t('stop_waiting_failed'));
      }
    }
  };

  const stopReception = async () => {
    try {
      await axiosInstance.post(`/orders/${currentOrder.id}/stop-reception`, { receptionTime: timer });
      clearInterval(intervalId);
      setIntervalId(null);
      setCurrentOrder(null);
      setTimer(0);
      setError('');
      fetchQueue();
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.response?.data?.message || t('stop_reception_failed'));
      }
    }
  };

  const markAbsent = async () => {
    try {
      await axiosInstance.post(`/orders/${currentOrder.id}/absent`, { waitingTime: timer });
      clearInterval(intervalId);
      clearInterval(ttsInterval);
      setIntervalId(null);
      setTtsInterval(null);
      setCurrentOrder(null);
      setTimer(0);
      setError('');
      fetchQueue();
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.response?.data?.message || t('mark_absent_failed'));
      }
    }
  };

  const restoreOrder = async (orderId) => {
    try {
      await axiosInstance.post(`/orders/${orderId}/restore`);
      setError('');
      fetchQueue();
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.response?.data?.message || t('restore_failed'));
      }
    }
  };

  const redirect = async (newServiceId) => {
    try {
      await axiosInstance.put(`/orders/${currentOrder.id}/redirect`, { newServiceId });
      clearInterval(intervalId);
      setIntervalId(null);
      setCurrentOrder(null);
      setTimer(0);
      setError('');
      fetchQueue();
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.response?.data?.message || t('redirect_failed'));
      }
    }
  };

  const endJourney = async () => {
    try {
      await axiosInstance.post(`/orders/${currentOrder.id}/end`);
      clearInterval(intervalId);
      setIntervalId(null);
      setCurrentOrder(null);
      setTimer(0);
      setError('');
      fetchQueue();
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.response?.data?.message || t('end_journey_failed'));
      }
    }
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
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.response?.data?.message || t('password_update_failed'));
      }
    }
  };

  const groupedQueue = queue.reduce((acc, order) => {
    const serviceName = order.service_name;
    if (!acc[serviceName]) acc[serviceName] = [];
    acc[serviceName].push(order);
    return acc;
  }, {});

  return (
    <Container className="mt-4 bg-light rounded shadow-sm p-4">
      {location.pathname === '/agent/profile' ? (
        <>
          <h1>{t('profile')}</h1>
          {error && <Alert variant="danger">{error}</Alert>}
          <Card className="mb-4 shadow-sm">
            <Card.Body>
              <div className="profile-picture-container">
                <img src={profilePicture} alt="Profile" className="profile-picture" />
                <div className="profile-username">{username}</div>
              </div>
              <Form.Group className="mb-3">
                <Form.Label>{t('upload_profile_picture')}</Form.Label>
                <Form.Control type="file" accept="image/*" onChange={handleFileChange} />
              </Form.Group>
              {selectedFile && (
                <Button variant="primary" onClick={handlePictureUpload} className="mb-3">
                  {t('save_picture')}
                </Button>
              )}
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
        </>
      ) : (
        <>
          <h1>{t('agent_page')}</h1>
          <h3>{t('current_station')}: {messages.stationName || t('no_station')}</h3>
          {error && <Alert variant="danger">{error}</Alert>}
          <h3>{t('queue')}</h3>
          {Object.keys(groupedQueue).length === 0 ? (
            <p>{t('no_codes')}</p>
          ) : (
            Object.keys(groupedQueue).map(serviceName => (
              <Card key={serviceName} className="mb-4 shadow-sm">
                <Card.Body>
                  <h4>{serviceName}</h4>
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>{t('code')}</th>
                        <th>{t('status')}</th>
                        <th>{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedQueue[serviceName].map(order => (
                        <tr key={order.id}>
                          <td>{order.code}</td>
                          <td>{order.status}</td>
                          <td>
                            {order.status === 'absent' && (
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => restoreOrder(order.id)}
                              >
                                <FontAwesomeIcon icon={faUndo} /> {t('restore')}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            ))
          )}
          {!currentOrder && (
            <Button variant="primary" onClick={callNext}>
              <FontAwesomeIcon icon={faCheck} /> {t('next')}
            </Button>
          )}
          {currentOrder && (
            <Card className="shadow-sm">
              <Card.Body>
                <h3>{currentOrder.code}</h3>
                <p>{t('timer')}: {timer}s</p>
                {currentOrder.status === 'called' && (
                  <Button variant="warning" onClick={stopWaiting} className="me-2">
                    <FontAwesomeIcon icon={faStop} /> {t('stop_waiting')}
                  </Button>
                )}
                {currentOrder.status === 'reception' && (
                  <>
                    <Button variant="success" onClick={stopReception} className="me-2">
                      <FontAwesomeIcon icon={faCheck} /> {t('stop_reception')}
                    </Button>
                    <Form.Select onChange={(e) => redirect(e.target.value)} className="mt-2">
                      <option>{t('redirect_to')}</option>
                      {nonVisibleServices.length === 0 && (
                        <option disabled>{t('no_box_services')}</option>
                      )}
                      {nonVisibleServices.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </Form.Select>
                  </>
                )}
                <Button variant="danger" onClick={markAbsent} className="me-2">
                  <FontAwesomeIcon icon={faUserTimes} /> {t('absent')}
                </Button>
                <Button variant="secondary" onClick={endJourney}>
                  <FontAwesomeIcon icon={faTimes} /> {t('end')}
                </Button>
              </Card.Body>
            </Card>
          )}
        </>
      )}
    </Container>
  );
};

export default AgentPage;