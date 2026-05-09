import React, { useRef } from 'react';
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

interface CirculationChartProps {
  seconds: number[];
  flows: number[];
  pressures: number[];
  targetFlow: number;
  targetReachedSec: number | null;
  flowAngle: number;
  pressAngle: number;
  surgeZoneSeconds?: number;
  title?: string;
  height?: number;
  width?: number;
}

export const CirculationChart: React.FC<CirculationChartProps> = ({
  seconds,
  flows,
  pressures,
  targetFlow,
  targetReachedSec,
  flowAngle,
  pressAngle,
  surgeZoneSeconds = 20,
  title,
  height = 400,
  width
}) => {
  const chartRef = useRef<any>(null);

  if (!seconds.length || !flows.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Нет данных для отображения
      </div>
    );
  }

  // Находим индекс конца зоны скачка
  let surgeEndIndex = seconds.length - 1;
  for (let i = 0; i < seconds.length; i++) {
    if (seconds[i] >= surgeZoneSeconds) {
      surgeEndIndex = i;
      break;
    }
  }

  // Заливка зоны скачка
  const surgeFill = new Array(seconds.length).fill(null);
  for (let i = 0; i <= surgeEndIndex; i++) {
    surgeFill[i] = flows[i];
  }

  // Линии тренда в зоне скачка
  let trendFlow: number[] = [];
  let trendPress: number[] = [];
  
  if (surgeEndIndex > 1 && flowAngle && pressAngle) {
    const slopeFlow = Math.tan(flowAngle * Math.PI / 180);
    const slopePress = Math.tan(pressAngle * Math.PI / 180);
    const startFlow = flows[0] || 0;
    const startPress = pressures[0] || 0;
    
    for (let i = 0; i <= surgeEndIndex; i++) {
      trendFlow.push(startFlow + slopeFlow * seconds[i]);
      trendPress.push(startPress + slopePress * seconds[i]);
    }
  }

  // Отметка достижения цели
  const targetReachedMarkers = new Array(seconds.length).fill(null);
  if (targetReachedSec) {
    const targetIndex = seconds.findIndex(s => s >= targetReachedSec);
    if (targetIndex !== -1) {
      targetReachedMarkers[targetIndex] = flows[targetIndex];
    }
  }

  const datasets: any[] = [
    {
      label: 'Расход (л/с)',
      data: flows,
      borderColor: '#2196f3',
      backgroundColor: 'rgba(33, 150, 243, 0.1)',
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 5,
      tension: 0.1,
      fill: false,
      yAxisID: 'y',
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
    },
    {
      label: `Целевой расход (${targetFlow} л/с)`,
      data: new Array(seconds.length).fill(targetFlow),
      borderColor: '#4caf50',
      borderWidth: 2,
      borderDash: [5, 5],
      pointRadius: 0,
      fill: false,
      yAxisID: 'y',
    },
    {
      label: `Зона скачка (0-${surgeZoneSeconds} с)`,
      data: surgeFill,
      borderColor: 'rgba(255, 165, 0, 0)',
      backgroundColor: 'rgba(255, 165, 0, 0.15)',
      borderWidth: 0,
      pointRadius: 0,
      fill: true,
      yAxisID: 'y',
    }
  ];

  // Добавляем линии тренда, если есть
  if (trendFlow.length > 0) {
    datasets.push({
      label: `Тренд расхода (${Math.round(flowAngle)}°)`,
      data: trendFlow,
      borderColor: '#1565c0',
      borderWidth: 2,
      borderDash: [6, 4],
      pointRadius: 0,
      fill: false,
      yAxisID: 'y',
    });
  }

  if (trendPress.length > 0) {
    datasets.push({
      label: `Тренд давления (${Math.round(pressAngle)}°)`,
      data: trendPress,
      borderColor: '#c62828',
      borderWidth: 2,
      borderDash: [6, 4],
      pointRadius: 0,
      fill: false,
      yAxisID: 'y1',
    });
  }

  // Добавляем отметку достижения цели (упрощенная версия без pointBorderColor)
  if (targetReachedSec) {
    datasets.push({
      label: `Достижение цели (${targetReachedSec} с)`,
      data: targetReachedMarkers,
      borderColor: '#ff9800',
      backgroundColor: '#ff9800',
      borderWidth: 0,
      pointRadius: 6,
      pointHoverRadius: 9,
      fill: false,
      yAxisID: 'y',
    });
  }

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: any) => {
            let label = context.dataset.label || '';
            label += ': ';
            label += context.raw?.toFixed(1) || '0';
            if (context.dataset.label?.includes('Расход')) label += ' л/с';
            if (context.dataset.label?.includes('Давление')) label += ' атм';
            return label;
          }
        }
      },
      legend: {
        position: 'top' as const,
        labels: {
          font: { size: 10 },
          boxWidth: 12,
        }
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
          text: 'Расход (л/с)',
          color: '#2196f3',
          font: { size: 10 }
        },
        ticks: { font: { size: 9 }, color: '#2196f3' },
        min: 0,
      },
      y1: {
        title: {
          display: true,
          text: 'Давление (атм)',
          color: '#f44336',
          font: { size: 10 }
        },
        ticks: { font: { size: 9 }, color: '#f44336' },
        position: 'right' as const,
        min: 0,
        grid: { drawOnChartArea: false },
      }
    }
  };

  const style = width ? { width, height } : { height };

  return <Line ref={chartRef} data={{ labels: seconds.map(s => s.toFixed(0)), datasets }} options={options} style={style} />;
};