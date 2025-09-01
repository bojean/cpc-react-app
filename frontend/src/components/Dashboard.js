import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Dashboard = () => {
  const { t } = useTranslation();
  return (
    <div className="dashboard">
      <h1>{t('dashboard')}</h1>
      <p>Manage your services or view system status.</p>
      <Link to="/admin/services">{t('services')}</Link>
    </div>
  );
};
export default Dashboard;