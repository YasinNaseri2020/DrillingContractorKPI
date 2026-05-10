import React, { useEffect, useState } from 'react';
import {
  Box, CircularProgress, Typography, Paper, IconButton, Slider, Button
} from '@mui/material';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CloseIcon from '@mui/icons-material/Close';
import ReactECharts from 'echarts-for-react';
import { api } from '../../services/api';

interface GTIChartViewerProps {
  wellId: number;
  onClose: () => void;
}

// Конфигурация параметров для каждой диаграммы
const chartConfigs = [
  {
    title: 'Глубины',
    parameters: [
      { name: 'Глубина долота', unit: 'м', min: 0, max: 4000, color: '#f44336', dataKey: 'depth_bit' },
      { name: 'Глубина забоя', unit: 'м', min: 0, max: 4000, color: '#2196f3', dataKey: 'depth_bottom' },
      { name: 'Положение ТБ', unit: 'м', min: 0, max: 40, color: '#ffc107', dataKey: 'block_position' }
    ]
  },
  {
    title: 'Гидравлика',
    parameters: [
      { name: 'Расход на входе', unit: 'л/с', min: 0, max: 400, color: '#4caf50', dataKey: 'flow_rate_in' },
      { name: 'Давление на входе', unit: 'атм', min: 0, max: 400, color: '#9c27b0', dataKey: 'pressure_in' }
    ]
  },
  {
    title: 'Буровые параметры',
    parameters: [
      { name: 'Нагрузка на долото', unit: 'т', min: 0, max: 40, color: '#795548', dataKey: 'weight_on_bit' },
      { name: 'Мех. скорость', unit: 'м/ч', min: 0, max: 200, color: '#00bcd4', dataKey: 'rop' },
      { name: 'Объем в емкостях', unit: 'м³', min: 0, max: 300, color: '#ff9800', dataKey: 'tank_volume_total' },
      { name: 'Вес на крюке', unit: 'т', min: 0, max: 200, color: '#e91e63', dataKey: 'hookload' }
    ]
  },
  {
    title: 'ВСП',
    parameters: [
      { name: 'Обороты ВСП', unit: 'об/мин', min: 0, max: 200, color: '#9e9e9e', dataKey: 'rpm' },
      { name: 'Крутящий момент', unit: 'кН·м', min: 0, max: 50, color: '#212121', dataKey: 'torque' }
    ]
  }
];

