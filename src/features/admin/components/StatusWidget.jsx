import React from 'react';
import './StatusWidget.css';

const StatusWidget = () => {
  return (
    <div className="status-widget glass-panel">
      <h4 className="widget-title">System Status</h4>
      <div className="status-item">
        <div className="led green animate-pulse"></div>
        <span className="status-label">Motor NLP Online</span>
      </div>
      <div className="status-item">
        <div className="led green animate-pulse"></div>
        <span className="status-label">Socket Server Online</span>
      </div>
    </div>
  );
};

export default StatusWidget;
