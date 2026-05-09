import React, { useEffect, useState } from 'react';
import {
  Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  IconButton, CircularProgress, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface Company {
  id: number;
  name: string;
  description?: string;
  inn?: string;
}

const API_URL = 'http://localhost:8000/api/companies';

const CompaniesPage: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', inn: '' });
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; companyId: number | null }>({ open: false, companyId: null });

  const loadCompanies = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setCompanies(data);
    } catch (err) {
      console.error(err);
      setError('Ошибка загрузки компаний');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Название обязательно');
      return;
    }
    try {
      if (editingCompany) {
        await fetch(`${API_URL}/${editingCompany.id}`, {
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
      setEditingCompany(null);
      setFormData({ name: '', description: '', inn: '' });
      setError('');
      loadCompanies();
    } catch (err) {
      console.error(err);
      setError('Ошибка сохранения');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.companyId) return;
    try {
      await fetch(`${API_URL}/${deleteConfirm.companyId}`, { method: 'DELETE' });
      setDeleteConfirm({ open: false, companyId: null });
      loadCompanies();
    } catch (err) {
      console.error(err);
      setError('Ошибка удаления');
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <div>
      <Typography variant="h4" gutterBottom>Компании</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      
      <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingCompany(null); setFormData({ name: '', description: '', inn: '' }); setOpenDialog(true); }} sx={{ mb: 2 }}>
        Добавить компанию
      </Button>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Название</TableCell>
              <TableCell>Описание</TableCell>
              <TableCell>ИНН</TableCell>
              <TableCell align="center">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {companies.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.id}</TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.description || '-'}</TableCell>
                <TableCell>{c.inn || '-'}</TableCell>
                <TableCell align="center">
                  <IconButton onClick={() => { setEditingCompany(c); setFormData({ name: c.name, description: c.description || '', inn: c.inn || '' }); setOpenDialog(true); }} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => setDeleteConfirm({ open: true, companyId: c.id })} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {companies.length === 0 && (
              <TableRow><TableCell colSpan={5} align="center">Нет компаний. Добавьте первую.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Диалог добавления/редактирования */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCompany ? 'Редактировать компанию' : 'Новая компания'}</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label="Название" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} margin="normal" required />
          <TextField fullWidth label="Описание" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} margin="normal" />
          <TextField fullWidth label="ИНН" value={formData.inn} onChange={(e) => setFormData({ ...formData, inn: e.target.value })} margin="normal" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Отмена</Button>
          <Button onClick={handleSave} variant="contained">Сохранить</Button>
        </DialogActions>
      </Dialog>

      {/* Диалог подтверждения удаления */}
      <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, companyId: null })}>
        <DialogTitle>Подтверждение удаления</DialogTitle>
        <DialogContent>
          <Typography>Удалить компанию? Все связанные данные (подрядчики, месторождения, кусты, скважины) будут удалены.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ open: false, companyId: null })}>Отмена</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Удалить</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default CompaniesPage;
