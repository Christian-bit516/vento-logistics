import React, { useState } from 'react';
import FraudManagement from '../features/admin/components/FraudManagement';
import DashboardStats from '../features/admin/components/DashboardStats';
import ChatBox from '../features/chat/components/ChatBox';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [simRole, setSimRole] = useState('user');

  return (
    <div className="admin-page">
      <div className="cyber-grid"></div>
      
      <div className="glow-orb" style={{ top: '-10%', left: '-10%', width: '500px', height: '500px', background: 'rgba(239, 68, 68, 0.1)' }}></div>
      <div className="glow-orb" style={{ bottom: '-10%', right: '-10%', width: '600px', height: '600px', background: 'rgba(34, 211, 238, 0.05)' }}></div>
      
      <div className="admin-layout">
        {/* Sidebar */}
        <aside className="admin-sidebar glass-panel">
          <div className="sidebar-logo">
            <span className="logo-text">VENTO</span>
            <span className="logo-badge">ADMIN</span>
          </div>
          
          <div className="sidebar-section">MÉTRICAS</div>
          <nav className="sidebar-nav">
            <button 
              className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <span className="nav-icon">📊</span> Resumen General
            </button>
            <button 
              className={`nav-item ${activeTab === 'fraud' ? 'active' : ''}`}
              onClick={() => setActiveTab('fraud')}
            >
              <span className="nav-icon">🛡️</span> Gestión de Fraudes
            </button>
          </nav>

          <div className="sidebar-section" style={{ marginTop: '1.5rem' }}>SIMULACIÓN</div>
          <nav className="sidebar-nav">
            <button 
              className={`nav-item bridge ${activeTab === 'chat' ? 'active' : ''}`} 
              onClick={() => setActiveTab('chat')}
            >
              <span className="nav-icon">💬</span> Ver Vista Cliente
            </button>
          </nav>

          <div className="sidebar-footer">
            <div className="user-pill">
              <div className="status-dot"></div>
              <span>Admin Logged In</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="admin-main">
          <header className="admin-top-bar">
            <div className="breadcrumb">
              <span>Admin</span> / <span>{activeTab === 'overview' ? 'Overview' : activeTab === 'chat' ? 'Simulation' : 'Moderation'}</span>
            </div>
            <div className="system-time mono">
              {new Date().toLocaleDateString()} | {new Date().toLocaleTimeString()}
            </div>
          </header>

          <div className="content-scroll">
            {activeTab === 'overview' && (
              <div className="tab-content animate-fade-in">
                <h2 className="content-title">Panel de Control General</h2>
                <DashboardStats />
                <div className="dashboard-grid">
                  <div className="main-card glass-panel">
                    <h3 className="card-title">Tendencia de Envíos</h3>
                    <div className="chart-placeholder">
                      <div className="bar-container">
                        {[40, 70, 45, 90, 65, 85, 95].map((h, i) => (
                          <div key={i} className="bar" style={{ height: `${h}%` }}></div>
                        ))}
                      </div>
                      <div className="chart-labels">
                        <span>LU</span><span>MA</span><span>MI</span><span>JU</span><span>VI</span><span>SA</span><span>DO</span>
                      </div>
                    </div>
                  </div>
                  <div className="side-card glass-panel">
                    <h3 className="card-title">Actividad Reciente</h3>
                    <div className="activity-list">
                      <div className="activity-item">
                        <span className="activity-time">Hace 2m</span>
                        <p>Nuevo registro facial completado</p>
                      </div>
                      <div className="activity-item">
                        <span className="activity-time">Hace 15m</span>
                        <p>Envío #4823 entregado con éxito</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'fraud' && (
              <div className="tab-content animate-fade-in">
                <FraudManagement />
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="tab-content animate-fade-in simulation-view">
                <div className="simulation-header">
                  <h2 className="content-title">Simulador de Negociación</h2>
                  <div className="role-switcher glass-panel">
                    <button 
                      className={`role-btn ${simRole === 'user' ? 'active' : ''}`}
                      onClick={() => setSimRole('user')}
                    >Cliente</button>
                    <button 
                      className={`role-btn ${simRole === 'courier' ? 'active' : ''}`}
                      onClick={() => setSimRole('courier')}
                    >Repartidor</button>
                  </div>
                </div>
                <div className="chat-container-wrap">
                  <ChatBox currentUserRole={simRole} />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
