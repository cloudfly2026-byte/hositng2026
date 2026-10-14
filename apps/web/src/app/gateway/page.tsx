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
import AltRouteRoundedIcon from '@mui/icons-material/AltRouteRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import { ModuleStateContainer } from '../../components/ModuleStateContainer';

export default function ApplicationGatewayPage() {
  const [state] = React.useState<'success'>('success');

  const routes = [
    { rule: 'Host(`api.velupi.com`)', target: 'velupi-api:4000', tls: 'Let\'s Encrypt (Automático)', middleware: 'RateLimit, CORS', status: 'HEALTHY' },
    { rule: 'Host(`app.velupi.com`)', target: 'velupi-web:3000', tls: 'Let\'s Encrypt (Automático)', middleware: 'SecurityHeaders', status: 'HEALTHY' },
    { rule: 'Host(`velupi.com`)', target: '89.117.147.134:443', tls: 'Let\'s Encrypt (Passthrough)', middleware: 'None', status: 'HEALTHY' },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AltRouteRoundedIcon sx={{ color: '#06b6d4', fontSize: '2rem' }} /> Application Gateway
          </Typography>
          <Typography variant="body1" sx={{ color: '#9ca3af' }}>
            Proxy inverso perimetral, balanceo de carga, enrutamiento dinámico de dominios y políticas TLS.
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<AddRoundedIcon />} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
          Nueva Regla de Enrutamiento
        </Button>
      </Box>

      <ModuleStateContainer state={state}>
        <Paper sx={{ backgroundColor: '#111827', borderRadius: 3, border: '1px solid rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { color: '#9ca3af', fontWeight: 600, fontSize: '0.8rem', borderColor: 'rgba(255, 255, 255, 0.06)' } }}>
                  <TableCell>Regla de Entrada (Host/Path)</TableCell>
                  <TableCell>Destino Interno</TableCell>
                  <TableCell>Terminación TLS</TableCell>
                  <TableCell>Middlewares</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {routes.map((r, i) => (
                  <TableRow key={i} sx={{ '& td': { color: '#e5e7eb', borderColor: 'rgba(255, 255, 255, 0.04)' } }}>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#67e8f9' }}>{r.rule}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{r.target}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <SecurityRoundedIcon fontSize="small" sx={{ color: '#10b981' }} />
                        <Typography variant="caption" sx={{ color: '#d1d5db' }}>{r.tls}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: '#9ca3af', fontSize: '0.85rem' }}>{r.middleware}</TableCell>
                    <TableCell>
                      <Chip label={r.status} size="small" color="success" sx={{ fontSize: '0.7rem', fontWeight: 700 }} />
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
