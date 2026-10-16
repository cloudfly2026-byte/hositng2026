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
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#2D1B17', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AltRouteRoundedIcon sx={{ color: '#FF6B00', fontSize: '2rem' }} /> Application Gateway
          </Typography>
          <Typography variant="body1" sx={{ color: '#667085' }}>
            Proxy inverso perimetral, balanceo de carga, enrutamiento dinámico de dominios y políticas TLS.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRoundedIcon />} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, backgroundColor: '#FF6B00', '&:hover': { backgroundColor: '#E85A00' } }}>
          Nueva Regla de Enrutamiento
        </Button>
      </Box>

      <ModuleStateContainer state={state}>
        <Paper sx={{ backgroundColor: '#FFFFFF', borderRadius: 3, border: '1px solid #F2E8DC', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#FAF6F0', '& th': { color: '#667085', fontWeight: 700, fontSize: '0.8rem', borderColor: '#F2E8DC' } }}>
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
                  <TableRow key={i} sx={{ '& td': { color: '#2D1B17', borderColor: '#F2E8DC' }, '&:hover': { backgroundColor: '#FFFDF9' } }}>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#FF6B00' }}>{r.rule}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#2D1B17' }}>{r.target}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <SecurityRoundedIcon fontSize="small" sx={{ color: '#10B981' }} />
                        <Typography variant="caption" sx={{ color: '#667085' }}>{r.tls}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: '#667085', fontSize: '0.85rem' }}>{r.middleware}</TableCell>
                    <TableCell>
                      <Chip label={r.status} size="small" sx={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#D1FAE5', color: '#065F46' }} />
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
