import React, { useEffect, useState } from 'react';
import {
  Typography, Paper, Box, Button, Select, MenuItem, FormControl, InputLabel,
  Alert, CircularProgress, LinearProgress, Chip, Table, TableHead, TableRow,
  TableCell, TableBody, TablePagination, Collapse
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { api } from '../../services/api';

const GTIUploadPage: React.FC = () => {
  const [wells, setWells] = useState<any[]>([]);
  const [pads, setPads] = useState<any[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [selectedWellId, setSelectedWellId] = useState<number>(0);
  const [selectedWellInfo, setSelectedWellInfo] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingData, setExistingData] = useState<boolean>(false);
  const [isProcessed, setIsProcessed] = useState(false);
  
  // Состояния для просмотра данных
  const [gtiData, setGtiData] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [loadingData, setLoadingData] = useState(false);
  const [showDataTable, setShowDataTable] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      api.getWells(),
      api.getPads(),
      api.getContractors()
    ]).then(([wellsRes, padsRes, contractorsRes]) => {
      setWells(wellsRes);
      setPads(padsRes);
      setContractors(contractorsRes);
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
      
      api.getCirculationAnalysis(selectedWellId)
        .then(result => {
          const hasAnalysis = result && result.total_startups > 0;
          setExistingData(hasAnalysis);
          setIsProcessed(hasAnalysis);
        })
        .catch(() => {
          setExistingData(false);
          setIsProcessed(false);
        });
      
      // Загружаем данные для просмотра
      loadGtiData(selectedWellId, 0, rowsPerPage);
    } else {
      setSelectedWellInfo(null);
      setExistingData(false);
      setGtiData([]);
      setTotalRows(0);
      setIsProcessed(false);
    }
  }, [selectedWellId, wells, pads, contractors]);

  const loadGtiData = async (wellId: number, skip: number, limit: number) => {
    setLoadingData(true);
    try {
      const result = await api.getGtiDataPaginated(wellId, skip, limit);
      setGtiData(result.items);
      setTotalRows(result.total);
    } catch (err) {
      console.error(err);
      setGtiData([]);
      setTotalRows(0);
    } finally {
      setLoadingData(false);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
    loadGtiData(selectedWellId, newPage * rowsPerPage, rowsPerPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLimit = parseInt(event.target.value, 10);
    setRowsPerPage(newLimit);
    setPage(0);
    loadGtiData(selectedWellId, 0, newLimit);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedWellId || selectedWellId === 0) {
      setError('Сначала выберите скважину');
      return;
    }
    
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
        setFile(selectedFile);
        setError(null);
        setSuccess(false);
        setIsProcessed(false);
      } else {
        setError('Поддерживаются только файлы .xlsx, .xls, .csv');
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedWellId || selectedWellId === 0) {
      setError('Выберите скважину');
      return;
    }
    if (!file) {
      setError('Выберите файл');
      return;
    }

    // Предупреждение при перезаписи данных
    if (existingData || totalRows > 0) {
      const confirmOverwrite = window.confirm(
        '⚠️ Внимание! В этой скважине уже есть данные ГТИ.\n\n' +
        'При загрузке нового файла СТАРЫЕ ДАННЫЕ будут УДАЛЕНЫ.\n\n' +
        'Продолжить?'
      );
      if (!confirmOverwrite) {
        setFile(null);
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        return;
      }
    }

    setUploading(true);
    setProgress(0);
    setError(null);
    setSuccess(false);
    setIsProcessed(false);

    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 500);

    try {
      await api.uploadGTI(selectedWellId, file);
      clearInterval(interval);
      setProgress(100);
      setSuccess(true);
      setFile(null);
      
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Перезагружаем данные после загрузки
      await loadGtiData(selectedWellId, 0, rowsPerPage);
      setPage(0);
      
      // Сбрасываем статус обработки
      setExistingData(false);
      setIsProcessed(false);
      
      alert('Файл успешно загружен! Нажмите "Обработать все модули" для запуска анализа.');
      
    } catch (err) {
      clearInterval(interval);
      setError('Ошибка при загрузке файла');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleProcessAll = async () => {
    if (!selectedWellId || selectedWellId === 0) {
      setError('Выберите скважину');
      return;
    }
    
    setProcessing(true);
    setProcessResult(null);
    
    try {
      const result = await api.processAllModules(selectedWellId);
      setProcessResult(result);
      setExistingData(true);
      setIsProcessed(true);
      alert(`Обработка завершена!
Модуль 1 (Циркуляция): ${result.module_1_circulation?.total_startups || 0} запусков, качество: ${result.module_1_circulation?.avg_quality_score?.toFixed(1) || 0}%
Модуль 2 (Наращивание): ${result.module_2_tripping?.total_trippings || 0} наращиваний, среднее качество: ${result.module_2_tripping?.avg_quality_score || 0}%`);
    } catch (err) {
      console.error(err);
      setError('Ошибка при обработке данных');
    } finally {
      setProcessing(false);
    }
  };

  const formatDateTime = (timestamp: string) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div>
      <Typography variant="h4" gutterBottom>Загрузка ГТИ данных</Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Загрузите файл с данными ГТИ (Excel или CSV) для выбранной скважины.
        После загрузки нажмите «Обработать все модули» для запуска анализа по 9 модулям.
      </Typography>

      <Paper sx={{ p: 4, mb: 3 }}>
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Скважина</InputLabel>
          <Select
            value={selectedWellId}
            onChange={(e) => setSelectedWellId(e.target.value as number)}
            label="Скважина"
          >
            <MenuItem value={0}>-- Выберите скважину --</MenuItem>
            {wells.map((well) => (
              <MenuItem key={well.id} value={well.id}>
                {well.well_id} - {well.name || well.well_id}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedWellInfo && selectedWellInfo.pad && (
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
            <Typography variant="subtitle2" gutterBottom>Информация о скважине:</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={`Скважина: ${selectedWellInfo.well?.well_id || '-'}`} size="small" color="primary" />
              <Chip label={`Куст: ${selectedWellInfo.pad?.name || '-'}`} size="small" variant="outlined" />
              <Chip label={`Подрядчик: ${selectedWellInfo.contractor?.name || '-'}`} size="small" variant="outlined" />
              {existingData && <Chip label="Данные обработаны" size="small" color="success" />}
            </Box>
          </Paper>
        )}

        <Box
          sx={{
            border: '2px dashed',
            borderColor: error ? 'error.main' : success ? 'success.main' : 'grey.400',
            borderRadius: 2,
            p: 4,
            mb: 2,
            textAlign: 'center',
            cursor: selectedWellId && selectedWellId !== 0 ? 'pointer' : 'not-allowed',
            opacity: selectedWellId && selectedWellId !== 0 ? 1 : 0.5,
            '&:hover': selectedWellId && selectedWellId !== 0 ? { bgcolor: 'action.hover' } : {}
          }}
          onClick={() => {
            if (!selectedWellId || selectedWellId === 0) {
              setError('Сначала выберите скважину');
            } else {
              document.getElementById('file-input')?.click();
            }
          }}
        >
          <input
            id="file-input"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="body1">
            {file ? file.name : 'Нажмите или перетащите файл'}
          </Typography>
          {file && (
            <Typography variant="caption" color="textSecondary">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </Typography>
          )}
        </Box>

        {uploading && (
          <Box sx={{ width: '100%', mb: 2 }}>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
              📁 Загрузка файла...
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!selectedWellId || selectedWellId === 0 || !file || uploading}
            startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
            sx={{ flex: 1 }}
          >
            {uploading ? 'Загрузка...' : 'Загрузить файл'}
          </Button>
          
          <Button
            variant="contained"
            color={isProcessed ? "secondary" : "success"}
            onClick={handleProcessAll}
            disabled={!selectedWellId || selectedWellId === 0 || totalRows === 0 || isProcessed || processing || uploading}
            startIcon={processing ? <CircularProgress size={20} /> : (isProcessed ? <CheckCircleIcon /> : <PlayArrowIcon />)}
            sx={{ flex: 1 }}
          >
            {processing ? 'Обработка...' : (isProcessed ? '✅ Обработано' : 'Обработать все модули')}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mt: 2 }} icon={<CheckCircleIcon />}>
            Файл загружен! Нажмите «Обработать все модули».
          </Alert>
        )}

        {processResult && processResult.success && (
          <Alert severity="info" sx={{ mt: 2 }}>
            ✅ {processResult.message}
          </Alert>
        )}
      </Paper>

      {/* Блок просмотра данных */}
      {selectedWellId && selectedWellId !== 0 && (
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">
              Загруженные данные ГТИ {totalRows > 0 && `(${totalRows} записей)`}
            </Typography>
            <Button
              startIcon={showDataTable ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => setShowDataTable(!showDataTable)}
            >
              {showDataTable ? 'Скрыть' : 'Показать'}
            </Button>
          </Box>
          
          <Collapse in={showDataTable}>
            {loadingData ? (
              <CircularProgress />
            ) : gtiData.length === 0 ? (
              <Alert severity="info">Нет загруженных данных. Загрузите файл.</Alert>
            ) : (
              <>
                <Table size="small" sx={{ overflowX: 'auto', minWidth: 1300 }}>
  <TableHead>
    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
      <TableCell>Время</TableCell>
      <TableCell>Глубина долота (м)</TableCell>
      <TableCell>Глубина забоя (м)</TableCell>
      <TableCell>Расход на входе (л/с)</TableCell>
      <TableCell>Давление на входе (атм)</TableCell>
      <TableCell>Давление на выходе (атм)</TableCell>
      <TableCell>Нагрузка на долото (т)</TableCell>
      <TableCell>Мех. скорость (м/ч)</TableCell>
      <TableCell>Обороты ВСП (об/мин)</TableCell>
      <TableCell>Крутящий момент (кН·м)</TableCell>
      <TableCell>Объем в емкостях (м³)</TableCell>
      <TableCell>Вес на крюке (т)</TableCell>
      <TableCell>Положение ТБ (м)</TableCell>
    </TableRow>
  </TableHead>
  <TableBody>
    {gtiData.map((row) => (
      <TableRow key={row.id} hover>
        <TableCell>{formatDateTime(row.timestamp)}</TableCell>
        <TableCell>{row.depth_bit ?? '-'}</TableCell>
        <TableCell>{row.depth_bottom ?? '-'}</TableCell>
        <TableCell>{row.flow_rate_in ?? '-'}</TableCell>
        <TableCell>{row.pressure_in ?? '-'}</TableCell>
        <TableCell>{row.pressure_out ?? '-'}</TableCell>
        <TableCell>{row.weight_on_bit ?? '-'}</TableCell>
        <TableCell>{row.rop ?? '-'}</TableCell>
        <TableCell>{row.rpm ?? '-'}</TableCell>
        <TableCell>{row.torque ?? '-'}</TableCell>
        <TableCell>{row.tank_volume_total ?? '-'}</TableCell>
        <TableCell>{row.hookload ?? '-'}</TableCell>
        <TableCell>{row.block_position ?? '-'}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
                <TablePagination
                  rowsPerPageOptions={[25, 50, 100]}
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
          </Collapse>
        </Paper>
      )}
    </div>
  );
};

export default GTIUploadPage;