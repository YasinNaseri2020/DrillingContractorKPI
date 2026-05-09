import React, { useEffect, useState } from 'react';
import {
  Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  IconButton, CircularProgress, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface Contractor {
  id: number;
  name: string;
  inn?: string;
}

const API_URL = 'http://localhost:8000/api/contractors';

const ContractorsPage: React.FC = () => {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Contractor | null>(null);
  const [formData, setFormData] = useState({ name: '', inn: '' });
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });

  const loadData = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setContractors(data);
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
      setFormData({ name: '', inn: '' });
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
      <Typography variant="h4" gutterBottom>Подрядчики</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      
      <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingItem(null); setFormData({ name: '', inn: '' }); setOpenDialog(true); }} sx={{ mb: 2 }}>
        Добавить подрядчика
      </Button>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Название</TableCell>
              <TableCell>ИНН</TableCell>
              <TableCell align="center">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contractors.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.id}</TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.inn || '-'}</TableCell>
                <TableCell align="center">
                  <IconButton onClick={() => { setEditingItem(c); setFormData({ name: c.name, inn: c.inn || '' }); setOpenDialog(true); }} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => setDeleteConfirm({ open: true, id: c.id })} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {contractors.length === 0 && (
              <TableRow><TableCell colSpan={4} align="center">Нет подрядчиков. Добавьте первого.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingItem ? 'Редактировать подрядчика' : 'Новый подрядчик'}</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label="Название" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} margin="normal" required />
          <TextField fullWidth label="ИНН" value={formData.inn} onChange={(e) => setFormData({ ...formData, inn: e.target.value })} margin="normal" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Отмена</Button>
          <Button onClick={handleSave} variant="contained">Сохранить</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, id: null })}>
        <DialogTitle>Подтверждение удаления</DialogTitle>
        <DialogContent>
          <Typography>Удалить подрядчика? Все связанные кусты и скважины будут удалены.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ open: false, id: null })}>Отмена</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Удалить</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ContractorsPage;
