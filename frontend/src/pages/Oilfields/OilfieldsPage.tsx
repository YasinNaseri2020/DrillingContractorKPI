import React, { useEffect, useState } from 'react';
import {
  Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  IconButton, CircularProgress, Alert, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface Oilfield {
  id: number;
  name: string;
  company_id: number;
}

interface Company {
  id: number;
  name: string;
}

const API_URL = 'http://localhost:8000/api/oilfields';
const COMPANIES_URL = 'http://localhost:8000/api/companies';

const OilfieldsPage: React.FC = () => {
  const [oilfields, setOilfields] = useState<Oilfield[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Oilfield | null>(null);
  const [formData, setFormData] = useState({ name: '', company_id: '' });
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });

  const loadData = async () => {
    try {
      const [oilfieldsRes, companiesRes] = await Promise.all([
        fetch(API_URL).then(r => r.json()),
        fetch(COMPANIES_URL).then(r => r.json())
      ]);
      setOilfields(oilfieldsRes);
      setCompanies(companiesRes);
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

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Название обязательно');
      return;
    }
    if (!formData.company_id) {
      setError('Выберите компанию');
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
      setFormData({ name: '', company_id: '' });
      setError('');
      loadData();
    } catch (err) {
      console.error(err);
      setError('Ошибка сохранения');
    }
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

  if (loading) return <CircularProgress />;

  return (
    <div>
      <Typography variant="h4" gutterBottom>Месторождения</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      
      <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingItem(null); setFormData({ name: '', company_id: '' }); setOpenDialog(true); }} sx={{ mb: 2 }}>
        Добавить месторождение
      </Button>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Название</TableCell>
              <TableCell>Компания</TableCell>
              <TableCell align="center">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {oilfields.map((o) => (
              <TableRow key={o.id}>
                <TableCell>{o.id}</TableCell>
                <TableCell>{o.name}</TableCell>
                <TableCell>{companies.find(c => c.id === o.company_id)?.name || '-'}</TableCell>
                <TableCell align="center">
                  <IconButton onClick={() => { setEditingItem(o); setFormData({ name: o.name, company_id: String(o.company_id) }); setOpenDialog(true); }} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => setDeleteConfirm({ open: true, id: o.id })} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {oilfields.length === 0 && (
              <TableRow><TableCell colSpan={4} align="center">Нет месторождений. Добавьте первое.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingItem ? 'Редактировать месторождение' : 'Новое месторождение'}</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label="Название" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} margin="normal" required />
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Компания</InputLabel>
            <Select value={formData.company_id} onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}>
              {companies.map(c => (
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
          <Typography>Удалить месторождение? Все связанные кусты и скважины будут удалены.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ open: false, id: null })}>Отмена</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Удалить</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default OilfieldsPage;
