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
import AlternateEmailRoundedIcon from '@mui/icons-material/AlternateEmailRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { ModuleStateContainer } from '../../components/ModuleStateContainer';

export default function EmailManagerPage() {
  const [state] = React.useState<'success'>('success');

  const accounts = [
    { email: 'contacto@velupi.com', quotaMb: 2048, usedMb: 110, forwarders: 1, status: 'ACTIVO' },
    { email: 'soporte@velupi.com', quotaMb: 5120, usedMb: 450, forwarders: 0, status: 'ACTIVO' },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AlternateEmailRoundedIcon sx={{ color: '#06b6d4', fontSize: '2rem' }} /> Email Manager
          </Typography>
          <Typography variant="body1" sx={{ color: '#9ca3af' }}>
            Cuentas corporativas bajo tu dominio con DKIM, SPF, protección antispam y cliente Webmail.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" endIcon={<OpenInNewRoundedIcon />} sx={{ borderColor: 'rgba(255, 255, 255, 0.15)', color: '#d1d5db', textTransform: 'none', borderRadius: '8px' }}>
            Webmail
          </Button>
          <Button variant="contained" color="primary" startIcon={<AddRoundedIcon />} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
            Nueva Cuenta de Correo
          </Button>
        </Box>
      </Box>

      <ModuleStateContainer state={state}>
        <Paper sx={{ backgroundColor: '#111827', borderRadius: 3, border: '1px solid rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { color: '#9ca3af', fontWeight: 600, fontSize: '0.8rem', borderColor: 'rgba(255, 255, 255, 0.06)' } }}>
                  <TableCell>Dirección de Correo</TableCell>
                  <TableCell>Cuota de Almacenamiento</TableCell>
                  <TableCell>Reenviadores</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accounts.map((acc) => (
                  <TableRow key={acc.email} sx={{ '& td': { color: '#e5e7eb', borderColor: 'rgba(255, 255, 255, 0.04)' } }}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {acc.email}
                      </Typography>
                    </TableCell>
                    <TableCell>{acc.usedMb} MB / {acc.quotaMb} MB</TableCell>
                    <TableCell>{acc.forwarders} activo</TableCell>
                    <TableCell>
                      <Chip label={acc.status} size="small" color="success" sx={{ fontSize: '0.7rem', fontWeight: 700 }} />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" sx={{ textTransform: 'none', color: '#06b6d4', fontWeight: 600 }}>
                        Configurar
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
