import React from 'react';
import { Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';

const WellsComparison: React.FC = () => {
  return (
    <div>
      <Typography variant="h4" gutterBottom>Сравнение подрядчиков</Typography>
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Подрядчик</TableCell>
              <TableCell>Общий балл</TableCell>
              <TableCell>М1</TableCell><TableCell>М2</TableCell><TableCell>М3</TableCell>
              <TableCell>М4</TableCell><TableCell>М5</TableCell><TableCell>М6</TableCell>
              <TableCell>М7</TableCell><TableCell>М8</TableCell><TableCell>М9</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell colSpan={11} align="center">Нет данных для сравнения</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>
    </div>
  );
};

export default WellsComparison;
