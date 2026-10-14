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
import Alert from '@mui/material/Alert';
import DnsRoundedIcon from '@mui/icons-material/DnsRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { ModuleStateContainer } from '../../components/ModuleStateContainer';

export default function DnsManagerPage() {
  const [state] = React.useState<'success'>('success');

  const records = [
    { name: '@', type: 'A', value: '89.117.147.134', ttl: 14400 },
    { name: 'www', type: 'CNAME', value: 'velupi.com.', ttl: 14400 },
    { name: 'ns1', type: 'A', value: '89.117.147.134', ttl: 14400 },
    { name: 'ns2', type: 'A', value: '89.117.147.134', ttl: 14400 },
    { name: 'mail', type: 'A', value: '89.117.147.134', ttl: 14400 },
    { name: '@', type: 'MX', value: 'mail.velupi.com. (10)', ttl: 14400 },
    { name: '@', type: 'TXT', value: '"v=spf1 a mx ip4:89.117.147.134 ~all"', ttl: 14400 },
    { name: 'api', type: 'A', value: '169.58.220.244', ttl: 3600 },
    { name: 'app', type: 'A', value: '169.58.220.244', ttl: 3600 },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <DnsRoundedIcon sx={{ color: '#06b6d4', fontSize: '2rem' }} /> DNS Manager
          </Typography>
          <Typography variant="body1" sx={{ color: '#9ca3af' }}>
            Servidor de nombres autoritativo, administración de zonas DNS y propagación de registros.
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<AddRoundedIcon />} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
          Agregar Registro DNS
        </Button>
      </Box>

      {/* Nameservers Banner */}
      <Alert
        severity="info"
        variant="outlined"
        sx={{
          mb: 3,
          backgroundColor: 'rgba(6, 182, 212, 0.08)',
          borderColor: 'rgba(6, 182, 212, 0.3)',
          color: '#e5e7eb',
        }}
      >
        <strong>Servidores de Nombres Autoritativos de Velupi:</strong> <code>ns1.velupi.com</code> y <code>ns2.velupi.com</code>
      </Alert>

      <ModuleStateContainer state={state}>
        <Paper sx={{ backgroundColor: '#111827', borderRadius: 3, border: '1px solid rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 700 }}>
              Zona Activa: velupi.com (9 registros)
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { color: '#9ca3af', fontWeight: 600, fontSize: '0.8rem', borderColor: 'rgba(255, 255, 255, 0.06)' } }}>
                  <TableCell>Host / Nombre</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Destino / Valor</TableCell>
                  <TableCell>TTL</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((r, i) => (
                  <TableRow key={i} sx={{ '& td': { color: '#e5e7eb', borderColor: 'rgba(255, 255, 255, 0.04)' } }}>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={r.type}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          backgroundColor: r.type === 'A' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                          color: r.type === 'A' ? '#67e8f9' : '#a5b4fc',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{r.value}</TableCell>
                    <TableCell>{r.ttl}s</TableCell>
                    <TableCell align="right">
                      <Button size="small" sx={{ textTransform: 'none', color: '#06b6d4', fontWeight: 600 }}>
                        Editar
                      </Button>
                      <Button size="small" color="error" sx={{ textTransform: 'none', ml: 1 }}>
                        Eliminar
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
