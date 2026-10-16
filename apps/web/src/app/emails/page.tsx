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
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#2D1B17', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AlternateEmailRoundedIcon sx={{ color: '#FF6B00', fontSize: '2rem' }} /> Email Manager
          </Typography>
          <Typography variant="body1" sx={{ color: '#667085' }}>
            Cuentas corporativas bajo tu dominio con DKIM, SPF, protección antispam y cliente Webmail.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" endIcon={<OpenInNewRoundedIcon />} sx={{ borderColor: '#F2E8DC', color: '#2D1B17', backgroundColor: '#FFFFFF', textTransform: 'none', borderRadius: 2, '&:hover': { borderColor: '#FF6B00', backgroundColor: '#FFFDF9' } }}>
            Webmail
          </Button>
          <Button variant="contained" startIcon={<AddRoundedIcon />} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, backgroundColor: '#FF6B00', '&:hover': { backgroundColor: '#E85A00' } }}>
            Nueva Cuenta de Correo
          </Button>
        </Box>
      </Box>

      <ModuleStateContainer state={state}>
        <Paper sx={{ backgroundColor: '#FFFFFF', borderRadius: 3, border: '1px solid #F2E8DC', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#FAF6F0', '& th': { color: '#667085', fontWeight: 700, fontSize: '0.8rem', borderColor: '#F2E8DC' } }}>
                  <TableCell>Dirección de Correo</TableCell>
                  <TableCell>Cuota de Almacenamiento</TableCell>
                  <TableCell>Reenviadores</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accounts.map((acc) => (
                  <TableRow key={acc.email} sx={{ '& td': { color: '#2D1B17', borderColor: '#F2E8DC' }, '&:hover': { backgroundColor: '#FFFDF9' } }}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#2D1B17' }}>
                        {acc.email}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: '#667085' }}>{acc.usedMb} MB / {acc.quotaMb} MB</TableCell>
                    <TableCell sx={{ color: '#667085' }}>{acc.forwarders} activo</TableCell>
                    <TableCell>
                      <Chip label={acc.status} size="small" sx={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#D1FAE5', color: '#065F46' }} />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" sx={{ textTransform: 'none', color: '#FF6B00', fontWeight: 600, '&:hover': { backgroundColor: '#FFF8ED' } }}>
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
