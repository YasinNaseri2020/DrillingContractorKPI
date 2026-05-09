import React, { useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface TrippingDistributionChartProps {
  depthBins: number[];
  counts: number[];
  title?: string;
  height?: number;
  onBarClick?: (binStart: number, binEnd: number) => void;
}

export const TrippingDistributionChart: React.FC<TrippingDistributionChartProps> = ({
  depthBins,
  counts,
  title = 'Распределение наращиваний по глубине долота',
  height = 400,
  onBarClick
}) => {
  const chartRef = useRef<any>(null);

  if (!depthBins.length || !counts.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Нет данных для отображения
      </div>
    );
  }

  const labels = depthBins.map((bin, idx) => {
    const nextBin = depthBins[idx + 1];
    if (nextBin) {
      return `${bin}-${nextBin} м`;
    }
    return `${bin}+ м`;
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Количество наращиваний',
        data: counts,
        backgroundColor: 'rgba(33, 150, 243, 0.7)',
        borderColor: '#1976d2',
        borderWidth: 1,
        borderRadius: 6,
        barPercentage: 0.9,
        categoryPercentage: 0.8
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event: any, activeElements: any[]) => {
      if (activeElements && activeElements.length > 0 && onBarClick) {
        const index = activeElements[0].index;
        const binStart = depthBins[index];
        const binEnd = depthBins[index + 1] || Infinity;
        onBarClick(binStart, binEnd);
      }
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `Наращиваний: ${context.raw}`;
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
          text: 'Интервал глубины долота (м)',
          font: { size: 11 }
        },
        ticks: {
          maxRotation: 45,
          autoSkip: true,
          maxTicksLimit: 15,
          font: { size: 10 }
        }
      },
      y: {
        title: {
          display: true,
          text: 'Количество наращиваний',
          font: { size: 11 }
        },
        ticks: {
          stepSize: 1,
          font: { size: 10 }
        },
        beginAtZero: true
      }
    }
  };

  return (
    <div style={{ height, width: '100%' }}>
      <Bar ref={chartRef} data={chartData} options={options} />
    </div>
  );
};