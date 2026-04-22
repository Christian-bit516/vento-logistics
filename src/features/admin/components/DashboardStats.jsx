import React from 'react';
import './DashboardStats.css';

const DashboardStats = () => {
  const stats = [
    { id: 1, label: 'Envíos Exitosos', value: '1,284', change: '+12%', icon: '📦', color: 'var(--accent)' },
    { id: 2, label: 'Repartidores Activos', value: '42', change: '+5', icon: '🚴', color: 'var(--secondary)' },
    { id: 3, label: 'Intercepciones IA', value: '156', change: '+24%', icon: '🛡️', color: 'var(--danger)' },
    { id: 4, label: 'Ingresos Totales', value: 'S/ 15,420', change: '+8%', icon: '💰', color: '#10b981' },
  ];

  return (
    <div className="stats-grid">
      {stats.map((stat) => (
        <div key={stat.id} className="stat-card glass-panel animate-fade-in" style={{ '--delay': `${stat.id * 0.1}s` }}>
          <div className="stat-icon" style={{ backgroundColor: `${stat.color}22`, color: stat.color }}>
            {stat.icon}
          </div>
          <div className="stat-info">
            <h4 className="stat-label">{stat.label}</h4>
            <div className="stat-value-row">
              <span className="stat-value">{stat.value}</span>
              <span className={`stat-change ${stat.change.includes('+') ? 'up' : 'down'}`}>
                {stat.change}
              </span>
            </div>
          </div>
          <div className="stat-glow" style={{ backgroundColor: stat.color }}></div>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;
