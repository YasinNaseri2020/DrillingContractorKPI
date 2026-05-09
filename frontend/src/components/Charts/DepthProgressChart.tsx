import React, { useRef, useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DepthProgressChartProps {
  hours: number[];
  depthsBottom: number[];
  depthsBit?: number[];
  startups?: Array<{
    startup_number: number;
    depth_bottom: number;
    time_days: number;
    quality_score: number;
  }>;
  markers?: Array<{
    time_hours: number;
    depth: number;
    label?: string;
    color?: string;
  }>;
  onSelection?: (selection: { timeMinHours: number; timeMaxHours: number; depthMin: number; depthMax: number }) => void;
  title?: string;
  height?: number;
  showMarkerLabels?: boolean;
}

export const DepthProgressChart: React.FC<DepthProgressChartProps> = ({
  hours,
  depthsBottom,
  depthsBit = [],
  startups = [],
  markers = [],
  onSelection,
  title = 'Прогресс бурения',
  height = 400,
  showMarkerLabels = false
}) => {
  const chartRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [enableSelection, setEnableSelection] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  if (!hours.length || !depthsBottom.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Нет данных для отображения
      </div>
    );
  }

  const daysLabels = hours.map(h => (h / 24).toFixed(1));

  const datasets: any[] = [
    {
      label: 'Глубина забоя (м)',
      data: depthsBottom,
      borderColor: '#1a73e8',
      backgroundColor: 'rgba(26, 115, 232, 0.1)',
      borderWidth: 2.5,
      fill: true,
      tension: 0.2,
      pointRadius: 1,
      pointHoverRadius: 5,
    }
  ];

  if (depthsBit.length && depthsBit.some(d => d !== null && d !== undefined && !isNaN(d) && d > 0)) {
    datasets.push({
      label: 'Глубина долота (м)',
      data: depthsBit,
      borderColor: '#ff9800',
      backgroundColor: 'rgba(255, 152, 0, 0.1)',
      borderWidth: 2,
      fill: false,
      tension: 0.2,
      pointRadius: 1,
      pointHoverRadius: 5,
      borderDash: [5, 5]
    });
  }

  // Поддержка startups (для циркуляции) и markers (для наращивания)
  if (startups.length) {
    const startupPoints = hours.map((hour, idx) => {
      const hourInDays = hour / 24;
      const startup = startups.find(s => Math.abs(s.time_days - hourInDays) < 0.5);
      return startup ? depthsBottom[idx] : null;
    });
    
    const startupQualities = hours.map((hour) => {
      const hourInDays = hour / 24;
      const startup = startups.find(s => Math.abs(s.time_days - hourInDays) < 0.5);
      return startup ? startup.quality_score : null;
    });

    datasets.push({
      label: 'Запуски циркуляции',
      data: startupPoints,
      borderColor: '#9c27b0',
      backgroundColor: startupQualities.map(q => 
        q ? (q >= 70 ? '#4caf50' : q >= 50 ? '#ff9800' : '#f44336') : 'transparent'
      ),
      borderWidth: 0,
      pointRadius: 6,
      pointHoverRadius: 9,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      fill: false,
    });
  }

  // Маркеры для наращиваний
  if (markers.length) {
    const markerPoints = hours.map((hour, idx) => {
      const marker = markers.find(m => Math.abs(m.time_hours - hour) < 0.5);
      return marker ? depthsBottom[idx] : null;
    });
    
    const markerColors = hours.map((hour) => {
      const marker = markers.find(m => Math.abs(m.time_hours - hour) < 0.5);
      return marker?.color || '#9c27b0';
    });

    datasets.push({
      label: 'Наращивания',
      data: markerPoints,
      borderColor: 'transparent',
      backgroundColor: markerColors,
      borderWidth: 0,
      pointRadius: 6,
      pointHoverRadius: 9,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      fill: false,
    });
  }

  const chartData = {
    labels: daysLabels,
    datasets
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!enableSelection || !onSelection) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsSelecting(true);
    setSelectionStart({ x, y });
    setSelectionEnd({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !enableSelection) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSelectionEnd({ x, y });
  };

  const handleMouseUp = () => {
    if (!isSelecting || !enableSelection || !selectionStart || !selectionEnd) {
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
      return;
    }
    
    const chart = chartRef.current;
    if (chart && onSelection) {
      const xMin = Math.min(selectionStart.x, selectionEnd.x);
      const xMax = Math.max(selectionStart.x, selectionEnd.x);
      
      const xAxis = chart.scales.x;
      const yAxis = chart.scales.y;
      
      const timeMinHours = xAxis.getValueForPixel(xMin) * 24;
      const timeMaxHours = xAxis.getValueForPixel(xMax) * 24;
      const depthMin = yAxis.getValueForPixel(yAxis.bottom);
      const depthMax = yAxis.getValueForPixel(yAxis.top);
      
      onSelection({
        timeMinHours: Math.max(0, timeMinHours),
        timeMaxHours: Math.max(0, timeMaxHours),
        depthMin: Math.max(0, Math.min(depthMin, depthMax)),
        depthMax: Math.max(0, Math.max(depthMin, depthMax))
      });
    }
    
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const getSelectionBox = () => {
    if (!isSelecting || !selectionStart || !selectionEnd) return null;
    
    const left = Math.min(selectionStart.x, selectionEnd.x);
    const top = Math.min(selectionStart.y, selectionEnd.y);
    const width = Math.abs(selectionEnd.x - selectionStart.x);
    const height = Math.abs(selectionEnd.y - selectionStart.y);
    
    if (width < 5 && height < 5) return null;
    if (isNaN(left) || isNaN(top) || isNaN(width) || isNaN(height)) return null;
    
    return { left, top, width, height };
  };

  const selectionBox = getSelectionBox();

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = context.raw;
            if (value === null) return null;
            if (label === 'Запуски циркуляции' || label === 'Наращивания') {
              const hourIndex = context.dataIndex;
              const hour = hours[hourIndex];
              const marker = markers.find(m => Math.abs(m.time_hours - hour) < 0.5);
              if (marker && marker.label) {
                return [`${marker.label}`, `Глубина: ${Math.round(value)} м`];
              }
              return `Событие на глубине ${Math.round(value)} м`;
            }
            if (label.includes('Глубина')) {
              return `${label}: ${Math.round(value)} м`;
            }
            return `${label}: ${value}`;
          }
        }
      },
      legend: {
        position: 'top' as const,
        labels: { font: { size: 11 }, boxWidth: 14 }
      },
      title: {
        display: true,
        text: title,
        font: { size: 13, weight: 'bold' }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Время (сутки)',
          font: { size: 11 }
        },
        ticks: { font: { size: 10 } }
      },
      y: {
        title: {
          display: true,
          text: 'Глубина (м)',
          font: { size: 11 }
        },
        ticks: { font: { size: 10 } },
        reverse: true,
        min: 0
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      style={{ height, width: '100%', position: 'relative' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <Line ref={chartRef} data={chartData} options={options} />
      
      {selectionBox && (
        <div
          style={{
            position: 'absolute',
            left: selectionBox.left,
            top: selectionBox.top,
            width: selectionBox.width,
            height: selectionBox.height,
            border: '2px solid #1a73e8',
            backgroundColor: 'rgba(26, 115, 232, 0.15)',
            pointerEvents: 'none'
          }}
        />
      )}
      
      {onSelection && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button
            onClick={() => {
              setEnableSelection(!enableSelection);
              if (enableSelection) {
                setIsSelecting(false);
                setSelectionStart(null);
                setSelectionEnd(null);
              }
            }}
            style={{
              padding: '6px 16px',
              fontSize: 12,
              background: enableSelection ? '#1a73e8' : '#e0e0e0',
              color: enableSelection ? 'white' : '#666',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            {enableSelection ? '🔴 Выделите интервал мышью' : '📊 Выбрать интервал на графике'}
          </button>
        </div>
      )}
    </div>
  );
};