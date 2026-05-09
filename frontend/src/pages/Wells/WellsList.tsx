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
  status: string;
  current_depth: number;
  planned_depth: number;
}

interface Pad {
  id: number;
  name: string;
  contractor_id: number;
}

interface Contractor {
  id: number;
  name: string;
}

const API_URL = 'http://localhost:8000/api/wells';
const PADS_URL = 'http://localhost:8000/api/pads';
const CONTRACTORS_URL = 'http://localhost:8000/api/contractors';

const WellsList: React.FC = () => {
  const [wells, setWells] = useState<Well[]>([]);
  const [pads, setPads] = useState<Pad[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Well | null>(null);
  const [formData, setFormData] = useState({
    well_id: '',
    name: '',
    pad_id: 0,
    status: 'online',
    current_depth: 0,
    planned_depth: 0
  });
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });

  const loadData = async () => {
    try {
      const [wellsRes, padsRes, contractorsRes] = await Promise.all([
        fetch(API_URL).then(r => r.json()),
        fetch(PADS_URL).then(r => r.json()),
        fetch(CONTRACTORS_URL).then(r => r.json())
      ]);
      setWells(wellsRes);
      setPads(padsRes);
      setContractors(contractorsRes);
    } catch (err) {
      console.error(err);
      setError('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenDialog = () => {
    if (pads.length === 0) {
      setError('Нет доступных кустов. Сначала создайте куст в разделе "Кусты".');
      return;
    }
    setEditingItem(null);
    setFormData({
      well_id: '',
      name: '',
      pad_id: pads[0]?.id || 0,
      status: 'online',
      current_depth: 0,
      planned_depth: 0
    });
    setOpenDialog(true);
    setError('');
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
          body: JSON.stringify(formData),
        });
      } else {
        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }
      setOpenDialog(false);
      setEditingItem(null);
      setFormData({
        well_id: '',
        name: '',
        pad_id: pads[0]?.id || 0,
        status: 'online',
        current_depth: 0,
        planned_depth: 0
      });
      setError('');
      loadData();
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
      status: well.status,
      current_depth: well.current_depth,
      planned_depth: well.planned_depth
    });
    setOpenDialog(true);
    setError('');
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      await fetch(`${API_URL}/${deleteConfirm.id}`, { method: 'DELETE' });
      setDeleteConfirm({ open: false, id: null });
      loadData();
    } catch (err) {
      console.error(err);
      setError('Ошибка удаления');
    }
  };

  const getPadName = (padId: number) => {
    const pad = pads.find(p => p.id === padId);
    return pad ? pad.name : '-';
  };

  const getContractorName = (padId: number) => {
    const pad = pads.find(p => p.id === padId);
    if (!pad) return '-';
    const contractor = contractors.find(c => c.id === pad.contractor_id);
    return contractor ? contractor.name : '-';
  };

  if (loading) return <CircularProgress />;

  return (
    <div>
      <Typography variant="h4" gutterBottom>Скважины</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      
      <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog} sx={{ mb: 2 }}>
        Добавить скважину
      </Button>

      <Paper>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell>ID</TableCell>
              <TableCell>ID скважины</TableCell>
              <TableCell>Название</TableCell>
              <TableCell>Куст</TableCell>
              <TableCell>Подрядчик</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Текущая глубина (м)</TableCell>
              <TableCell>Проектная глубина (м)</TableCell>
              <TableCell align="center">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {wells.map((w) => (
              <TableRow key={w.id} hover>
                <TableCell>{w.id}</TableCell>
                <TableCell><strong>{w.well_id}</strong></TableCell>
                <TableCell>{w.name || '-'}</TableCell>
                <TableCell>{getPadName(w.pad_id)}</TableCell>
                <TableCell>{getContractorName(w.pad_id)}</TableCell>
                <TableCell>
                  <Chip label={w.status === 'online' ? 'В работе' : 'Завершена'} 
                    color={w.status === 'online' ? 'success' : 'default'} size="small" />
                </TableCell>
                <TableCell>{w.current_depth} м</TableCell>
                <TableCell>{w.planned_depth} м</TableCell>
                <TableCell align="center">
                  <IconButton onClick={() => handleEdit(w)} color="primary" size="small">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => setDeleteConfirm({ open: true, id: w.id })} color="error" size="small">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {wells.length === 0 && (
              <TableRow><TableCell colSpan={9} align="center">Нет скважин. Добавьте первую.</TableCell></TableRow>
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
          <FormControl fullWidth margin="normal">
            <InputLabel>Статус</InputLabel>
            <Select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
              <MenuItem value="online">В работе</MenuItem>
              <MenuItem value="completed">Завершена</MenuItem>
            </Select>
          </FormControl>
          <TextField fullWidth label="Текущая глубина (м)" type="number" value={formData.current_depth} onChange={(e) => setFormData({ ...formData, current_depth: parseFloat(e.target.value) })} margin="normal" />
          <TextField fullWidth label="Проектная глубина (м)" type="number" value={formData.planned_depth} onChange={(e) => setFormData({ ...formData, planned_depth: parseFloat(e.target.value) })} margin="normal" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Отмена</Button>
          <Button onClick={handleSave} variant="contained">Сохранить</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, id: null })}>
        <DialogTitle>Подтверждение удаления</DialogTitle>
        <DialogContent>
          <Typography>Удалить скважину? Все связанные ГТИ данные и аналитика будут удалены.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ open: false, id: null })}>Отмена</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Удалить</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default WellsList;
