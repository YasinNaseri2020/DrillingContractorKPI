import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Grid, Card, CardContent, Box, Chip, LinearProgress,
  FormControl, InputLabel, Select, MenuItem, Paper, CircularProgress, Button
} from '@mui/material';
import { api } from '../../services/api';

const STORAGE_KEY = 'selected_well_id';

const modules = [
  { id: 1, title: 'Циркуляция', icon: '🚀', description: 'Анализ запусков насоса, время выхода на расход', path: '/analytics/circulation' },
  { id: 2, title: 'Наращивание', icon: '🔧', description: 'Анализ остановок бурения, время наращивания', path: '/analytics/tripping' },
  { id: 3, title: 'Мех. скорость', icon: '📈', description: 'Стабильность ROP, вариативность по интервалам', path: '#' },
  { id: 4, title: 'ВСП (Топдрайв)', icon: '⚙️', description: 'Анализ запусков ВСП, стабильность момента', path: '#' },
  { id: 5, title: 'Скорость СПО', icon: '⬆️', description: 'Эффективность спуско-подъемных операций', path: '#' },
  { id: 6, title: 'Доливная емкость', icon: '🪣', description: 'Контроль заполнения кольцевого пространства', path: '#' },
  { id: 7, title: 'Нарушения', icon: '⚠️', description: 'Акты внеплановых проверок, анализ нарушений', path: '#' },
  { id: 8, title: 'Проверки', icon: '👥', description: 'Анализ проверок от разных контролирующих органов', path: '#' },
  { id: 9, title: 'НВП', icon: '⏱️', description: 'Анализ непроизводительного времени', path: '#' },
];

const AnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [wells, setWells] = useState<any[]>([]);
  const [pads, setPads] = useState<any[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [selectedWellId, setSelectedWellId] = useState<number>(0);
  const [selectedWellInfo, setSelectedWellInfo] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Режим циркуляции (сохраняется в localStorage)
  const [circulationMode, setCirculationMode] = useState<'filters' | 'pagination'>(() => {
    const saved = localStorage.getItem('circulation_mode');
    return saved === 'pagination' ? 'pagination' : 'filters';
  });

  useEffect(() => {
    const savedWellId = localStorage.getItem(STORAGE_KEY);
    const savedId = savedWellId ? parseInt(savedWellId) : 0;
    
    Promise.all([
      api.getWells(),
      api.getPads(),
      api.getContractors()
    ]).then(([wellsRes, padsRes, contractorsRes]) => {
      setWells(wellsRes);
      setPads(padsRes);
      setContractors(contractorsRes);
      
      if (savedId !== 0 && wellsRes.some((w: any) => w.id === savedId)) {
        setSelectedWellId(savedId);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedWellId && selectedWellId !== 0) {
      const well = wells.find(w => w.id === selectedWellId);
      if (well) {
        const pad = pads.find(p => p.id === well.pad_id);
        const contractor = pad ? contractors.find(c => c.id === pad.contractor_id) : null;
        setSelectedWellInfo({ well, pad, contractor });
      }
      
      setLoading(true);
      
      Promise.all([
        api.getCirculationAnalysis(selectedWellId),
        api.getTrippingAnalysis(selectedWellId).catch(() => null)
      ]).then(([circulationData, trippingData]) => {
        setAnalysis({
          ...circulationData,
          tripping_data: trippingData
        });
      }).catch(console.error)
      .finally(() => setLoading(false));
    } else {
      setSelectedWellInfo(null);
      setAnalysis(null);
    }
  }, [selectedWellId, wells, pads, contractors]);

  const handleWellChange = (wellId: number) => {
    setSelectedWellId(wellId);
    if (wellId !== 0) {
      localStorage.setItem(STORAGE_KEY, wellId.toString());
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleModuleClick = (module: any) => {
    if (!selectedWellId) {
      alert('Сначала выберите скважину');
      return;
    }
    
    if (module.id === 1) {
      // Режим уже выбран переключателем на карточке
      navigate(`/analytics/circulation/${selectedWellId}`);
    } else if (module.id === 2) {
      navigate(`/analytics/tripping/${selectedWellId}`);
    } else {
      alert(`Модуль "${module.title}" в разработке`);
    }
  };

  return (
    <div>
      <Typography variant="h4" gutterBottom>Аналитика бурения</Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Анализ эффективности бурения по 9 модулям
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <FormControl sx={{ minWidth: 300 }} fullWidth>
          <InputLabel>Выберите скважину</InputLabel>
          <Select
            value={selectedWellId}
            onChange={(e) => handleWellChange(e.target.value as number)}
            label="Выберите скважину"
          >
            <MenuItem value={0}>-- Выберите скважину --</MenuItem>
            {wells.map((well) => (
              <MenuItem key={well.id} value={well.id}>
                {well.well_id} - {well.name || well.well_id}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {selectedWellInfo && (
          <Box sx={{ mt: 2, p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>Информация о скважине:</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={`Скважина: ${selectedWellInfo.well?.well_id || '-'}`} size="small" color="primary" />
              <Chip label={`Куст: ${selectedWellInfo.pad?.name || '-'}`} size="small" variant="outlined" />
              <Chip label={`Подрядчик: ${selectedWellInfo.contractor?.name || '-'}`} size="small" variant="outlined" />
            </Box>
          </Box>
        )}
      </Paper>

      {selectedWellId && loading && <CircularProgress />}

      {selectedWellId && !loading && (
        <Grid container spacing={3}>
          {modules.map((module) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={module.id}>
              <Card 
                sx={{ 
                  cursor: 'pointer', 
                  transition: '0.2s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: 3 },
                  borderTop: (module.id === 1 || module.id === 2) && analysis ? '4px solid #4caf50' : '4px solid #ff9800'
                }}
                onClick={() => handleModuleClick(module)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h2" sx={{ fontSize: 40, mr: 2 }}>{module.icon}</Typography>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6">{module.title}</Typography>
                      <Chip 
                        label={(module.id === 1 || module.id === 2) ? 'Данные' : 'В разработке'} 
                        size="small" 
                        color={(module.id === 1 || module.id === 2) ? 'success' : 'default'} 
                        variant="outlined" 
                      />
                    </Box>
                  </Box>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    {module.description}
                  </Typography>
                  
                  {module.id === 1 && analysis && (
                    <Box sx={{ mt: 2 }}>
                      {/* Переключатель режима */}
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          mb: 1.5,
                          p: 0.5,
                          bgcolor: '#f5f5f5',
                          borderRadius: 2
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Typography variant="caption" color="textSecondary" sx={{ ml: 0.5 }}>
                          Режим:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Button
                            size="small"
                            variant={circulationMode === 'filters' ? 'contained' : 'outlined'}
                            onClick={() => {
                              setCirculationMode('filters');
                              localStorage.setItem('circulation_mode', 'filters');
                            }}
                            sx={{ fontSize: '0.65rem', py: 0.5, px: 1, minWidth: 70 }}
                          >
                            🔍 Фильтры
                          </Button>
                          <Button
                            size="small"
                            variant={circulationMode === 'pagination' ? 'contained' : 'outlined'}
                            onClick={() => {
                              setCirculationMode('pagination');
                              localStorage.setItem('circulation_mode', 'pagination');
                            }}
                            sx={{ fontSize: '0.65rem', py: 0.5, px: 1, minWidth: 70 }}
                          >
                            📄 Пагинация
                          </Button>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption">Качество циркуляции</Typography>
                        <Typography variant="caption">
                          {analysis.avg_quality_score?.toFixed(1)}%
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={analysis.avg_quality_score || 0} 
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Typography variant="caption" color="textSecondary">
                          Запусков: {analysis.total_startups}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Цель: {analysis.target_flow?.toFixed(1)} л/с
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  
                  {module.id === 2 && analysis?.tripping_data && (
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption">Качество наращивания</Typography>
                        <Typography variant="caption">
                          {analysis.tripping_data?.avg_quality_score?.toFixed(1) || 0}%
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={analysis.tripping_data?.avg_quality_score || 0} 
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Typography variant="caption" color="textSecondary">
                          Наращиваний: {analysis.tripping_data?.total_trippings || 0}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Ср. время: {analysis.tripping_data?.avg_duration_seconds?.toFixed(0) || 0} с
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {selectedWellId === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="textSecondary">Выберите скважину для просмотра аналитики</Typography>
        </Paper>
      )}
    </div>
  );
};

export default AnalyticsPage;