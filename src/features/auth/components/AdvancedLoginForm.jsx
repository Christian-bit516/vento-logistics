import React, { useState, useCallback, useRef } from 'react';
import FaceScannerPro from './FaceScannerPro';
import { useBiometricAuth } from '../hooks/useBiometricAuth';
import './AdvancedLoginForm.css';

// ─── Result screens ───────────────────────────────────────────────────────────

const SuccessScreen = ({ mode, confidenceScore, isOffline }) => (
  <div className="result-screen animate-fade-in">
    <div className="result-icon-wrap success-glow">
      <svg className="result-icon success-color" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <h3 className="result-title success-color mono">
      {mode === 'register' ? 'IDENTIDAD REGISTRADA' : 'ACCESO CONCEDIDO'}
    </h3>
    <p className="result-subtitle">
      {mode === 'register'
        ? 'Su biometría fue guardada exitosamente en Firestore.'
        : <><span>Match biométrico verificado: </span><span className="score-highlight">{confidenceScore}%</span></>}
    </p>
    {isOffline && (
      <div className="offline-badge">
        <span>⚠</span> Modo offline — datos en cache local
      </div>
    )}
    <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden', marginTop: '1.25rem' }}>
      <div style={{ height: '100%', background: 'linear-gradient(90deg, #10b981, #22d3ee)', animation: 'loading-progress 3s linear forwards', borderRadius: '2px' }}></div>
    </div>
    <p className="result-hint mono" style={{ marginTop: '0.75rem' }}>Redirigiendo a la plataforma...</p>
  </div>
);

