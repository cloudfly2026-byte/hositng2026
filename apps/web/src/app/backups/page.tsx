'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import BackupRoundedIcon from '@mui/icons-material/BackupRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import RestoreRoundedIcon from '@mui/icons-material/RestoreRounded';
import { ModuleStateContainer } from '../../components/ModuleStateContainer';

export default function BackupsPage() {
  const [state] = React.useState<'success'>('success');

  const backups = [
    { id: 'bck-20261013-daily', service: 'velupi.com (Full)', size: '340 MB', type: 'Automático Diario', date: '2026-10-13 04:00' },
    { id: 'bck-20261012-daily', service: 'velupi.com (Full)', size: '338 MB', type: 'Automático Diario', date: '2026-10-12 04:00' },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#2D1B17', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <BackupRoundedIcon sx={{ color: '#FF6B00', fontSize: '2rem' }} /> Backups & Snapshots
          </Typography>
          <Typography variant="body1" sx={{ color: '#667085' }}>
            Copias de seguridad automáticas con retención de 30 días y puntos de restauración con un clic.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRoundedIcon />} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, backgroundColor: '#FF6B00', '&:hover': { backgroundColor: '#E85A00' } }}>
          Generar Backup Inmediato
        </Button>
      </Box>

      <ModuleStateContainer state={state}>
        <Paper sx={{ backgroundColor: '#FFFFFF', borderRadius: 3, border: '1px solid #F2E8DC', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#FAF6F0', '& th': { color: '#667085', fontWeight: 700, fontSize: '0.8rem', borderColor: '#F2E8DC' } }}>
                  <TableCell>Identificador</TableCell>
                  <TableCell>Servicio</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Tamaño</TableCell>
                  <TableCell>Fecha de Creación</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {backups.map((b) => (
                  <TableRow key={b.id} sx={{ '& td': { color: '#2D1B17', borderColor: '#F2E8DC' }, '&:hover': { backgroundColor: '#FFFDF9' } }}>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#2D1B17' }}>{b.id}</TableCell>
                    <TableCell sx={{ color: '#2D1B17' }}>{b.service}</TableCell>
                    <TableCell>
                      <Chip label={b.type} size="small" sx={{ backgroundColor: '#FFF4E5', color: '#FF6B00', fontSize: '0.75rem', fontWeight: 600 }} />
                    </TableCell>
                    <TableCell sx={{ color: '#667085' }}>{b.size}</TableCell>
                    <TableCell sx={{ color: '#667085' }}>{b.date}</TableCell>
                    <TableCell align="right">
                      <Button size="small" startIcon={<RestoreRoundedIcon />} sx={{ textTransform: 'none', color: '#FF6B00', fontWeight: 600, mr: 1, '&:hover': { backgroundColor: '#FFF8ED' } }}>
                        Restaurar
                      </Button>
                      <Button size="small" startIcon={<DownloadRoundedIcon />} sx={{ textTransform: 'none', color: '#667085' }}>
                        Descargar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </ModuleStateContainer>
    </Box>
  );
}
