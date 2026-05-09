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

interface FlowDistributionChartProps {
  hours: number[];
  depthsBottom: number[];
  depthsBit: number[];
  maxFlows: number[];
  targetFlows?: { depth_bins: number[]; target_flows: number[] };
  title?: string;
  height?: number;
}

export const FlowDistributionChart: React.FC<FlowDistributionChartProps> = ({
  hours,
  depthsBottom,
  depthsBit,
  maxFlows,
  targetFlows,
  title = 'Распределение расхода по глубине',
  height = 400
}) => {
  const chartRef = useRef<any>(null);

  if (!hours.length || !depthsBottom.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Нет данных для отображения
      </div>
    );
  }

  const daysLabels = hours.map(h => (h / 24).toFixed(1));

  // Создаем массив целевого расхода, соответствующий каждому часу (на основе глубины)
  let targetFlowByHour: (number | null)[] = new Array(hours.length).fill(null);
  
  if (targetFlows && targetFlows.depth_bins && targetFlows.target_flows) {
    const { depth_bins, target_flows } = targetFlows;
    
    for (let i = 0; i < hours.length; i++) {
      const currentDepth = depthsBottom[i];
      // Находим соответствующий интервал глубины
      let targetValue = null;
      for (let j = 0; j < depth_bins.length; j++) {
        const binStart = depth_bins[j];
        const binEnd = j < depth_bins.length - 1 ? depth_bins[j + 1] : Infinity;
        if (currentDepth >= binStart && currentDepth < binEnd) {
          targetValue = target_flows[j];
          break;
        }
      }
      targetFlowByHour[i] = targetValue;
    }
  }

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
      yAxisID: 'y',
    },
    {
      label: 'Глубина долота (м)',
      data: depthsBit,
      borderColor: '#ff9800',
      backgroundColor: 'rgba(255, 152, 0, 0.1)',
      borderWidth: 2,
      fill: false,
      tension: 0.2,
      pointRadius: 1,
      pointHoverRadius: 5,
      borderDash: [5, 5],
      yAxisID: 'y',
    },
    {
      label: 'Макс. расход (л/с)',
      data: maxFlows,
      borderColor: '#4caf50',
      backgroundColor: 'rgba(76, 175, 80, 0.1)',
      borderWidth: 2,
      fill: false,
      tension: 0.2,
      pointRadius: 2,
      pointHoverRadius: 6,
      yAxisID: 'y1',
    }
  ];

  // Добавляем линию целевого расхода (ступенчатая)
  if (targetFlowByHour.some(v => v !== null)) {
    datasets.push({
      label: 'Целевой расход (л/с)',
      data: targetFlowByHour,
      borderColor: '#f44336',
      backgroundColor: 'rgba(244, 67, 54, 0.1)',
      borderWidth: 2.5,
      fill: false,
      tension: 0,
      pointRadius: 0,
      pointHoverRadius: 0,
      borderDash: [8, 4],
      yAxisID: 'y1',
      stepped: true,
    });
  }

  const chartData = {
    labels: daysLabels,
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
            if (value === null) return null;
            if (label.includes('Глубина')) {
              return `${label}: ${Math.round(value)} м`;
            }
            if (label.includes('Расход')) {
              return `${label}: ${value.toFixed(1)} л/с`;
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
      },
      y1: {
        title: {
          display: true,
          text: 'Расход (л/с)',
          color: '#4caf50',
          font: { size: 11 }
        },
        ticks: { font: { size: 10 }, color: '#4caf50' },
        position: 'right' as const,
        min: 0,
        grid: { drawOnChartArea: false },
      }
    }
  };

  return (
    <div style={{ height, width: '100%' }}>
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  );
};