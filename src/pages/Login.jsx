import React, { useState, useEffect } from 'react';
import AdvancedLoginForm from '../features/auth/components/AdvancedLoginForm';
import './Login.css';

const Login = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="login-page">
      <div 
        className="cyber-grid parallax-layer" 
        style={{ transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px)` }}
      ></div>
      
      <div 
        className="glow-orb parallax-layer" 
        style={{ 
          top: '10%', left: '20%', width: '300px', height: '300px', background: 'rgba(14, 165, 233, 0.15)',
          transform: `translate(${mousePos.x * -1.5}px, ${mousePos.y * -1.5}px)` 
        }}
      ></div>
      <div 
        className="glow-orb parallax-layer" 
        style={{ 
          bottom: '10%', right: '20%', width: '400px', height: '400px', background: 'rgba(34, 211, 238, 0.1)',
          transform: `translate(${mousePos.x * 2}px, ${mousePos.y * 2}px)`
        }}
      ></div>
      
      <div style={{ position: 'relative', zIndex: 10, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `translate(${mousePos.x * 0.2}px, ${mousePos.y * 0.2}px)` }}>
        <AdvancedLoginForm />
        
        <p className="mono footer-text" style={{ marginTop: '3rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          © {new Date().getFullYear()} VENTO SOFTWARE DEVELOPMENT. VERSIÓN DEL NÚCLEO: 2.1.0
        </p>
      </div>
    </div>
  );
};

export default Login;