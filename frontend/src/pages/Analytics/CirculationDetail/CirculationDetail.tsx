import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, CircularProgress, Box, Button, Dialog, DialogTitle, DialogContent,
  IconButton, TablePagination, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import TimelineIcon from '@mui/icons-material/Timeline';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { api } from '../../../services/api';
import { CirculationChart } from '../../../components/Charts/CirculationChart';
import { DepthProgressChart } from '../../../components/Charts/DepthProgressChart';
import { FlowDistributionChart } from '../../../components/Charts/FlowDistributionChart';
import { FilterPanel } from '../../../components/Analytics/FilterPanel';

interface StartupData {
  startup_number: number;
  timestamp: string;
  depth_bottom: number;
  depth_bit: number;
  target_flow: number;
  target_reached_sec: number | null;
  delta_t_sec: number | null;
  flow_angle: number;
  press_angle: number;
  overshoot_pct: number;
  quality_score: number;
  time_days?: number;
  time_hours?: number;
}

interface ChartData {
  seconds: number[];
  flows: number[];
  pressures: number[];
  target_flow: number;
  target_reached_sec: number | null;
  flow_angle: number;
  press_angle: number;
}

interface FilterState {
  qualityMin: number;
  depthMin: number;
  depthMax: number;
  timeMinDays: number;
  timeMaxDays: number;
}

const STORAGE_KEY = 'circulation_filters';
const MODE_STORAGE_KEY = 'circulation_mode';

