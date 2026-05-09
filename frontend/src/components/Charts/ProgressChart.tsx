import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface ProgressChartProps {
  data: Array<{ timestamp: string; depth_bottom: number; depth_bit?: number }>;
  title?: string;
  height?: number;
}

export const ProgressChart: React.FC<ProgressChartProps> = ({ data, title, height = 400 }) => {
  if (!data || data.length === 0) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Нет данных для графика</div>;
  }
  
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${date.getDate()}.${date.getMonth() + 1}`;
  };

  return (
    <div style={{ width: '100%', height }}>
      {title && <h3 style={{ textAlign: 'center', marginBottom: 16 }}>{title || 'Прогресс бурения'}</h3>}
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={formatDate}
            label={{ value: 'Дата', position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            label={{ value: 'Глубина (м)', angle: -90, position: 'insideLeft' }}
            reversed
          />
          <Tooltip 
            formatter={(value) => [`${value} м`, 'Глубина']}
            labelFormatter={(label) => `Дата: ${new Date(label).toLocaleDateString()}`}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="depth_bottom" 
            name="Глубина забоя"
            stroke="#1a73e8" 
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="depth_bit" 
            name="Глубина долота"
            stroke="#ff9800" 
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
