import React from 'react';
import './ModerationAlert.css';

const ModerationAlert = ({ alert, onAction }) => {
  return (
    <div className="moderation-alert animate-fade-in">
      <div className="alert-icon-wrapper">
        <svg className="alert-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <div className="alert-content">
        <h4 className="alert-title">ALERTA DEL SISTEMA IA</h4>
        <p className="alert-text">{alert.alertText}</p>
        <p className="alert-detail mono">Patrón detectado: <span className="highlight">{alert.detectedNumber}</span></p>
        <div className="alert-actions">
          <button className="btn-action continue" onClick={() => onAction('continue')}>
            Ignorar y Continuar
          </button>
          <button className="btn-action block" onClick={() => onAction('block')}>
            Bloquear Usuario
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModerationAlert;
