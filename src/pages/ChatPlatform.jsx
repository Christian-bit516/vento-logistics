import React, { useState } from 'react';
import ChatBox from '../features/chat/components/ChatBox';
import './ChatPlatform.css';

const ChatPlatform = () => {
  // En un entorno real, esto vendría del contexto de autenticación
  const [role, setRole] = useState('user'); // 'user' o 'courier'

  return (
    <div className="chat-page">
      <div className="cyber-grid"></div>
      
      <div className="glow-orb top-left"></div>
      <div className="glow-orb bottom-right"></div>
      
      <div className="platform-header">
        <h1 className="platform-title">
          VENTO <span className="text-gradient">EXPRESS</span>
        </h1>
        <div className="role-selector">
          <span className="mono text-sm mr-4" style={{ color: 'var(--text-secondary)' }}>Simular vista como:</span>
          <button 
            className={`btn-role ${role === 'user' ? 'active' : ''}`}
            onClick={() => setRole('user')}
          >
            Cliente
          </button>
          <button 
            className={`btn-role ${role === 'courier' ? 'active' : ''}`}
            onClick={() => setRole('courier')}
          >
            Repartidor
          </button>
        </div>
      </div>

      <div className="chat-wrapper animate-fade-in">
        <ChatBox currentUserRole={role} />
      </div>
    </div>
  );
};

export default ChatPlatform;
