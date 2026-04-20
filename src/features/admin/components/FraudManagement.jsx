import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './FraudManagement.css';

const API_URL = 'http://localhost:3001/api';

const FraudManagement = () => {
  const [logs, setLogs] = useState([]);
  const [newBlacklist, setNewBlacklist] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const response = await axios.get(`${API_URL}/logs`);
      setLogs(response.data); // Server already has them sorted if we trust it, or we sort here
      setLoading(false);
    } catch (error) {
      console.error('Error fetching logs', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAddBlacklist = async (number) => {
    if (!number || !number.trim()) return;

    try {
      await axios.post(`${API_URL}/blacklist`, { number: number.trim() });
      alert(`Número ${number} añadido a la lista negra.`);
      setNewBlacklist('');
      fetchLogs();
    } catch (error) {
      alert('Error al añadir a la lista negra. Quizás ya existe.');
    }
  };

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
        <div className="panel-card glass-panel">
          <h3 className="card-title">Control de Lista Negra</h3>
          <p className="card-desc">Ingrese números manualmente para interceptación global inmediata.</p>
          
          <form className="blacklist-form" onSubmit={(e) => { e.preventDefault(); handleAddBlacklist(newBlacklist); }}>
            <div className="input-group">
              <input 
                type="text" 
                className="modern-input" 
                placeholder="Ej: 999888777"
                value={newBlacklist}
                onChange={(e) => setNewBlacklist(e.target.value)}
              />
              <button type="submit" className="btn-action primary">
                Registrar
              </button>
            </div>
          </form>
        </div>

        {/* Logs Table */}
        <div className="panel-card glass-panel table-panel">
          <div className="panel-header-row">
            <h3 className="card-title">Monitor de Intercepciones</h3>
            <span className="live-indicator"><span className="pulse-dot"></span> FEED EN VIVO</span>
          </div>
          
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Emisor</th>
                  <th>Detección</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="loading-cell">Sincronizando con el núcleo...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan="5" className="empty-cell">Sistema libre de anomalías.</td></tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className={log.status.toLowerCase()}>
                      <td className="mono text-xs opacity-60">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                      </td>
                      <td>
                        <span className={`role-tag ${log.sender}`}>
                          {log.sender.toUpperCase()}
                        </span>
                      </td>
                      <td className="detection-cell">
                        <span className="detected-num mono">{log.detectedNumber}</span>
                        <div className="original-msg" title={log.message}>"{log.message}"</div>
                      </td>
                      <td>
                        <span className={`status-pill ${log.status.toLowerCase()}`}>
                          {log.status === 'INTERCEPTED' ? 'BLOQUEADO' : 'SOSPECHOSO'}
                        </span>
                      </td>
                      <td>
                        {log.status === 'SUSPICIOUS_ALLOWED' ? (
                          <button 
                            className="btn-ban"
                            onClick={() => handleAddBlacklist(log.detectedNumber)}
                            title="Añadir a Lista Negra"
                          >
                            BLACKLIST
                          </button>
                        ) : (
                          <span className="action-done">✓ PROTEGIDO</span>
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
