import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';

interface DualLineChartProps {
  data: Array<{ seconds: number; flow: number; pressure: number }>;
  title?: string;
  height?: number;
  targetValue?: number | null;
  targetLabel?: string;
}

export const DualLineChart: React.FC<DualLineChartProps> = ({ 
  data, 
  title, 
  height = 400,
  targetValue = null,
  targetLabel = 'Целевой расход'
}) => {
  if (!data || data.length === 0) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Нет данных для графика</div>;
  }
  
  return (
    <div style={{ width: '100%', height }}>
      {title && <h3 style={{ textAlign: 'center', marginBottom: 16 }}>{title}</h3>}
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="seconds" label={{ value: 'Время (сек)', position: 'insideBottom', offset: -5 }} />
          <YAxis yAxisId="left" label={{ value: 'Расход (л/с)', angle: -90, position: 'insideLeft' }} />
          <YAxis yAxisId="right" orientation="right" label={{ value: 'Давление (атм)', angle: 90, position: 'insideRight' }} />
          <Tooltip />
          <Legend />
          {targetValue && (
            <ReferenceLine y={targetValue} yAxisId="left" stroke="#4caf50" strokeDasharray="5 5" label={targetLabel} />
          )}
          <Line type="monotone" dataKey="flow" name="Расход (л/с)" stroke="#2196f3" strokeWidth={2} dot={false} yAxisId="left" />
          <Line type="monotone" dataKey="pressure" name="Давление (атм)" stroke="#f44336" strokeWidth={2} dot={false} yAxisId="right" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
