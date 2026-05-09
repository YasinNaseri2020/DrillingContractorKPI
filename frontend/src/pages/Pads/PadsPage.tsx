import React, { useEffect, useState } from 'react';
import {
  Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  IconButton, CircularProgress, Alert, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface Pad {
  id: number;
  name: string;
  oilfield_id: number;
  contractor_id: number;
}

interface Oilfield {
  id: number;
  name: string;
}

interface Contractor {
  id: number;
  name: string;
}

const API_URL = 'http://localhost:8000/api/pads';
const OILFIELDS_URL = 'http://localhost:8000/api/oilfields';
const CONTRACTORS_URL = 'http://localhost:8000/api/contractors';

const PadsPage: React.FC = () => {
  const [pads, setPads] = useState<Pad[]>([]);
  const [oilfields, setOilfields] = useState<Oilfield[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Pad | null>(null);
  const [formData, setFormData] = useState({ name: '', oilfield_id: 0, contractor_id: 0 });
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });

  const loadData = async () => {
    try {
      console.log('📡 Загрузка данных...');
      const [padsRes, oilfieldsRes, contractorsRes] = await Promise.all([
        fetch(API_URL).then(r => r.json()),
        fetch(OILFIELDS_URL).then(r => r.json()),
        fetch(CONTRACTORS_URL).then(r => r.json())
      ]);
      setPads(padsRes);
      setOilfields(oilfieldsRes);
      setContractors(contractorsRes);
      console.log('✅ Загружено:', { pads: padsRes.length, oilfields: oilfieldsRes.length, contractors: contractorsRes.length });
    } catch (err) {
      console.error('❌ Ошибка загрузки:', err);
      setError('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (field: string, value: any) => {
    console.log(`🔄 Изменение поля ${field}:`, value);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    console.log('💾 Начало сохранения, formData:', formData);
    
    if (!formData.name.trim()) {
      setError('Название обязательно');
      return;
    }
    if (!formData.oilfield_id || formData.oilfield_id === 0) {
      setError('Выберите месторождение');
      return;
    }
    if (!formData.contractor_id || formData.contractor_id === 0) {
      setError('Выберите подрядчика');
      return;
    }
    
    const payload = {
      name: formData.name,
      oilfield_id: formData.oilfield_id,
      contractor_id: formData.contractor_id
    };
    
    console.log('📤 Отправка payload:', payload);
    
    try {
      let response;
      if (editingItem) {
        console.log('✏️ Редактирование, ID:', editingItem.id);
        response = await fetch(`${API_URL}/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        console.log('➕ Создание нового куста');
        response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      
      console.log('📡 Ответ сервера, статус:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Ошибка сервера:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Успешно сохранено:', result);
      
      setOpenDialog(false);
      setEditingItem(null);
      setFormData({ name: '', oilfield_id: 0, contractor_id: 0 });
      setError('');
      loadData();
    } catch (err) {
      console.error('❌ Ошибка сохранения:', err);
      setError('Ошибка сохранения');
    }
  };

  const handleEdit = (pad: Pad) => {
    console.log('✏️ Редактирование куста:', pad);
    setEditingItem(pad);
    setFormData({
      name: pad.name,
      oilfield_id: pad.oilfield_id,
      contractor_id: pad.contractor_id
    });
    setOpenDialog(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    console.log('🗑️ Удаление куста, ID:', deleteConfirm.id);
    try {
      const response = await fetch(`${API_URL}/${deleteConfirm.id}`, { method: 'DELETE' });
      console.log('📡 Ответ удаления, статус:', response.status);
      setDeleteConfirm({ open: false, id: null });
      loadData();
    } catch (err) {
      console.error('❌ Ошибка удаления:', err);
      setError('Ошибка удаления');
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <div>
      <Typography variant="h4" gutterBottom>Кусты</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      
      <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingItem(null); setFormData({ name: '', oilfield_id: 0, contractor_id: 0 }); setOpenDialog(true); }} sx={{ mb: 2 }}>
        Добавить куст
      </Button>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Название</TableCell>
              <TableCell>Месторождение</TableCell>
              <TableCell>Подрядчик</TableCell>
              <TableCell align="center">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pads.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.id}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>{oilfields.find(o => o.id === p.oilfield_id)?.name || '-'}</TableCell>
                <TableCell>{contractors.find(c => c.id === p.contractor_id)?.name || '-'}</TableCell>
                <TableCell align="center">
                  <IconButton onClick={() => handleEdit(p)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => setDeleteConfirm({ open: true, id: p.id })} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {pads.length === 0 && (
              <TableRow><TableCell colSpan={5} align="center">Нет кустов. Добавьте первый.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingItem ? 'Редактировать куст' : 'Новый куст'}</DialogTitle>
        <DialogContent>
          <TextField 
            autoFocus 
            fullWidth 
            label="Название куста" 
            value={formData.name} 
            onChange={(e) => handleChange('name', e.target.value)} 
            margin="normal" 
            required 
          />
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Месторождение</InputLabel>
            <Select 
              value={formData.oilfield_id} 
              onChange={(e) => handleChange('oilfield_id', e.target.value as number)}
            >
              <MenuItem value={0}>-- Выберите --</MenuItem>
              {oilfields.map(o => (
                <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Подрядчик</InputLabel>
            <Select 
              value={formData.contractor_id} 
              onChange={(e) => handleChange('contractor_id', e.target.value as number)}
            >
              <MenuItem value={0}>-- Выберите --</MenuItem>
              {contractors.map(c => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
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
          <Typography>Удалить куст? Все связанные скважины будут удалены.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ open: false, id: null })}>Отмена</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Удалить</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default PadsPage;