const CirculationDetail: React.FC = () => {
  const { wellId } = useParams<{ wellId: string }>();
  const navigate = useNavigate();
  
  const [analysis, setAnalysis] = useState<any>(null);
  const [well, setWell] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStartup, setSelectedStartup] = useState<StartupData | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  const [progressData, setProgressData] = useState<any>(null);
  const [progressStartups, setProgressStartups] = useState<any[]>([]);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [flowModalOpen, setFlowModalOpen] = useState(false);
  const [targetFlowData, setTargetFlowData] = useState<any>(null);
  const [targetFlowModalOpen, setTargetFlowModalOpen] = useState(false);
  
  // Режим работы: 'filters' или 'pagination'
  const [mode, setMode] = useState<'filters' | 'pagination'>(() => {
    const saved = localStorage.getItem(MODE_STORAGE_KEY);
    return (saved === 'pagination' ? 'pagination' : 'filters');
  });
  
  // Пагинация
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  
  // Фильтры
  const [filters, setFilters] = useState<FilterState>({
    qualityMin: 0,
    depthMin: 0,
    depthMax: 10000,
    timeMinDays: 0,
    timeMaxDays: 100
  });
  const [filteredStartups, setFilteredStartups] = useState<StartupData[]>([]);
  const [savedFilters, setSavedFilters] = useState<any[]>([]);
  const [depthRange, setDepthRange] = useState<number[]>([0, 10000]);
  const [timeRangeDays, setTimeRangeDays] = useState<number[]>([0, 100]);

  // Загрузка сохранённых фильтров
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setSavedFilters(JSON.parse(saved));
    }
  }, []);

  // Основная загрузка данных
  useEffect(() => {
    Promise.all([
      api.getCirculationAnalysis(Number(wellId)),
      api.getWell(Number(wellId)),
      api.getWellProgress(Number(wellId)),
      api.getTargetFlowByDepth(Number(wellId), 50, 1.5)
    ]).then(([analysisData, wellData, progressData, targetFlowData]) => {
      setAnalysis(analysisData);
      setWell(wellData);
      setProgressData(progressData.progress);
      setProgressStartups(progressData.startups || []);
      setTargetFlowData(targetFlowData);
      
      if (analysisData.results && analysisData.results.length > 0) {
        const depths = analysisData.results.map((s: StartupData) => s.depth_bottom);
        const times = progressData.startups?.map((s: any) => s.time_days) || [];
        
        const minDepth = Math.min(...depths);
        const maxDepth = Math.max(...depths);
        const minTime = Math.min(...times, 0);
        const maxTime = Math.max(...times, 100);
        
        setDepthRange([minDepth, maxDepth]);
        setTimeRangeDays([minTime, maxTime]);
        
        setFilters(prev => ({
          ...prev,
          depthMin: minDepth,
          depthMax: maxDepth,
          timeMaxDays: maxTime
        }));
      }
      
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [wellId]);

  // Применение фильтров (только в режиме filters)
  useEffect(() => {
    if (!analysis?.results || mode !== 'filters') return;
    
    let filtered = [...analysis.results];
    
    filtered = filtered.filter(s => s.quality_score >= filters.qualityMin);
    filtered = filtered.filter(s => 
      s.depth_bottom >= filters.depthMin && s.depth_bottom <= filters.depthMax
    );
    
    if (filters.timeMinDays > 0 || filters.timeMaxDays < 100) {
      filtered = filtered.filter(s => {
        const startup = progressStartups.find(p => p.startup_number === s.startup_number);
        if (!startup) return true;
        return startup.time_days >= filters.timeMinDays && startup.time_days <= filters.timeMaxDays;
      });
    }
    
    setFilteredStartups(filtered);
  }, [analysis, filters, progressStartups, mode]);

  const loadStartupChart = async (startup: StartupData) => {
    const startupInfo = progressStartups.find(s => s.startup_number === startup.startup_number);
    const timeDays = startupInfo?.time_days || 0;
    const timeHours = startupInfo?.time_hours || 0;
    
    setSelectedStartup({
      ...startup,
      time_days: timeDays,
      time_hours: timeHours
    });
    
    try {
      const data = await api.getStartupChart(Number(wellId), startup.startup_number);
      setChartData({
        seconds: data.seconds,
        flows: data.flows,
        pressures: data.pressures,
        target_flow: analysis.target_flow,
        target_reached_sec: data.target_reached_sec,
        flow_angle: data.flow_angle,
        press_angle: data.press_angle
      });
      setModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleProgressSelection = (selection: { timeMinHours: number; timeMaxHours: number; depthMin: number; depthMax: number }) => {
    setFilters(prev => ({
      ...prev,
      timeMinDays: selection.timeMinHours / 24,
      timeMaxDays: selection.timeMaxHours / 24,
      depthMin: selection.depthMin,
      depthMax: selection.depthMax
    }));
    setProgressModalOpen(false);
  };

  const saveCurrentFilter = () => {
    const newFilter = {
      id: Date.now(),
      name: `Фильтр от ${new Date().toLocaleString()}`,
      description: `Качество ≥ ${filters.qualityMin}%, глубина ${filters.depthMin}-${filters.depthMax} м, время ${filters.timeMinDays}-${filters.timeMaxDays} сут`,
      createdAt: new Date().toLocaleString(),
      filter: { ...filters }
    };
    const updated = [newFilter, ...savedFilters].slice(0, 20);
    setSavedFilters(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const applyFilter = (filter: any) => {
    setFilters(filter.filter);
  };

  const deleteFilter = (filterId: number) => {
    const updated = savedFilters.filter(f => f.id !== filterId);
    setSavedFilters(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const clearAllFilters = () => {
    setFilters({
      qualityMin: 0,
      depthMin: depthRange[0],
      depthMax: depthRange[1],
      timeMinDays: timeRangeDays[0],
      timeMaxDays: timeRangeDays[1]
    });
  };

  const getQualityColor = (score: number) => {
    if (score >= 70) return 'success';
    if (score >= 50) return 'warning';
    return 'error';
  };

  const toggleMode = () => {
    const newMode = mode === 'filters' ? 'pagination' : 'filters';
    setMode(newMode);
    localStorage.setItem(MODE_STORAGE_KEY, newMode);
    setPage(0);
  };

  const getTimeTargetMap = () => {
    const timeTargetMap: { time: number; target: number }[] = [];
    if (progressData?.hours && targetFlowData?.depth_bins && targetFlowData?.target_flows) {
      for (let i = 0; i < progressData.hours.length; i++) {
        const timeDays = progressData.hours[i] / 24;
        const depth = progressData.depths_bottom[i];
        let targetValue = 0;
        for (let j = 0; j < targetFlowData.depth_bins.length; j++) {
          const binStart = targetFlowData.depth_bins[j];
          const binEnd = j < targetFlowData.depth_bins.length - 1 ? targetFlowData.depth_bins[j + 1] : Infinity;
          if (depth >= binStart && depth < binEnd) {
            targetValue = targetFlowData.target_flows[j];
            break;
          }
        }
        timeTargetMap.push({ time: timeDays, target: targetValue });
      }
    }
    const uniqueByTime = new Map();
    for (const item of timeTargetMap) {
      const timeKey = item.time.toFixed(1);
      if (!uniqueByTime.has(timeKey)) {
        uniqueByTime.set(timeKey, item);
      }
    }
    return Array.from(uniqueByTime.values());
  };

  if (loading) return <CircularProgress />;

  return (
    <div>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/analytics')} sx={{ mb: 2 }}>
        Назад к аналитике
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h4">Модуль 1: Циркуляция</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant={mode === 'filters' ? 'contained' : 'outlined'} 
            color={mode === 'filters' ? 'primary' : 'secondary'}
            onClick={toggleMode}
            size="small"
          >
            {mode === 'filters' ? '🔍 Режим фильтров' : '📄 Режим пагинации'}
          </Button>
          <Button variant="outlined" startIcon={<TimelineIcon />} onClick={() => setProgressModalOpen(true)}>
            📈 Прогресс бурения
          </Button>
          <Button variant="outlined" startIcon={<ShowChartIcon />} onClick={() => setFlowModalOpen(true)}>
            📊 Распределение расхода
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
              <Typography variant="h3">{analysis.total_startups}</Typography>
              <Typography color="textSecondary">Всего запусков</Typography>
            </Paper>
            <Paper sx={{ p: 2, textAlign: 'center', minWidth: 150 }}>
              <Typography variant="h3">{analysis.avg_quality_score?.toFixed(1)}%</Typography>
              <Typography color="textSecondary">Среднее качество</Typography>
            </Paper>
            <Paper 
              sx={{ 
                p: 2, 
                textAlign: 'center', 
                minWidth: 150,
                cursor: 'pointer',
                bgcolor: '#e3f2fd',
                '&:hover': { bgcolor: '#bbdefb' }
              }}
              onClick={() => setTargetFlowModalOpen(true)}
            >
              <Typography variant="h3">{analysis.target_flow?.toFixed(1)}</Typography>
              <Typography color="textSecondary">Целевой расход (л/с) 📊</Typography>
            </Paper>
          </Box>

          {/* РЕЖИМ ФИЛЬТРОВ */}
          {mode === 'filters' && (
            <>
              <FilterPanel
                filters={filters}
                onFilterChange={setFilters}
                onSaveFilter={saveCurrentFilter}
                onClearFilters={clearAllFilters}
                savedFilters={savedFilters}
                onApplyFilter={applyFilter}
                onDeleteFilter={deleteFilter}
                depthRange={[depthRange[0], depthRange[1]]}
                timeRange={[timeRangeDays[0], timeRangeDays[1]]}
                totalStartups={analysis.total_startups}
                filteredCount={filteredStartups.length}
              />

              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Детальный список запусков</Typography>
              <Paper sx={{ overflowX: 'auto' }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell>№</TableCell>
                      <TableCell>Дата/время</TableCell>
                      <TableCell>Глубина (м)</TableCell>
                      <TableCell>Целевой расход (л/с)</TableCell>
                      <TableCell>Время выхода (с)</TableCell>
                      <TableCell>Углы (р/д)</TableCell>
                      <TableCell>Качество</TableCell>
                      <TableCell align="center">График</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredStartups.map((row: StartupData) => (
                      <TableRow key={row.startup_number} hover sx={{ cursor: 'pointer' }} onClick={() => loadStartupChart(row)}>
                        <TableCell>{row.startup_number}</TableCell>
                        <TableCell>{new Date(row.timestamp).toLocaleString()}</TableCell>
                        <TableCell>{row.depth_bottom}</TableCell>
                        <TableCell>{row.target_flow?.toFixed(1) ?? '-'}</TableCell>
                        <TableCell>{row.target_reached_sec ?? '-'}</TableCell>
                        <TableCell>{row.flow_angle?.toFixed(0)}° / {row.press_angle?.toFixed(0)}°</TableCell>
                        <TableCell><Chip label={`${row.quality_score}%`} color={getQualityColor(row.quality_score)} size="small" /></TableCell>
                        <TableCell align="center">
                          <IconButton onClick={(e) => { e.stopPropagation(); loadStartupChart(row); }}>
                            <ZoomInIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </>
          )}

          {/* РЕЖИМ ПАГИНАЦИИ */}
          {mode === 'pagination' && analysis.results && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, mt: 3 }}>
                <Typography variant="h6">Детальный список запусков</Typography>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Строк на стр.</InputLabel>
                  <Select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setPage(0);
                    }}
                    label="Строк на стр."
                  >
                    <MenuItem value={50}>50</MenuItem>
                    <MenuItem value={100}>100</MenuItem>
                    <MenuItem value={200}>200</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Paper sx={{ overflowX: 'auto' }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell>№</TableCell>
                      <TableCell>Дата/время</TableCell>
                      <TableCell>Глубина (м)</TableCell>
                      <TableCell>Целевой расход (л/с)</TableCell>
                      <TableCell>Время выхода (с)</TableCell>
                      <TableCell>Углы (р/д)</TableCell>
                      <TableCell>Качество</TableCell>
                      <TableCell align="center">График</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analysis.results
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((row: StartupData) => (
                        <TableRow key={row.startup_number} hover sx={{ cursor: 'pointer' }} onClick={() => loadStartupChart(row)}>
                          <TableCell>{row.startup_number}</TableCell>
                          <TableCell>{new Date(row.timestamp).toLocaleString()}</TableCell>
                          <TableCell>{row.depth_bottom}</TableCell>
                          <TableCell>{row.target_flow?.toFixed(1) ?? '-'}</TableCell>
                          <TableCell>{row.target_reached_sec ?? '-'}</TableCell>
                          <TableCell>{row.flow_angle?.toFixed(0)}° / {row.press_angle?.toFixed(0)}°</TableCell>
                          <TableCell><Chip label={`${row.quality_score}%`} color={getQualityColor(row.quality_score)} size="small" /></TableCell>
                          <TableCell align="center">
                            <IconButton onClick={(e) => { e.stopPropagation(); loadStartupChart(row); }}>
                              <ZoomInIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
                <TablePagination
                  rowsPerPageOptions={[50, 100, 200]}
                  component="div"
                  count={analysis.results.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={(_, newPage) => setPage(newPage)}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                  labelRowsPerPage="Строк на странице:"
                  labelDisplayedRows={({ from, to, count }) => `${from}-${to} из ${count}`}
                />
              </Paper>
            </>
          )}
        </>
      )}

      {/* Модальное окно с детальным графиком запуска */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Запуск #{selectedStartup?.startup_number} — Глубина: {selectedStartup?.depth_bottom} м — 
          Время: {selectedStartup?.time_days?.toFixed(1)} сут ({selectedStartup?.time_hours?.toFixed(0)} ч) — 
          Качество: {selectedStartup?.quality_score}%
        </DialogTitle>
        <DialogContent>
          {chartData && (
            <CirculationChart
              seconds={chartData.seconds}
              flows={chartData.flows}
              pressures={chartData.pressures}
              targetFlow={chartData.target_flow}
              targetReachedSec={chartData.target_reached_sec}
              flowAngle={chartData.flow_angle}
              pressAngle={chartData.press_angle}
              surgeZoneSeconds={20}
              height={450}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Модальное окно с прогрессом бурения */}
      <Dialog open={progressModalOpen} onClose={() => setProgressModalOpen(false)} maxWidth="xl" fullWidth>
        <DialogTitle>📈 Прогресс бурения — выберите интервал</DialogTitle>
        <DialogContent>
          {progressData && progressData.hours?.length > 0 ? (
            <DepthProgressChart
              hours={progressData.hours}
              depthsBottom={progressData.depths_bottom}
              depthsBit={progressData.depths_bit}
              startups={progressStartups}
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

      {/* Модальное окно с распределением расхода */}
      <Dialog open={flowModalOpen} onClose={() => setFlowModalOpen(false)} maxWidth="xl" fullWidth>
        <DialogTitle>📊 Распределение расхода по глубине</DialogTitle>
        <DialogContent>
          {progressData && progressData.max_flows && progressData.max_flows.length > 0 ? (
            <FlowDistributionChart
              hours={progressData.hours}
              depthsBottom={progressData.depths_bottom}
              depthsBit={progressData.depths_bit}
              maxFlows={progressData.max_flows}
              targetFlows={targetFlowData}
              height={500}
            />
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="textSecondary">Нет данных для отображения</Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Модальное окно с таблицами целевого расхода */}
      <Dialog open={targetFlowModalOpen} onClose={() => setTargetFlowModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          📊 Целевой расход
          <IconButton
            aria-label="close"
            onClick={() => setTargetFlowModalOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            ✕
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="h6" gutterBottom>По глубине (интервал 50 м)</Typography>
          <Paper sx={{ maxHeight: 300, overflow: 'auto', mb: 4 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Интервал глубины (м)</TableCell>
                  <TableCell align="right">Целевой расход (л/с)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {targetFlowData?.depth_bins?.map((bin: number, idx: number) => (
                  <TableRow key={idx} hover>
                    <TableCell>{bin} - {bin + 50} м</TableCell>
                    <TableCell align="right">{targetFlowData.target_flows[idx]?.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          <Typography variant="h6" gutterBottom>По времени (сутки от начала бурения)</Typography>
          <Paper sx={{ maxHeight: 300, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Время (сутки)</TableCell>
                  <TableCell align="right">Целевой расход (л/с)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getTimeTargetMap().map((item, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>{item.time.toFixed(1)} сут</TableCell>
                    <TableCell align="right">{item.target.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CirculationDetail;