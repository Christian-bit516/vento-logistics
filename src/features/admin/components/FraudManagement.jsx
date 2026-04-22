import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './FraudManagement.css';

const API_URL = 'http://localhost:3001/api';

// --- Lógica de 'IA Feedback' ---
// Expresión regular avanzada para detectar números camuflados (dígitos o palabras) con separadores
const detectSuspiciousPattern = (text) => {
  const pattern = /(?:(?:cero|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|\d)[\s\-\.]*){7,}/gi;
  return text.match(pattern);
};

const HighlightedMessage = ({ message }) => {
  const matches = detectSuspiciousPattern(message);
  
  if (!matches) return <span>{message}</span>;

  const pattern = /(?:(?:cero|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|\d)[\s\-\.]*){7,}/gi;
  const parts = message.split(pattern);

  return (
    <div className="message-content">
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {matches[i] && <span className="danger-highlight">{matches[i]}</span>}
        </React.Fragment>
      ))}
    </div>
  );
};

const RiskBadge = ({ status }) => {
  let risk = 'Bajo';
  let badgeClass = 'risk-low';

  if (status === 'INTERCEPTED') {
    risk = 'Crítico';
    badgeClass = 'risk-critical';
  } else if (status === 'SUSPICIOUS_ALLOWED') {
    risk = 'Medio';
    badgeClass = 'risk-medium';
  }

  return <span className={`risk-badge ${badgeClass}`}>{risk}</span>;
};

const FraudManagement = () => {
  const [logs, setLogs] = useState([]);
  const [newBlacklist, setNewBlacklist] = useState('');
  const [blacklistedNumbers, setBlacklistedNumbers] = useState([]);
  const [inputError, setInputError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [dismissedLogs, setDismissedLogs] = useState(new Set());

  const fetchData = async () => {
    try {
      const [logsRes, blacklistRes] = await Promise.all([
        axios.get(`${API_URL}/logs`),
        axios.get(`${API_URL}/blacklist`)
      ]);
      setLogs(logsRes.data); 
      setBlacklistedNumbers(blacklistRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAddBlacklist = async (number) => {
    if (!number) return;
    
    // Validación de formato peruano (9 dígitos, usualmente empezando con 9)
    const peruPhoneRegex = /^9\d{8}$/;
    
    let cleanNumber = number.toString().replace(/\D/g, '');
    
    if (!peruPhoneRegex.test(cleanNumber)) {
      setInputError('Formato inválido. Debe ser un número de 9 dígitos (ej. 987654321).');
      setSuccessMsg('');
      return;
    }
    
    setInputError('');

    try {
      await axios.post(`${API_URL}/blacklist`, { number: cleanNumber });
      setNewBlacklist('');
      setSuccessMsg(`¡Número ${cleanNumber} bloqueado con éxito!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchData();
    } catch (error) {
      setSuccessMsg('');
      if (!error.response) {
        setInputError('Error de red: El servidor backend (Motor IA) no está en línea.');
      } else {
        setInputError(error.response.data.message || 'Error al añadir. Quizás ya existe en la lista negra.');
      }
    }
  };

  const handleRemoveBlacklist = async (number) => {
    try {
      await axios.delete(`${API_URL}/blacklist/${number}`);
      fetchData();
    } catch (error) {
      console.error('Error removing from blacklist', error);
    }
  };

  const handleDismiss = (logId) => {
    setDismissedLogs(prev => new Set(prev).add(logId));
  };

  const visibleLogs = logs.filter(log => !dismissedLogs.has(log.id));
  const interceptedCount = logs.filter(l => l.status === 'INTERCEPTED').length;
  const suspiciousCount = logs.filter(l => l.status === 'SUSPICIOUS_ALLOWED').length;

  return (
    <div className="fraud-management">
      <div className="section-header">
        <h2 className="content-title">Seguridad & Moderación IA</h2>
        <div className="fraud-stats-mini">
          <div className="mini-stat">
            <span className="label">Bloqueados</span>
            <span className="value danger">{interceptedCount}</span>
          </div>
          <div className="mini-stat">
            <span className="label">Bajo Vigilancia</span>
            <span className="value warning">{suspiciousCount}</span>
          </div>
        </div>
      </div>

      <div className="admin-grid-fraud">
        {/* Blacklist Entry */}
        <div className="panel-card glass-panel blacklist-panel">
          <h3 className="card-title">Módulo de Lista Negra</h3>
          <p className="card-desc">Control manual de números bloqueados. Se requiere formato peruano (9 dígitos).</p>
          
          <form className="blacklist-form" onSubmit={(e) => { e.preventDefault(); handleAddBlacklist(newBlacklist); }}>
            <div className="input-group">
              <input 
                type="text" 
                className={`modern-input ${inputError ? 'input-error' : ''}`} 
                placeholder="Ej: 987654321"
                value={newBlacklist}
                onChange={(e) => {
                  setNewBlacklist(e.target.value);
                  setInputError('');
                }}
                maxLength={9}
              />
              <button type="submit" className="btn-action primary">
                Registrar
              </button>
            </div>
            {inputError && <div className="error-message animate-fade-in">{inputError}</div>}
            {successMsg && <div className="success-message animate-fade-in">{successMsg}</div>}
          </form>

          <div className="blacklist-directory">
            <h4 className="directory-title">Números Bloqueados ({blacklistedNumbers.length})</h4>
            <div className="blacklist-scroll-area">
              {blacklistedNumbers.length === 0 ? (
                <div className="empty-directory">No hay números bloqueados.</div>
              ) : (
                blacklistedNumbers.map(num => (
                  <div key={num} className="blacklist-item animate-fade-in">
                    <span className="mono">{num}</span>
                    <button 
                      className="btn-remove" 
                      onClick={() => handleRemoveBlacklist(num)}
                      title="Quitar de Lista Negra"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="panel-card glass-panel table-panel">
          <div className="panel-header-row">
            <h3 className="card-title">Monitor de Intercepciones en Tiempo Real</h3>
            <span className="live-indicator"><span className="pulse-dot"></span> FEED EN VIVO</span>
          </div>
          
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>ID Emisor</th>
                  <th>Mensaje Detectado</th>
                  <th>Nivel de Riesgo</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="loading-cell">
                      <div className="loader-container">
                        <div className="spinner-small"></div>
                        <span>Sincronizando con el núcleo de IA...</span>
                      </div>
                    </td>
                  </tr>
                ) : visibleLogs.length === 0 ? (
                  <tr><td colSpan="5" className="empty-cell">Sistema libre de anomalías.</td></tr>
                ) : (
                  visibleLogs.map((log) => (
                    <tr key={log.id} className={`log-row ${log.status.toLowerCase()}`}>
                      <td className="mono text-xs opacity-60">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                      </td>
                      <td>
                        <span className={`role-tag ${log.sender}`}>
                          {log.sender.toUpperCase()}
                        </span>
                      </td>
                      <td className="detection-cell">
                        <HighlightedMessage message={log.message} />
                      </td>
                      <td>
                        <RiskBadge status={log.status} />
                      </td>
                      <td>
                        {log.status === 'SUSPICIOUS_ALLOWED' ? (
                          <div className="action-buttons">
                            <button 
                              className="btn-action block"
                              onClick={() => handleAddBlacklist(log.detectedNumber)}
                              title="Añadir a Lista Negra"
                            >
                              Bloquear
                            </button>
                            <button 
                              className="btn-action dismiss"
                              onClick={() => handleDismiss(log.id)}
                              title="Marcar como seguro"
                            >
                              Desestimar
                            </button>
                          </div>
                        ) : (
                          <span className="action-done">Bloqueado Automáticamente</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FraudManagement;
