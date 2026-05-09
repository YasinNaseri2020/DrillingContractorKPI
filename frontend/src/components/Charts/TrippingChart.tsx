import React, { useRef, useEffect, useState } from 'react';
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

interface TrippingChartProps {
  seconds: number[];
  blockPositions: number[];
  hookloads: number[];
  flowRates: number[];
  pressures: number[];
  startSecond?: number;
  endSecond?: number;
  title?: string;
  height?: number;
}

export const TrippingChart: React.FC<TrippingChartProps> = ({
  seconds,
  blockPositions,
  hookloads,
  flowRates,
  pressures,
  startSecond = 0,
  endSecond,
  title,
  height = 400
}) => {
  const chartRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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

  if (!seconds.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Нет данных для отображения
      </div>
    );
  }

  const datasets = [
    {
      label: 'Положение талевого блока (м)',
      data: blockPositions,
      borderColor: '#9c27b0',
      backgroundColor: 'rgba(156, 39, 176, 0.1)',
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 5,
      tension: 0.1,
      fill: false,
      yAxisID: 'y',
    },
    {
      label: 'Вес на крюке (т)',
      data: hookloads,
      borderColor: '#ff9800',
      backgroundColor: 'rgba(255, 152, 0, 0.1)',
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 5,
      tension: 0.1,
      fill: false,
      yAxisID: 'y',
    },
    {
      label: 'Расход (л/с)',
      data: flowRates,
      borderColor: '#2196f3',
      backgroundColor: 'rgba(33, 150, 243, 0.1)',
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 5,
      tension: 0.1,
      fill: false,
      yAxisID: 'y1',
    },
    {
      label: 'Давление (атм)',
      data: pressures,
      borderColor: '#f44336',
      backgroundColor: 'rgba(244, 67, 54, 0.1)',
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 5,
      tension: 0.1,
      fill: false,
      yAxisID: 'y1',
    }
  ];

  const chartData = {
    labels: seconds.map(s => s.toFixed(0)),
    datasets
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = context.raw;
            if (value === null || value === undefined) return null;
            if (label === 'Положение талевого блока (м)') {
              return `${label}: ${value.toFixed(2)} м`;
            }
            if (label === 'Вес на крюке (т)') {
              return `${label}: ${value.toFixed(1)} т`;
            }
            if (label === 'Расход (л/с)') {
              return `${label}: ${value.toFixed(1)} л/с`;
            }
            if (label === 'Давление (атм)') {
              return `${label}: ${value.toFixed(1)} атм`;
            }
            return `${label}: ${value}`;
          }
        }
      },
      legend: {
        position: 'top' as const,
        labels: { font: { size: 10 }, boxWidth: 12 }
      },
      title: title ? {
        display: true,
        text: title,
        font: { size: 12, weight: 'bold' }
      } : {}
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Время (сек)',
          font: { size: 10 }
        },
        ticks: { font: { size: 9 } }
      },
      y: {
        title: {
          display: true,
          text: 'Положение (м) / Вес (т)',
          color: '#ff9800',
          font: { size: 10 }
        },
        ticks: { font: { size: 9 } },
        min: 0,
      },
      y1: {
        title: {
          display: true,
          text: 'Расход (л/с) / Давление (атм)',
          color: '#2196f3',
          font: { size: 10 }
        },
        ticks: { font: { size: 9 }, color: '#2196f3' },
        position: 'right' as const,
        min: 0,
        grid: { drawOnChartArea: false },
      }
    }
  };

  // Расчёт позиций для вертикальных линий
  const maxSeconds = Math.max(...seconds);
  const minSeconds = Math.min(...seconds);
  const timeRange = maxSeconds - minSeconds;
  
  const getLeftPercent = (second: number) => {
    if (timeRange === 0) return 0;
    return ((second - minSeconds) / timeRange) * 100;
  };

  const startLeft = getLeftPercent(startSecond);
  const endLeft = endSecond !== undefined && endSecond !== null ? getLeftPercent(endSecond) : null;

  return (
    <div ref={containerRef} style={{ height, width: '100%', position: 'relative' }}>
      <Line ref={chartRef} data={chartData} options={options} />
      
      {/* SVG слой для вертикальных линий */}
      {dimensions.width > 0 && dimensions.height > 0 && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none'
          }}
        >
          {/* Линия начала наращивания */}
          <line
            x1={`${startLeft}%`}
            y1="5%"
            x2={`${startLeft}%`}
            y2="95%"
            stroke="black"
            strokeWidth="2"
            strokeDasharray="8,4"
          />
          <text
            x={`${startLeft + 0.5}%`}
            y="8%"
            fill="black"
            fontSize="11"
            fontWeight="bold"
          >
            Начало наращивания
          </text>
          
          {/* Линия окончания наращивания */}
          {endLeft !== null && (
            <>
              <line
                x1={`${endLeft}%`}
                y1="5%"
                x2={`${endLeft}%`}
                y2="95%"
                stroke="black"
                strokeWidth="2"
                strokeDasharray="8,4"
              />
              <text
                x={`${endLeft + 0.5}%`}
                y="92%"
                fill="black"
                fontSize="11"
                fontWeight="bold"
              >
                Окончание наращивания
              </text>
            </>
          )}
        </svg>
      )}
    </div>
  );
};