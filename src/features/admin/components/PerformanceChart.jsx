import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const data = [
  { name: 'Lun', totales: 400, interceptados: 24 },
  { name: 'Mar', totales: 300, interceptados: 13 },
  { name: 'Mie', totales: 550, interceptados: 98 },
  { name: 'Jue', totales: 278, interceptados: 39 },
  { name: 'Vie', totales: 189, interceptados: 48 },
  { name: 'Sab', totales: 239, interceptados: 38 },
  { name: 'Dom', totales: 349, interceptados: 43 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel" style={{ padding: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <p className="mono" style={{ margin: '0 0 5px 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{label}</p>
        <p style={{ margin: 0, color: '#22d3ee', fontSize: '0.9rem', fontWeight: 700 }}>
          Totales: {payload[0].value}
        </p>
        <p style={{ margin: 0, color: '#ef4444', fontSize: '0.9rem', fontWeight: 700 }}>
          Interceptados: {payload[1].value}
        </p>
      </div>
    );
  }
  return null;
};

const PerformanceChart = () => {
  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="rgba(255,255,255,0.4)" 
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} 
            axisLine={false} 
            tickLine={false} 
            dy={10}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.4)" 
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} 
            axisLine={false} 
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <Line 
            type="monotone" 
            dataKey="totales" 
            name="Mensajes Totales" 
            stroke="#22d3ee" 
            strokeWidth={3} 
            dot={{ r: 4, fill: '#0f172a', strokeWidth: 2 }} 
            activeDot={{ r: 6, stroke: '#22d3ee', strokeWidth: 2, fill: '#0f172a' }} 
          />
          <Line 
            type="monotone" 
            dataKey="interceptados" 
            name="Mensajes Interceptados" 
            stroke="#ef4444" 
            strokeWidth={3} 
            dot={{ r: 4, fill: '#0f172a', strokeWidth: 2 }} 
            activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2, fill: '#0f172a' }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PerformanceChart;
