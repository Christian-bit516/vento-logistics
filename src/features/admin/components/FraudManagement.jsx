import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './FraudManagement.css';

const API_URL = 'http://localhost:3001/api';

const FraudManagement = () => {
  const [logs, setLogs] = useState([]);
  const [newBlacklist, setNewBlacklist] = useState('');

  const fetchLogs = async () => {
    try {
      const response = await axios.get(`${API_URL}/logs`);
      setLogs(response.data.reverse()); // Most recent first
    } catch (error) {
      console.error('Error fetching logs', error);
    }
  };

  useEffect(() => {
    fetchLogs();
    // Poll for new logs every 5 seconds
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAddBlacklist = async (e) => {
    e.preventDefault();
    if (!newBlacklist.trim()) return;

    try {
      await axios.post(`${API_URL}/blacklist`, { number: newBlacklist.trim() });
      alert(`Número ${newBlacklist} añadido a la lista negra.`);
      setNewBlacklist('');
    } catch (error) {
      alert('Error al añadir a la lista negra. Quizás ya existe.');
    }
  };

  return (
    <div className="fraud-management-container glass-panel">
      <div className="admin-header">
        <h2 className="title text-gradient">MÓDULO DE GESTIÓN DE FRAUDES IA</h2>
        <p className="mono subtitle">NÚCLEO DE MODERACIÓN VENTO.AI</p>
      </div>

      <div className="admin-grid">
        <div className="blacklist-panel">
          <h3 className="panel-title">Lista Negra de Números</h3>
          <p className="panel-desc">Añade números reportados para que la IA los intercepte automáticamente.</p>
          
          <form className="blacklist-form" onSubmit={handleAddBlacklist}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Ej: 999888777"
              value={newBlacklist}
              onChange={(e) => setNewBlacklist(e.target.value)}
            />
            <button type="submit" className="btn-primary">Registrar</button>
          </form>
        </div>

        <div className="logs-panel">
          <h3 className="panel-title">
            Alertas Interceptadas
            <span className="live-indicator"><span className="pulse-dot"></span> EN VIVO</span>
          </h3>
          
          <div className="logs-table-wrapper">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Rol</th>
                  <th>Mensaje Original</th>
                  <th>Patrón Detectado</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4" style={{ color: 'var(--text-secondary)' }}>
                      No se han detectado intentos de fraude aún.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="animate-fade-in">
                      <td className="mono text-xs">{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td>
                        <span className={`role-badge ${log.sender}`}>
                          {log.sender}
                        </span>
                      </td>
                      <td className="italic" style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        "{log.message}"
                      </td>
                      <td className="mono highlight">{log.detectedNumber}</td>
                      <td>
                        <span className={`status-badge ${log.status.toLowerCase()}`}>
                          {log.status}
                        </span>
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
