import React from 'react';
import FraudManagement from '../features/admin/components/FraudManagement';
import './AdminDashboard.css';

const AdminDashboard = () => {
  return (
    <div className="admin-page">
      <div className="cyber-grid"></div>
      
      <div className="glow-orb" style={{ top: '-10%', left: '-10%', width: '500px', height: '500px', background: 'rgba(239, 68, 68, 0.1)' }}></div>
      <div className="glow-orb" style={{ bottom: '-10%', right: '-10%', width: '600px', height: '600px', background: 'rgba(34, 211, 238, 0.05)' }}></div>
      
      <div style={{ position: 'relative', zIndex: 10, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <FraudManagement />
      </div>
    </div>
  );
};

export default AdminDashboard;
