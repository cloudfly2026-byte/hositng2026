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
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ManageAccountsRoundedIcon sx={{ color: '#06b6d4', fontSize: '2rem' }} /> Cuenta y Seguridad
          </Typography>
          <Typography variant="body1" sx={{ color: '#9ca3af' }}>
            Control de identidades, miembros de la organización, roles RBAC, 2FA y auditoría inmutable de accesos.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" startIcon={<KeyRoundedIcon />} sx={{ borderRadius: '8px', textTransform: 'none', borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }}>
            Gestionar API Keys
          </Button>
          <Button variant="contained" color="primary" startIcon={<GroupAddRoundedIcon />} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
            Invitar Miembro
          </Button>
        </Box>
      </Box>

      {/* Team Members */}
      <ModuleStateContainer state={state} emptyTitle="No hay miembros registrados" emptyMessage="Invita colaboradores a tu organización.">
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', mb: 2 }}>
          Miembros y Permisos RBAC
        </Typography>
        <Paper
          sx={{
            backgroundColor: '#111827',
            borderRadius: 3,
            border: '1px solid rgba(255, 255, 255, 0.08)',
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
                borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
              }}
            >
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#fff' }}>
                  {m.name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                  {m.email}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip
                  label={m.role}
                  size="small"
                  sx={{
                    backgroundColor: m.role === 'OWNER' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                    color: m.role === 'OWNER' ? '#22d3ee' : '#60a5fa',
                    fontWeight: 700,
                  }}
                />
                <Chip
                  label={m.twoFactor ? '2FA Activado' : '2FA Pendiente'}
                  size="small"
                  sx={{
                    backgroundColor: m.twoFactor ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: m.twoFactor ? '#34d399' : '#f87171',
                    fontSize: '0.75rem',
                  }}
                />
              </Box>
            </Box>
          ))}
        </Paper>

        {/* Audit Log */}
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryRoundedIcon sx={{ color: '#06b6d4' }} /> Registro Inmutable de Auditoría
        </Typography>
        <Paper
          sx={{
            backgroundColor: '#111827',
            borderRadius: 3,
            border: '1px solid rgba(255, 255, 255, 0.08)',
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
                borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#f3f4f6' }}>
                  {evt.event}
                </Typography>
                <Typography variant="caption" sx={{ color: '#6b7280' }}>
                  Actor: {evt.actor} &bull; IP: {evt.ip}
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                {evt.time}
              </Typography>
            </Box>
          ))}
        </Paper>
      </ModuleStateContainer>
    </Box>
  );
}
