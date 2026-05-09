import React, { useEffect, useState } from 'react';
import {
  Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  IconButton, CircularProgress, Alert, Select, MenuItem, FormControl, InputLabel, Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface Well {
  id: number;
  well_id: string;
  name: string;
  pad_id: number;
}

interface Pad {
  id: number;
  name: string;
}

const API_URL = 'http://localhost:8000/api/wells';
const PADS_URL = 'http://localhost:8000/api/pads';

const WellsPage: React.FC = () => {
  const [wells, setWells] = useState<Well[]>([]);
  const [pads, setPads] = useState<Pad[]>([]);
  const [gtiStatus, setGtiStatus] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Well | null>(null);
  const [formData, setFormData] = useState({ well_id: '', name: '', pad_id: 0 });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });

  const loadData = async () => {
    try {
      console.log('🟢 Загрузка данных...');
      
      const padsRes = await fetch(PADS_URL);
      const padsData = await padsRes.json();
      console.log('📡 Кусты загружены:', padsData);
      setPads(padsData);
      
      const wellsRes = await fetch(API_URL);
      const wellsData = await wellsRes.json();
      console.log('📡 Скважины загружены:', wellsData);
      setWells(wellsData);
      
      // Проверяем наличие ГТИ
      const statusMap: Record<number, boolean> = {};
      for (const well of wellsData) {
        try {
          const analysis = await fetch(`http://localhost:8000/api/circulation/analyze/${well.id}`);
          const analysisData = await analysis.json();
          statusMap[well.id] = analysisData && analysisData.total_startups > 0;
        } catch {
          statusMap[well.id] = false;
        }
      }
      setGtiStatus(statusMap);
      
    } catch (err) {
      console.error('❌ Ошибка загрузки:', err);
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenDialog = () => {
    console.log('🟢 Открытие диалога, pads:', pads);
    if (pads.length === 0) {
      setError('Нет доступных кустов. Сначала создайте куст в разделе "Кусты".');
      return;
    }
    setEditingItem(null);
    setFormData({ well_id: '', name: '', pad_id: pads[0]?.id || 0 });
    setOpenDialog(true);
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    if (!formData.well_id.trim()) {
      setError('Введите ID скважины');
      return;
    }
    if (!formData.pad_id) {
      setError('Выберите куст');
      return;
    }
    try {
      if (editingItem) {
        await fetch(`${API_URL}/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ well_id: formData.well_id, name: formData.name, pad_id: formData.pad_id }),
        });
        setSuccess('Скважина обновлена');
      } else {
        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ well_id: formData.well_id, name: formData.name, pad_id: formData.pad_id }),
        });
        setSuccess('Скважина создана');
      }
      setOpenDialog(false);
      setEditingItem(null);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Ошибка сохранения');
    }
  };

  const handleEdit = (well: Well) => {
    setEditingItem(well);
    setFormData({
      well_id: well.well_id,
      name: well.name || '',
      pad_id: well.pad_id,
    });
    setOpenDialog(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      await fetch(`${API_URL}/${deleteConfirm.id}`, { method: 'DELETE' });
      setDeleteConfirm({ open: false, id: null });
      setSuccess('Скважина удалена');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Ошибка удаления');
    }
  };

  const getPadName = (padId: number) => {
    const pad = pads.find(p => p.id === padId);
    return pad ? pad.name : '-';
  };

  if (loading) return <CircularProgress />;

  return (
    <div>
      <Typography variant="h4" gutterBottom>Скважины</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
      
      <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog} sx={{ mb: 2 }}>
        Добавить скважину
      </Button>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>ID скважины</TableCell>
              <TableCell>Название</TableCell>
              <TableCell>Куст</TableCell>
              <TableCell>ГТИ</TableCell>
              <TableCell align="center">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {wells.map((w) => (
              <TableRow key={w.id}>
                <TableCell>{w.id}</TableCell>
                <TableCell>{w.well_id}</TableCell>
                <TableCell>{w.name || '-'}</TableCell>
                <TableCell>{getPadName(w.pad_id)}</TableCell>
                <TableCell>
                  <Chip 
                    label={gtiStatus[w.id] ? 'Загружено' : 'Нет данных'} 
                    color={gtiStatus[w.id] ? 'success' : 'error'} 
                    size="small" 
                    variant={gtiStatus[w.id] ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton onClick={() => handleEdit(w)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => setDeleteConfirm({ open: true, id: w.id })} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {wells.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center">Нет скважин. Добавьте первую.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingItem ? 'Редактировать скважину' : 'Новая скважина'}</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label="ID скважины (well_id)" value={formData.well_id} onChange={(e) => setFormData({ ...formData, well_id: e.target.value })} margin="normal" required />
          <TextField fullWidth label="Название" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} margin="normal" />
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Куст</InputLabel>
            <Select value={formData.pad_id} onChange={(e) => setFormData({ ...formData, pad_id: e.target.value as number })}>
              {pads.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Отмена</Button>
          <Button onClick={handleSave} variant="contained">Сохранить</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, id: null })}>
        <DialogTitle>Подтверждение удаления</DialogTitle>
        <DialogContent>
          <Typography>Удалить скважину? Все связанные данные будут удалены.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ open: false, id: null })}>Отмена</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Удалить</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default WellsPage;