const UnrecognizedScreen = ({ onGoToRegister, onRetry }) => (
  <div className="result-screen animate-fade-in">
    <div className="result-icon-wrap danger-glow">
      <svg className="result-icon danger-color" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </div>
    <h3 className="result-title danger-color mono">ROSTRO NO RECONOCIDO</h3>
    <p className="result-subtitle">
      Este rostro no tiene cuenta en la red Vento.<br />
      ¿Desea crear una cuenta nueva?
    </p>
    <div className="result-actions">
      <button className="btn-primary result-btn" onClick={onGoToRegister}>
        IR A REGISTRO
      </button>
      <button className="back-btn" onClick={onRetry}>
        REINTENTAR ESCANEO
      </button>
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const AdvancedLoginForm = () => {
  const [activeTab, setActiveTab] = useState('register');
  const [userName, setUserName] = useState('');
  const [pendingDescriptor, setPendingDescriptor] = useState(null);
  const [isOffline, setIsOffline] = useState(false);

  const activeTabRef = useRef('register');

  // ── Text-to-Speech Helper ──
  const speakWelcome = useCallback((name, isRegistering) => {
    if ('speechSynthesis' in window) {
      const text = isRegistering 
        ? `Registro completado. Bienvenido, ${name}` 
        : `Acceso autorizado. Bienvenido, ${name}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.pitch = 1;
      utterance.rate = 1;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const {
    status,
    errorMsg,
    confidenceScore,
    successMode,
    modelsReady,
    serverOnline,
    dbMode,
    registerFace,
    finalizeRegistration,
    loginFace,
    resetToReady,
  } = useBiometricAuth();

  // ── Tab switch ────────────────────────────────────────────────────────────
  const switchTab = useCallback((tab) => {
    setActiveTab(tab);
    activeTabRef.current = tab;
    setPendingDescriptor(null);
    setUserName('');
    resetToReady();
  }, [resetToReady]);

  // ── Capture handler ───────────────────────────────────────────────────────
  const handleCapture = useCallback(async (base64) => {
    const currentTab = activeTabRef.current;

    if (currentTab === 'register') {
      const result = await registerFace(base64);
      if (result?.success) {
        setPendingDescriptor(result.descriptor);
      }
    } else {
      const result = await loginFace(base64);
      if (result?.success) {
        if (result.offline) setIsOffline(true);
        speakWelcome(result.user.name, false);
        setTimeout(() => { window.location.href = '/user'; }, 3000);
      }
    }
  }, [registerFace, loginFace, speakWelcome]);

  const handleFinalizeRegistration = async () => {
    if (!userName.trim()) {
      alert("Por favor ingrese un nombre.");
      return;
    }
    const result = await finalizeRegistration(pendingDescriptor, userName);
    if (result.success) {
      if (result.offline) setIsOffline(true);
      speakWelcome(result.user.name, true);
      setPendingDescriptor(null);
      setUserName('');
      setTimeout(() => { window.location.href = '/user'; }, 3000);
    }
  };

  // ── Go to register from unrecognized screen ───────────────────────────────
  const handleGoToRegister = useCallback(() => {
    switchTab('register');
  }, [switchTab]);

  // ── Derived display booleans ──────────────────────────────────────────────
  const isProcessing   = status === 'processing';
  const hasError       = status === 'error';

  return (
    <div className="advanced-login-form">
      <div className="form-content">

        {/* Header */}
        <div className="form-header">
          <h2 className="title">VENTO <span className="title-light">ID</span></h2>
          <p className="subtitle mono">Protocolo de Seguridad Biométrica P2P</p>
          <div
            className="db-status-badge"
            title={
              dbMode === 'firestore'    ? 'Datos guardados en Firestore' :
              dbMode === 'server_local' ? 'Servidor activo — base de datos en memoria' :
              'Sin servidor — modo completamente offline'
            }
          >
            <span className={`db-dot ${
              dbMode === 'firestore'    ? 'db-online' :
              dbMode === 'server_local' ? 'db-warning' :
              'db-offline'
            }`} />
            <span className="db-label mono">
              {dbMode === 'firestore'    ? 'FIRESTORE LIVE' :
               dbMode === 'server_local' ? 'SERVIDOR LOCAL' :
               'MODO OFFLINE'}
            </span>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="auth-mode-tabs">
          <button
            id="tab-register"
            className={`tab-btn${activeTab === 'register' ? ' active' : ''}`}
            onClick={() => switchTab('register')}
          >
            <span className="tab-number">01</span>
            <span className="tab-label">REGISTRO</span>
          </button>
          <button
            id="tab-login"
            className={`tab-btn${activeTab === 'login' ? ' active' : ''}`}
            onClick={() => switchTab('login')}
          >
            <span className="tab-number">02</span>
            <span className="tab-label">INICIAR SESIÓN</span>
          </button>
        </div>

        {/* ── Content ── */}
        {status === 'success' ? (
          <SuccessScreen
            mode={successMode}
            confidenceScore={confidenceScore}
            isOffline={isOffline}
          />
        ) : status === 'unrecognized' ? (
          <UnrecognizedScreen
            onGoToRegister={handleGoToRegister}
            onRetry={resetToReady}
          />
        ) : pendingDescriptor ? (
          <div className="form-body animate-fade-in" style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div className="result-icon-wrap" style={{ margin: '0 auto 1.25rem', background: 'rgba(0, 195, 255, 0.08)', border: '1px solid rgba(0, 195, 255, 0.25)', boxShadow: '0 0 40px rgba(0, 195, 255, 0.15)' }}>
              <svg className="result-icon" style={{ color: '#00c3ff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="title" style={{ fontSize: '1.55rem', marginBottom: '0.4rem' }}>ROSTRO CAPTURADO</h3>
            <p className="subtitle mono" style={{ marginBottom: '1.75rem' }}>Asigne un nombre a su identidad biométrica</p>

            <div className="name-input-wrapper">
              <input
                type="text"
                className="name-input-field"
                placeholder="Ingrese su nombre completo"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFinalizeRegistration()}
                autoFocus
              />
            </div>

            <div className="result-actions" style={{ marginTop: '1.75rem' }}>
              <button
                className="btn-primary w-full"
                style={{ padding: '1rem', fontSize: '0.88rem', letterSpacing: '0.15em' }}
                onClick={handleFinalizeRegistration}
              >
                {dbMode === 'firestore'
                  ? 'GUARDAR EN FIRESTORE ☁'
                  : dbMode === 'server_local'
                    ? 'GUARDAR EN SERVIDOR'
                    : 'GUARDAR LOCALMENTE 💾'}
              </button>
              <button
                className="back-btn mt-4"
                onClick={() => setPendingDescriptor(null)}
              >
                CANCELAR Y REESCANEAR
              </button>
            </div>
          </div>
        ) : (
          <div className="form-body">

            {/* Error banner */}
            {errorMsg && (
              <div className="error-box mono animate-fade-in">
                <span className="error-prefix">[ERR]</span>
                <span className="error-text">{errorMsg}</span>
                <button className="error-dismiss" onClick={resetToReady} title="Cerrar">✕</button>
              </div>
            )}

            {/* Models still loading notice */}
            {!modelsReady && !errorMsg && (
              <div className="info-box mono animate-fade-in">
                <span className="info-prefix">[IA]</span>
                <span> Cargando modelos de reconocimiento facial...</span>
              </div>
            )}

            {/* Biometric scanner */}
            <FaceScannerPro
              onCapture={handleCapture}
              isProcessing={isProcessing}
              hasError={hasError}
              onRetry={resetToReady}
              mode={activeTab}
            />
          </div>
        )}

      </div>
    </div>
  );
};

export default AdvancedLoginForm;