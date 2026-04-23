import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './UserDashboard.css';

const UserDashboard = () => {
  const navigate = useNavigate();
  
  const gridRef = useRef(null);
  const orb1Ref = useRef(null);
  const orb2Ref = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    let animationFrameId;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const handleMouseMove = (e) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 40;
      targetY = (e.clientY / window.innerHeight - 0.5) * 40;
    };

    const updateParallax = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      if (gridRef.current) gridRef.current.style.transform = `translate(${currentX * 0.5}px, ${currentY * 0.5}px)`;
      if (orb1Ref.current) orb1Ref.current.style.transform = `translate(${currentX * -1}px, ${currentY * -1}px)`;
      if (orb2Ref.current) orb2Ref.current.style.transform = `translate(${currentX * 1.5}px, ${currentY * 1.5}px)`;
      if (contentRef.current) contentRef.current.style.transform = `translate(${currentX * 0.2}px, ${currentY * 0.2}px)`;

      animationFrameId = requestAnimationFrame(updateParallax);
    };

    window.addEventListener('mousemove', handleMouseMove);
    updateParallax();
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="user-dashboard-page">
      <div 
        ref={gridRef}
        className="cyber-grid parallax-layer" 
      ></div>
      <div 
        ref={orb1Ref}
        className="glow-orb parallax-layer" 
        style={{ 
          top: '5%', left: '5%', width: '500px', height: '500px', background: 'rgba(14, 165, 233, 0.15)'
        }}
      ></div>
      <div 
        ref={orb2Ref}
        className="glow-orb parallax-layer" 
        style={{ 
          bottom: '5%', right: '5%', width: '600px', height: '600px', background: 'rgba(16, 185, 129, 0.1)'
        }}
      ></div>
      
      <div ref={contentRef} className="dashboard-content animate-fade-in">
        <header className="dashboard-header glass-panel">
          <div className="logo-section">
            <span className="logo-text">VENTO</span>
            <span className="logo-badge user-badge">USER</span>
          </div>
          <div className="header-actions">
            <div className="user-profile">
              <div className="avatar-ring">
                <div className="avatar-inner"></div>
              </div>
              <span className="mono text-sm">Identidad Verificada</span>
            </div>
            <button className="btn-logout" onClick={() => navigate('/login')}>
              Cerrar Sesión
            </button>
          </div>
        </header>

        <main className="dashboard-main">
          <div className="welcome-section">
            <h1 className="welcome-text">Bienvenido a <span className="text-gradient">Vento Logistics</span></h1>
            <p className="welcome-subtitle mono">Sistema de Envíos P2P Activo y Seguro</p>
          </div>

          <div className="action-cards">
            <div className="action-card glass-panel" onClick={() => navigate('/chat')}>
              <div className="card-icon-wrap primary-glow">
                <span className="card-icon">📦</span>
              </div>
              <h3>Iniciar Envío</h3>
              <p>Conecta con un repartidor cercano y negocia el precio directamente a través de nuestro chat cifrado.</p>
              <button className="btn-primary mt-4 w-full">Solicitar Repartidor</button>
            </div>
            
            <div className="action-card glass-panel">
              <div className="card-icon-wrap accent-glow">
                <span className="card-icon">📍</span>
              </div>
              <h3>Rastreo en Tiempo Real</h3>
              <p>Monitorea la ubicación exacta de tus envíos activos en el mapa interactivo.</p>
              <button className="btn-outline mt-4 w-full">Ver Envíos</button>
            </div>

            <div className="action-card glass-panel">
              <div className="card-icon-wrap danger-glow">
                <span className="card-icon">🛡️</span>
              </div>
              <h3>Seguridad y Pagos</h3>
              <p>Gestiona tus métodos de pago y revisa el historial de transacciones verificadas.</p>
              <button className="btn-outline mt-4 w-full">Mi Billetera</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserDashboard;
