import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Container, Button, Card } from 'react-bootstrap';
import { jwtDecode } from 'jwt-decode';

const Welcome = () => {
  const { t } = useTranslation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 > Date.now()) {
          setIsAuthenticated(true);
          setRole(decoded.role);
        } else {
          localStorage.removeItem('token');
        }
      } catch (err) {
        localStorage.removeItem('token');
      }
    }
  }, []);

  return (
    <Container className="mt-4 bg-light rounded shadow-sm p-4">
      <Card className="shadow-sm">
        <Card.Body>
          <h1>{t('welcome')}</h1>
          <p>{t('welcome_message')}</p>
          <div className="d-flex flex-column gap-2">
            {!isAuthenticated && (
              <>
                <Button as={Link} to="/login" variant="primary">
                  {t('login')}
                </Button>
                <Button as={Link} to="/client" variant="secondary">
                  {t('client_portal')}
                </Button>
                <Button as={Link} to="/Vaccination" variant="success">
                  {t('rabies_exposure_declaration')}
                </Button>
              </>
            )}
            {isAuthenticated && role === 'agent' && (
              <>
                <Button as={Link} to="/agent" variant="primary">
                  {t('agent_dashboard')}
                </Button>
                
              </>
            )}
            {isAuthenticated && role === 'admin' && (
              <Button as={Link} to="/admin/dashboard" variant="primary">
                {t('admin_dashboard')}
              </Button>
            )}
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Welcome;