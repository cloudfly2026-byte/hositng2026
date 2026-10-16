'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import GroupAddRoundedIcon from '@mui/icons-material/GroupAddRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import KeyRoundedIcon from '@mui/icons-material/KeyRounded';
import { ModuleStateContainer } from '../../components/ModuleStateContainer';

export default function AccountPage() {
  const [state] = React.useState<'success'>('success');

  const members = [
    { name: 'Edwin', email: 'edwin@velupi.com', role: 'OWNER', status: 'Activo', twoFactor: true },
    { name: 'DevOps Lead', email: 'ops@velupi.com', role: 'ADMIN', status: 'Activo', twoFactor: true },
  ];

  const auditEvents = [
    { event: 'Inicio de sesión exitoso', actor: 'edwin@velupi.com', time: 'Hace 5 minutos', ip: '190.24.89.12' },
    { event: 'Certificado SSL renovado (velupi.com)', actor: 'Sistema Velupi', time: 'Hace 1 hora', ip: '127.0.0.1' },
    { event: 'Zona DNS verificada', actor: 'ops@velupi.com', time: 'Hace 3 horas', ip: '181.129.54.3' },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#2D1B17', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ManageAccountsRoundedIcon sx={{ color: '#FF6B00', fontSize: '2rem' }} /> Cuenta y Seguridad
          </Typography>
          <Typography variant="body1" sx={{ color: '#667085' }}>
            Control de identidades, miembros de la organización, roles RBAC, 2FA y auditoría inmutable de accesos.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" startIcon={<KeyRoundedIcon />} sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#F2E8DC', color: '#2D1B17', backgroundColor: '#FFFFFF', '&:hover': { borderColor: '#FF6B00', backgroundColor: '#FFFDF9' } }}>
            Gestionar API Keys
          </Button>
          <Button variant="contained" startIcon={<GroupAddRoundedIcon />} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, backgroundColor: '#FF6B00', '&:hover': { backgroundColor: '#E85A00' } }}>
            Invitar Miembro
          </Button>
        </Box>
      </Box>

      {/* Team Members */}
      <ModuleStateContainer state={state} emptyTitle="No hay miembros registrados" emptyMessage="Invita colaboradores a tu organización.">
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#2D1B17', mb: 2 }}>
          Miembros y Permisos RBAC
        </Typography>
        <Paper
          sx={{
            backgroundColor: '#FFFFFF',
            borderRadius: 3,
            border: '1px solid #F2E8DC',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            overflow: 'hidden',
            mb: 4,
          }}
        >
          {members.map((m) => (
            <Box
              key={m.email}
              sx={{
                p: 2.5,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2,
                borderBottom: '1px solid #F2E8DC',
                '&:last-child': { borderBottom: 'none' },
              }}
            >
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#2D1B17' }}>
                  {m.name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#667085' }}>
                  {m.email}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip
                  label={m.role}
                  size="small"
                  sx={{
                    backgroundColor: m.role === 'OWNER' ? '#FFF4E5' : '#EFF6FF',
                    color: m.role === 'OWNER' ? '#FF6B00' : '#1D4ED8',
                    fontWeight: 700,
                  }}
                />
                <Chip
                  label={m.twoFactor ? '2FA Activado' : '2FA Pendiente'}
                  size="small"
                  sx={{
                    backgroundColor: m.twoFactor ? '#D1FAE5' : '#FEE2E2',
                    color: m.twoFactor ? '#065F46' : '#991B1B',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                />
              </Box>
            </Box>
          ))}
        </Paper>

        {/* Audit Log */}
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#2D1B17', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryRoundedIcon sx={{ color: '#FF6B00' }} /> Registro Inmutable de Auditoría
        </Typography>
        <Paper
          sx={{
            backgroundColor: '#FFFFFF',
            borderRadius: 3,
            border: '1px solid #F2E8DC',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            overflow: 'hidden',
          }}
        >
          {auditEvents.map((evt, idx) => (
            <Box
              key={idx}
              sx={{
                p: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2,
                borderBottom: '1px solid #F2E8DC',
                '&:last-child': { borderBottom: 'none' },
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#2D1B17' }}>
                  {evt.event}
                </Typography>
                <Typography variant="caption" sx={{ color: '#667085' }}>
                  Actor: {evt.actor} &bull; IP: {evt.ip}
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#667085' }}>
                {evt.time}
              </Typography>
            </Box>
          ))}
        </Paper>
      </ModuleStateContainer>
    </Box>
  );
}
