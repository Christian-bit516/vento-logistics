import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FraudManagement from '../features/admin/components/FraudManagement';
import DashboardStats from '../features/admin/components/DashboardStats';
import ChatBox from '../features/chat/components/ChatBox';
import FraudHeatmap from '../features/admin/components/FraudHeatmap';
import PerformanceChart from '../features/admin/components/PerformanceChart';
import StatusWidget from '../features/admin/components/StatusWidget';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [simRole, setSimRole] = useState('user');
  const navigate = useNavigate();

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
            <div 
              className="user-pill" 
              onClick={() => navigate('/login')}
              style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
              title="Cerrar sesión"
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                e.currentTarget.style.color = '#ef4444';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <h2 className="content-title" style={{ marginBottom: 0 }}>Panel de Control General</h2>
                  <StatusWidget />
                </div>
                <DashboardStats />
                <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div className="main-card glass-panel">
                    <h3 className="card-title">Rendimiento IA: Análisis de Mensajes</h3>
                    <PerformanceChart />
                  </div>
                  <div className="side-card glass-panel">
                    <h3 className="card-title">Mapa de Calor: Focos de Fraude</h3>
                    <FraudHeatmap />
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
