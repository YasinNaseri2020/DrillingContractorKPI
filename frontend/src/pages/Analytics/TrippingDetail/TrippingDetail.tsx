import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, CircularProgress, Box, Button, Dialog, DialogTitle, DialogContent,
  IconButton, TableContainer, TablePagination
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import TimelineIcon from '@mui/icons-material/Timeline';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { api } from '../../../services/api';
import { TrippingChart } from '../../../components/Charts/TrippingChart';
import { DepthProgressChart } from '../../../components/Charts/DepthProgressChart';
import { TrippingDistributionChart } from '../../../components/Charts/TrippingDistributionChart';

interface TrippingData {
  tripping_number: number;
  timestamp_start: string;
  timestamp_end: string | null;
  depth_bottom: number;
  depth_bit: number;
  depth_bit_diff?: number;
  duration_seconds: number;
  weight_recovered: boolean;
  pump_started: boolean;
  is_loading?: boolean;
  quality_score: number;
}

const TrippingDetail: React.FC = () => {
  const { wellId } = useParams<{ wellId: string }>();
  const navigate = useNavigate();
  
  const [analysis, setAnalysis] = useState<any>(null);
  const [well, setWell] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTripping, setSelectedTripping] = useState<TrippingData | null>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [chartModalOpen, setChartModalOpen] = useState(false);
  
  const [progressData, setProgressData] = useState<any>(null);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [distributionData, setDistributionData] = useState<any>(null);
  const [distributionModalOpen, setDistributionModalOpen] = useState(false);
  const [wellStartTime, setWellStartTime] = useState<Date | null>(null);
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalRows, setTotalRows] = useState(0);
  const [allResults, setAllResults] = useState<TrippingData[]>([]);

  useEffect(() => {
    loadData(0, rowsPerPage);
    loadProgressData();
    loadDistributionData();
  }, [wellId, rowsPerPage]);

  const loadData = async (skip: number, limit: number) => {
    setLoading(true);
    try {
      const [analysisData, wellData] = await Promise.all([
        api.getTrippingAnalysis(Number(wellId), skip, limit),
        api.getWell(Number(wellId))
      ]);
      
      setWell(wellData);
      setTotalRows(analysisData?.total || 0);
      setWellStartTime(analysisData?.start_time ? new Date(analysisData.start_time) : null);
      
      const results = analysisData?.results || [];
      
      if (skip === 0) {
        setAllResults(results);
      } else {
        setAllResults(prev => [...(prev || []), ...results]);
      }
      
      setAnalysis(analysisData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadProgressData = async () => {
    try {
      const progress = await api.getWellProgress(Number(wellId));
      setProgressData(progress.progress);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDistributionData = async () => {
    try {
      const distribution = await api.getTrippingDistribution(Number(wellId), 50);
      setDistributionData(distribution);
    } catch (err) {
      console.error(err);
    }
  };

  const handleProgressSelection = (selection: { timeMinHours: number; timeMaxHours: number; depthMin: number; depthMax: number }) => {
    console.log('Выбран интервал:', selection);
    setProgressModalOpen(false);
  };

  const handleBarClick = (binStart: number, binEnd: number) => {
    console.log(`Фильтр по глубине: ${binStart}-${binEnd} м`);
    setDistributionModalOpen(false);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
    const newSkip = newPage * rowsPerPage;
    if (newSkip + rowsPerPage > allResults.length) {
      loadData(newSkip, rowsPerPage);
    }
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLimit = parseInt(event.target.value, 10);
    setRowsPerPage(newLimit);
    setPage(0);
    loadData(0, newLimit);
  };

  const loadTrippingChart = async (tripping: TrippingData) => {
    setSelectedTripping(tripping);
    try {
      const data = await api.getTrippingChart(Number(wellId), tripping.tripping_number);
      setChartData(data);
      setChartModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const getQualityColor = (score: number, isLoading?: boolean) => {
    if (isLoading) return 'warning';
    if (score >= 70) return 'success';
    if (score >= 50) return 'warning';
    return 'error';
  };

  const getDiffColor = (diff: number | undefined | null) => {
    if (diff === undefined || diff === null) return 'inherit';
    const absDiff = Math.abs(diff);
    
    if ((absDiff >= 10 && absDiff <= 14) || (absDiff >= 23 && absDiff <= 26)) {
      return '#4caf50';
    }
    if (absDiff < 5) {
      return '#f44336';
    }
    if (absDiff >= 5 && absDiff < 11) {
      return '#ff9800';
    }
    if (absDiff > 25) {
      return '#f44336';
    }
    return '#ff9800';
  };

  // Функция определения типа операции
  const getOperationType = (diff: number | undefined | null, currentDepth: number, prevDepth: number) => {
    if (diff === undefined || diff === null) return 'СПО';
    
    // Наращивание: глубина забоя увеличилась
    if (currentDepth > prevDepth) {
      return 'Наращивание';
    }
    
    // СПО: глубина забоя не изменилась
    if (diff < 0) return 'СПО (подъём)';
    if (diff > 0) return 'СПО (спуск)';
    return 'СПО';
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins === 0) return `${secs} сек`;
    return `${mins} мин ${secs} сек`;
  };

  const displayedResults = allResults && allResults.length > 0 
    ? allResults.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : [];

  const trippingMarkers = allResults
    .filter(t => wellStartTime !== null)
    .map(t => {
      const timeHours = (new Date(t.timestamp_start).getTime() - (wellStartTime?.getTime() || 0)) / 3600000;
      if (timeHours < 0) return null;
      return {
        time_hours: timeHours,
        depth: t.depth_bottom,
        label: `#${t.tripping_number}`,
        color: t.is_loading ? '#ff9800' : t.quality_score >= 70 ? '#4caf50' : '#f44336'
      };
    })
    .filter((m): m is { time_hours: number; depth: number; label: string; color: string } => m !== null);

  if (loading && allResults.length === 0) return <CircularProgress />;

  return (
    <div>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/analytics')} sx={{ mb: 2 }}>
        Назад к аналитике
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h4">Модуль 2: Наращивание/СПО</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            startIcon={<TimelineIcon />}
            onClick={() => setProgressModalOpen(true)}
          >
            📈 Прогресс бурения
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<ShowChartIcon />}
            onClick={() => setDistributionModalOpen(true)}
          >
            📊 Распределение операций
          </Button>
        </Box>
      </Box>
      
      {well && (
        <Typography variant="h6" gutterBottom>
          Скважина: {well.well_id} - {well.name || well.well_id}
        </Typography>
      )}

      {analysis && (
        <>
          <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
            <Paper sx={{ p: 2, textAlign: 'center', minWidth: 150 }}>
              <Typography variant="h3">{analysis.total_trippings || totalRows}</Typography>
              <Typography color="textSecondary">Всего операций</Typography>
            </Paper>
            <Paper sx={{ p: 2, textAlign: 'center', minWidth: 150 }}>
              <Typography variant="h3">{analysis.avg_quality_score || 0}%</Typography>
              <Typography color="textSecondary">Среднее качество</Typography>
            </Paper>
            <Paper sx={{ p: 2, textAlign: 'center', minWidth: 200 }}>
              <Typography variant="h3">{formatDuration(analysis.avg_duration_seconds)}</Typography>
              <Typography color="textSecondary">Средняя длительность</Typography>
            </Paper>
          </Box>

          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Детальный список операций</Typography>
          
          <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 200px)', overflowX: 'auto' }}>
            <Table stickyHeader size="medium" sx={{ minWidth: 1300 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>№</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Время начала</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Глубина забоя (м)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Глубина долота (м)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Разница (м)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Тип операции</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Длительность</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Вес восстановлен</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Насос запущен</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Качество</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>График</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedResults.map((row: TrippingData, index: number) => {
                  // Находим предыдущую операцию для сравнения глубины забоя
                  const currentPageFirstIndex = page * rowsPerPage;
                  const globalIndex = currentPageFirstIndex + index;
                  const prevResult = globalIndex > 0 ? allResults[globalIndex - 1] : null;
                  const prevDepth = prevResult?.depth_bottom ?? row.depth_bottom;
                  
                  const isNormalDiff = row.depth_bit_diff !== undefined && row.depth_bit_diff !== null && 
                    ((Math.abs(row.depth_bit_diff) >= 11 && Math.abs(row.depth_bit_diff) <= 13) ||
                     (Math.abs(row.depth_bit_diff) >= 23 && Math.abs(row.depth_bit_diff) <= 25));
                  
                  const isLoading = row.is_loading === true;
                  const operationType = getOperationType(row.depth_bit_diff, row.depth_bottom, prevDepth);
                  
                  return (
                    <TableRow 
                      key={row.tripping_number} 
                      hover 
                      sx={{ 
                        cursor: 'pointer',
                        backgroundColor: isLoading ? '#fff3e0' : 'inherit',
                        '&:hover': { backgroundColor: isLoading ? '#ffe0b2' : '#f5f5f5' },
                        height: 52
                      }}
                      onClick={() => loadTrippingChart(row)}
                    >
                      <TableCell sx={{ py: 1.5 }}>{row.tripping_number}</TableCell>
                      <TableCell sx={{ py: 1.5 }}>{new Date(row.timestamp_start).toLocaleString()}</TableCell>
                      <TableCell sx={{ py: 1.5 }}>{row.depth_bottom}</TableCell>
                      <TableCell sx={{ py: 1.5 }}>{row.depth_bit}</TableCell>
                      <TableCell 
                        sx={{ 
                          backgroundColor: getDiffColor(row.depth_bit_diff),
                          fontWeight: isNormalDiff && !isLoading ? 'bold' : 'normal',
                          color: 'black',
                          py: 1.5
                        }}
                      >
                        {row.depth_bit_diff !== undefined && row.depth_bit_diff !== null ? row.depth_bit_diff.toFixed(1) : '-'}
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Chip 
                          label={operationType} 
                          size="small" 
                          color={
                            operationType === 'Наращивание' ? 'success' :
                            operationType === 'СПО (подъём)' ? 'info' :
                            operationType === 'СПО (спуск)' ? 'warning' : 'default'
                          }
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>{formatDuration(row.duration_seconds)}</TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Chip 
                          label={row.weight_recovered ? 'Да' : 'Нет'} 
                          color={row.weight_recovered ? 'success' : 'error'} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Chip 
                          label={row.pump_started ? 'Да' : 'Нет'} 
                          color={row.pump_started ? 'success' : 'warning'} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Chip 
                          label={isLoading ? 'Загрузка' : `${row.quality_score}%`} 
                          color={getQualityColor(row.quality_score, isLoading)} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1.5 }}>
                        <IconButton onClick={(e) => { e.stopPropagation(); loadTrippingChart(row); }}>
                          <ZoomInIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>          
          
          <TablePagination
            rowsPerPageOptions={[50, 100, 200]}
            component="div"
            count={totalRows}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Строк на странице:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} из ${count}`}
          />
        </>
      )}

      <Dialog open={progressModalOpen} onClose={() => setProgressModalOpen(false)} maxWidth="xl" fullWidth>
        <DialogTitle>📈 Прогресс бурения — выберите интервал</DialogTitle>
        <DialogContent>
          {progressData && progressData.hours?.length > 0 ? (
            <DepthProgressChart
              hours={progressData.hours}
              depthsBottom={progressData.depths_bottom}
              depthsBit={progressData.depths_bit}
              markers={trippingMarkers}
              onSelection={handleProgressSelection}
              height={500}
            />
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="textSecondary">Нет данных для отображения</Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={distributionModalOpen} onClose={() => setDistributionModalOpen(false)} maxWidth="xl" fullWidth>
        <DialogTitle>📊 Распределение операций по глубине долота</DialogTitle>
        <DialogContent>
          {distributionData && distributionData.depth_bins?.length > 0 ? (
            <TrippingDistributionChart
              depthBins={distributionData.depth_bins}
              counts={distributionData.counts}
              onBarClick={handleBarClick}
              height={500}
            />
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="textSecondary">Нет данных для отображения</Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={chartModalOpen} onClose={() => setChartModalOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Операция #{selectedTripping?.tripping_number} — Глубина забоя: {selectedTripping?.depth_bottom} м — Глубина долота: {selectedTripping?.depth_bit} м — Качество: {selectedTripping?.quality_score}%
          {selectedTripping?.is_loading && " (Загрузка на клинья)"}
        </DialogTitle>
        <DialogContent>
          {chartData && (
            <TrippingChart
              seconds={chartData.seconds}
              blockPositions={chartData.block_positions}
              hookloads={chartData.hookloads}
              flowRates={chartData.flow_rates}
              pressures={chartData.pressures}
              startSecond={chartData.start_second}
              endSecond={chartData.end_second}
              height={450}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrippingDetail;