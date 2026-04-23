import React, { useEffect, useRef, useMemo } from 'react';
import AdvancedLoginForm from '../features/auth/components/AdvancedLoginForm';
import './Login.css';

// Floating particles for ambiance
const Particles = () => {
  const count = 18;
  const particles = useMemo(() => (
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      animationDuration: `${8 + Math.random() * 14}s`,
      animationDelay: `${Math.random() * 10}s`,
      size: Math.random() < 0.5 ? '2px' : '3px',
      opacity: 0.3 + Math.random() * 0.5,
    }))
  ), []);

  return (
    <>
      {particles.map(p => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            bottom: '-10px',
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animationDuration: p.animationDuration,
            animationDelay: p.animationDelay,
          }}
        />
      ))}
    </>
  );
};

const Login = () => {
  const orb1Ref = useRef(null);
  const orb2Ref = useRef(null);
  const orb3Ref = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    let raf;
    let mx = 0, my = 0, cx = 0, cy = 0;

    const onMove = (e) => {
      mx = (e.clientX / window.innerWidth  - 0.5) * 28;
      my = (e.clientY / window.innerHeight - 0.5) * 28;
    };

    const tick = () => {
      cx += (mx - cx) * 0.055;
      cy += (my - cy) * 0.055;

      if (orb1Ref.current)    orb1Ref.current.style.transform    = `translate(${cx * -1.1}px, ${cy * -1.1}px)`;
      if (orb2Ref.current)    orb2Ref.current.style.transform    = `translate(${cx * 1.4}px,  ${cy * 1.4}px)`;
      if (orb3Ref.current)    orb3Ref.current.style.transform    = `translate(${cx * -0.7}px, ${cy * 0.7}px)`;
      if (contentRef.current) contentRef.current.style.transform  = `translate(${cx * 0.12}px, ${cy * 0.12}px)`;

      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="login-page">
      {/* Deep space bg */}
      <div className="login-page-bg" />

      {/* Floating particles */}
      <Particles />

      {/* Perspective Grid */}
      <div className="cyber-grid" />

      {/* Glowing Orbs */}
      <div ref={orb1Ref} className="glow-orb parallax-layer"
        style={{ top: '2%', left: '10%', width: '480px', height: '480px', background: 'rgba(0, 195, 255, 0.11)' }}
      />
      <div ref={orb2Ref} className="glow-orb parallax-layer"
        style={{ bottom: '2%', right: '8%', width: '560px', height: '560px', background: 'rgba(16, 185, 129, 0.08)' }}
      />
      <div ref={orb3Ref} className="glow-orb parallax-layer"
        style={{ top: '45%', right: '28%', width: '280px', height: '280px', background: 'rgba(139, 92, 246, 0.07)' }}
      />

      {/* Main Content */}
      <div
        ref={contentRef}
        className="parallax-layer"
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '38rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Brand badge */}
        <div className="login-brand-badge">
          <span className="badge-dot" />
          <span className="badge-text">Sistema Activo — Vento Logistics Platform</span>
        </div>

        <AdvancedLoginForm />

        <p className="mono footer-text" style={{ marginTop: '2rem' }}>
          © {new Date().getFullYear()} VENTO SOFTWARE DEVELOPMENT &nbsp;|&nbsp; CORE v2.1.0 &nbsp;|&nbsp; BIOMETRIC SEC LAYER
        </p>
      </div>
    </div>
  );
};

export default Login;