import React, { useState, useCallback, useRef } from 'react';
import FaceScannerPro from './FaceScannerPro';
import { useBiometricAuth } from '../hooks/useBiometricAuth';
import './AdvancedLoginForm.css';

// ─── Result screens ───────────────────────────────────────────────────────────

const SuccessScreen = ({ mode, confidenceScore, onContinueToLogin }) => (
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
        ? 'Su biometría fue guardada exitosamente en la red Vento.'
        : <>Match biométrico verificado: <span className="score-highlight">{confidenceScore}%</span></>}
    </p>

    {mode === 'register' ? (
      <button className="btn-primary result-btn" onClick={onContinueToLogin}>
        CONTINUAR → INICIAR SESIÓN
      </button>
    ) : (
      <p className="result-hint mono">Redirigiendo a la plataforma...</p>
    )}
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
  // Keep a ref of activeTab so handleCapture never reads a stale value
  const activeTabRef = useRef('register');

  const {
    status,
    errorMsg,
    confidenceScore,
    successMode,
    modelsReady,
    registerFace,
    loginFace,
    resetToReady,
  } = useBiometricAuth();

  // ── Tab switch ────────────────────────────────────────────────────────────
  const switchTab = useCallback((tab) => {
    setActiveTab(tab);
    activeTabRef.current = tab;
    resetToReady();
  }, [resetToReady]);

  // ── Capture handler (called by FaceScannerPro when progress hits 100%) ───
  const handleCapture = useCallback(async (base64) => {
    // Read current tab from ref — avoids stale closure
    const currentTab = activeTabRef.current;

    if (currentTab === 'register') {
      const result = await registerFace(base64);
      // 'no_face' → hook already reset status to 'ready', scanner will retry naturally
      if (result?.success) {
        // Auto-redirect to login after register success is shown for 3 s
        // (user can also click the button manually)
      }
    } else {
      const result = await loginFace(base64);
      if (result?.success) {
        // Give user 2 s to see the success screen before redirect
        setTimeout(() => { window.location.href = '/chat'; }, 2500);
      }
      // 'no_face' → hook already reset to 'ready'
      // 'unrecognized' | 'error' | 'no_users' → hook set status accordingly
    }
  }, [registerFace, loginFace]);

  // ── After register success → move to login tab ────────────────────────────
  const handleContinueToLogin = useCallback(() => {
    switchTab('login');
  }, [switchTab]);

  // ── Go to register from unrecognized screen ───────────────────────────────
  const handleGoToRegister = useCallback(() => {
    switchTab('register');
  }, [switchTab]);

  // ── Derived display booleans ──────────────────────────────────────────────
  const showScanner    = status !== 'success' && status !== 'unrecognized';
  const isProcessing   = status === 'processing';
  const hasError       = status === 'error';

  return (
    <div className="advanced-login-form glass-panel">
      <div className="form-content">

        {/* ── Header ── */}
        <div className="form-header">
          <h2 className="title">VENTO <span className="title-light">ID</span></h2>
          <p className="subtitle mono">Protocolo de Seguridad Biométrica P2P</p>
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
            onContinueToLogin={handleContinueToLogin}
          />
        ) : status === 'unrecognized' ? (
          <UnrecognizedScreen
            onGoToRegister={handleGoToRegister}
            onRetry={resetToReady}
          />
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