export const GTIChartViewer: React.FC<GTIChartViewerProps> = ({ wellId, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [startSeconds, setStartSeconds] = useState(0);
  const [data, setData] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [totalHours, setTotalHours] = useState(0);
  const [currentDate, setCurrentDate] = useState<string>('');
  const [tempStartSeconds, setTempStartSeconds] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  
  const DURATION_SECONDS = 3600;

  useEffect(() => {
    loadData();
  }, [wellId, startSeconds]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await api.getGtiChartData(wellId, startSeconds, DURATION_SECONDS);
      setData(result.items || []);
      setHasMore(result.has_more || false);
      if (result.total_seconds) {
        setTotalHours(Math.ceil(result.total_seconds / 3600));
      }
      // Устанавливаем текущую дату из первой записи
      if (result.items && result.items.length > 0 && result.items[0].timestamp) {
        const date = new Date(result.items[0].timestamp);
        setCurrentDate(`${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const maxAllowedHour = Math.max(0, totalHours - 1);

  const handlePrevHour = () => {
    const currentHourVal = Math.floor(startSeconds / 3600);
    if (currentHourVal > 0) {
      setStartSeconds((currentHourVal - 1) * 3600);
    }
  };

  const handleNextHour = () => {
    const currentHourVal = Math.floor(startSeconds / 3600);
    if (currentHourVal + 1 <= maxAllowedHour && hasMore) {
      setStartSeconds((currentHourVal + 1) * 3600);
    }
  };

  const handleSliderChange = (_: Event, newValue: number | number[]) => {
    let newSeconds = (newValue as number) * 3600;
    if (newSeconds > maxAllowedHour * 3600) {
      newSeconds = maxAllowedHour * 3600;
    }
    setTempStartSeconds(newSeconds);
    setHasChanges(true);
  };

  const handleApplyChanges = () => {
    if (hasChanges) {
      const validSeconds = Math.min(tempStartSeconds, maxAllowedHour * 3600);
      setStartSeconds(validSeconds);
      setHasChanges(false);
    }
  };

  if (loading && data.length === 0) {
    return (
      <Paper sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  // Формируем метки времени (только ЧЧ:ММ, каждые 5 минут)
  const timeLabels = data.map((d, index) => {
    const totalSeconds = d.seconds;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    // Показываем метку каждые 5 минут (300 секунд)
    const isEvery5Minutes = Math.floor(totalSeconds / 300) === totalSeconds / 300;
    const isFirst = index === 0;
    const isLast = index === data.length - 1;
    
    if (!isEvery5Minutes && !isFirst && !isLast) {
      return '';
    }
    
    // Только время, без даты
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  });

  // Базовые опции для всех графиков
  const getBaseOptions = (showYAxis: boolean) => ({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        if (!params || params.length === 0) return '';
        const timeIndex = params[0].dataIndex;
        const timeLabel = timeLabels[timeIndex];
        let result = `<b>Время: ${timeLabel}</b><br/>`;
        params.forEach((p: any) => {
          const value = p.value;
          if (value !== null && !isNaN(value)) {
            result += `${p.marker} ${p.seriesName}: ${value.toFixed(1)}<br/>`;
          }
        });
        return result;
      }
    },
    grid: {
      left: '8%',
      right: '8%',
      top: '12%',
      bottom: showYAxis ? '8%' : '12%',
      containLabel: true
    },
    yAxis: {
      type: 'category',
      data: timeLabels,
      name: showYAxis ? 'Время' : '',
      nameLocation: 'middle',
      nameGap: 40,
      axisLabel: showYAxis ? { fontSize: 9, interval: 0 } : { show: false },
      axisTick: { show: false },
      axisLine: { show: showYAxis },
      inverse: true,
      splitLine: { show: false }
    },
    xAxis: {
      type: 'value',
      nameLocation: 'middle',
      nameGap: 30,
      nameTextStyle: { fontSize: 9 },
      axisLabel: { fontSize: 8 },
      splitLine: { show: true, lineStyle: { type: 'dashed', color: '#ccc' } },
    },
    legend: {
      show: true,
      type: 'scroll',
      orient: 'vertical',
      right: 0,
      top: 'middle',
      itemWidth: 20,
      itemHeight: 12,
      textStyle: { fontSize: 9 },
      pageIconColor: '#1a73e8',
      pageTextStyle: { fontSize: 9 }
    },
    toolbox: {
      show: true,
      feature: {
        dataZoom: { yAxisIndex: 0, title: { zoom: 'Масштаб', back: 'Сброс' } },
        restore: { title: 'Сбросить' },
        saveAsImage: { title: 'Сохранить' }
      },
      right: 10,
      top: 0
    },
    dataZoom: [
      { type: 'inside', yAxisIndex: 0, start: 0, end: 100, zoomOnMouseWheel: true, moveOnMouseMove: true },
      { type: 'slider', yAxisIndex: 0, start: 0, end: 100, right: 8, width: 12, handleSize: '80%' }
    ]
  });

  // Опции для графиков с series
  const getChartOptions = (config: typeof chartConfigs[0], showYAxis: boolean) => {
    const series = config.parameters.map(param => ({
      name: `${param.name} (${param.min}-${param.max} ${param.unit})`,
      type: 'line',
      data: data.map(d => {
        const value = d[param.dataKey];
        return value !== null && !isNaN(value) ? Number(value.toFixed(1)) : null;
      }),
      lineStyle: { color: param.color, width: 1.5 },
      symbol: 'none',
      smooth: false,
      connectNulls: true,
    }));

    return {
      ...getBaseOptions(showYAxis),
      xAxis: {
        type: 'value',
        name: config.parameters.map(p => `${p.name} (${p.unit})`).join(' / '),
        nameLocation: 'middle',
        nameGap: 35,
        nameTextStyle: { fontSize: 9, fontWeight: 'bold' },
        axisLabel: { fontSize: 8, rotate: 0 },
        splitLine: { show: true, lineStyle: { type: 'dashed', color: '#ccc' } },
      },
      series: series,
    };
  };

  const currentHour = Math.floor(startSeconds / 3600);
  const displayHour = hasChanges ? Math.floor(tempStartSeconds / 3600) : currentHour;

  return (
    <Paper sx={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      zIndex: 1300, 
      bgcolor: '#fff', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Заголовок */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        p: 1.5, 
        borderBottom: '1px solid #e0e0e0',
        flexShrink: 0,
        bgcolor: '#f5f5f5'
      }}>
        <Typography variant="h6">📊 Просмотр ГТИ данных</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Навигация по времени */}
      <Box sx={{ 
        p: 1.5, 
        borderBottom: '1px solid #e0e0e0',
        flexShrink: 0,
        bgcolor: '#fff'
      }}>
        {/* Дата один раз сверху */}
        {currentDate && (
          <Typography variant="body2" sx={{ mb: 1, textAlign: 'center', color: '#666' }}>
            📅 Дата: {currentDate}
          </Typography>
        )}
        
        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
          Навигация по времени (часы от начала бурения)
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
          <IconButton onClick={handlePrevHour} disabled={startSeconds === 0} size="small">
            <ArrowBackIosIcon fontSize="small" />
          </IconButton>
          <Typography sx={{ minWidth: 130, textAlign: 'center', fontSize: 13, fontWeight: 'bold' }}>
            Час {displayHour} / {maxAllowedHour}
          </Typography>
          <IconButton onClick={handleNextHour} disabled={currentHour >= maxAllowedHour || !hasMore} size="small">
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Slider
            value={hasChanges ? tempStartSeconds / 3600 : startSeconds / 3600}
            onChange={handleSliderChange}
            min={0}
            max={maxAllowedHour}
            step={1}
            size="small"
            sx={{ flex: 1 }}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${v} ч`}
          />
          <Button
            variant="contained"
            size="small"
            onClick={handleApplyChanges}
            disabled={!hasChanges}
            sx={{ minWidth: 80, height: 36 }}
          >
            Применить
          </Button>
        </Box>
      </Box>

      {/* 4 графика в ряд на всю высоту */}
      {loading && (
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && data.length === 0 && (
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Typography>Нет данных за выбранный период</Typography>
        </Box>
      )}

      {!loading && data.length > 0 && (
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'row', 
          minHeight: 0,
          overflow: 'hidden'
        }}>
          {/* График 1 - Глубины (с осью Y) */}
          <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            borderRight: '1px solid #e0e0e0',
            minWidth: 0,
            height: '100%',
            p: 0.5
          }}>
            <Typography variant="subtitle2" sx={{ textAlign: 'center', fontWeight: 'bold', color: '#1a73e8', mb: 0.5, fontSize: '0.7rem' }}>
              {chartConfigs[0].title}
            </Typography>
            <ReactECharts
              option={getChartOptions(chartConfigs[0], true)}
              style={{ height: 'calc(100% - 28px)', width: '100%' }}
              theme="light"
              notMerge={false}
              lazyUpdate={true}
            />
          </Box>

          {/* График 2 - Гидравлика (без оси Y) */}
          <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            borderRight: '1px solid #e0e0e0',
            minWidth: 0,
            height: '100%',
            p: 0.5
          }}>
            <Typography variant="subtitle2" sx={{ textAlign: 'center', fontWeight: 'bold', color: '#1a73e8', mb: 0.5, fontSize: '0.7rem' }}>
              {chartConfigs[1].title}
            </Typography>
            <ReactECharts
              option={getChartOptions(chartConfigs[1], false)}
              style={{ height: 'calc(100% - 28px)', width: '100%' }}
              theme="light"
              notMerge={false}
              lazyUpdate={true}
            />
          </Box>

          {/* График 3 - Буровые параметры (без оси Y) */}
          <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            borderRight: '1px solid #e0e0e0',
            minWidth: 0,
            height: '100%',
            p: 0.5
          }}>
            <Typography variant="subtitle2" sx={{ textAlign: 'center', fontWeight: 'bold', color: '#1a73e8', mb: 0.5, fontSize: '0.7rem' }}>
              {chartConfigs[2].title}
            </Typography>
            <ReactECharts
              option={getChartOptions(chartConfigs[2], false)}
              style={{ height: 'calc(100% - 28px)', width: '100%' }}
              theme="light"
              notMerge={false}
              lazyUpdate={true}
            />
          </Box>

          {/* График 4 - ВСП (без оси Y) */}
          <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            minWidth: 0,
            height: '100%',
            p: 0.5
          }}>
            <Typography variant="subtitle2" sx={{ textAlign: 'center', fontWeight: 'bold', color: '#1a73e8', mb: 0.5, fontSize: '0.7rem' }}>
              {chartConfigs[3].title}
            </Typography>
            <ReactECharts
              option={getChartOptions(chartConfigs[3], false)}
              style={{ height: 'calc(100% - 28px)', width: '100%' }}
              theme="light"
              notMerge={false}
              lazyUpdate={true}
            />
          </Box>
        </Box>
      )}
    </Paper>
  );
};