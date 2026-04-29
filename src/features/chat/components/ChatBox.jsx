import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import ModerationAlert from './ModerationAlert';
import './ChatBox.css';

import API_URL_BASE from '../../../config/api';

const SOCKET_URL = API_URL_BASE;

const ChatBox = ({ currentUserRole = 'user' }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [socket, setSocket] = useState(null);
  const [aiAlert, setAiAlert] = useState(null);
  const messagesEndRef = useRef(null);
  
  // Hardcoded room for demonstration
  const room = 'negotiation-123';

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.emit('join_room', room);

    newSocket.on('receive_message', (data) => {
      setMessages((prev) => [...prev, data]);
      scrollToBottom();
    });

    newSocket.on('ai_alert', (data) => {
      // Only show alert to the person receiving the message
      if (data.sender !== currentUserRole) {
        setAiAlert(data);
      }
    });

    return () => newSocket.close();
  }, [room, currentUserRole]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !socket) return;

    const messageData = {
      room,
      message: inputValue,
      sender: currentUserRole,
      timestamp: new Date().toISOString(),
    };

    // Optimistic UI update
    setMessages((prev) => [...prev, messageData]);
    socket.emit('send_message', messageData);
    setInputValue('');
    scrollToBottom();
  };

  const handleAlertAction = (action) => {
    if (action === 'block') {
      alert('Usuario bloqueado por seguridad.');
      window.location.href = '/login';
    }
    setAiAlert(null); // Dismiss alert on continue
  };

  return (
    <div className="chat-container glass-panel">
      <div className="chat-header">
        <h3>Negociación P2P</h3>
        <span className={`role-badge ${currentUserRole}`}>
          {currentUserRole === 'user' ? 'Cliente' : 'Repartidor'}
        </span>
      </div>

      {aiAlert && (
        <ModerationAlert alert={aiAlert} onAction={handleAlertAction} />
      )}

      <div className="messages-area">
        {messages.map((msg, index) => {
          const isMe = msg.sender === currentUserRole;
          return (
            <div key={index} className={`message-wrapper ${isMe ? 'mine' : 'theirs'}`}>
              <div className="message-bubble">
                {msg.message}
              </div>
              <div className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-area" onSubmit={handleSendMessage}>
        <input
          type="text"
          className="chat-input"
          placeholder="Negocia el precio (ej. Te ofrezco S/15)..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <button type="submit" className="chat-send-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
          </svg>
        </button>
      </form>
    </div>
  );
};

export default ChatBox;
