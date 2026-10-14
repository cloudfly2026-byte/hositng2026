'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';
import Link from 'next/link';
import { ModuleStateContainer } from '../../components/ModuleStateContainer';

export default function HostingWebPage() {
  const [state] = React.useState<'success'>('success');

  const sites = [
    {
      domain: 'velupi.com',
      type: 'WordPress Pro',
      phpVersion: 'PHP 8.3',
      ssl: 'Let\'s Encrypt Activo',
      status: 'HEALTHY',
      diskUsedMb: 420,
      diskLimitMb: 10240,
      toolsUrl: '/services/wordpress',
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LanguageRoundedIcon sx={{ color: '#06b6d4', fontSize: '2rem' }} /> Hosting Web
          </Typography>
          <Typography variant="body1" sx={{ color: '#9ca3af' }}>
            Administración centralizada de sitios web, WordPress, tiendas en línea y entornos PHP.
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<AddRoundedIcon />} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
          Crear Nuevo Sitio
        </Button>
      </Box>

      {/* Content */}
      <ModuleStateContainer state={state} emptyTitle="No hay sitios web configurados" emptyMessage="Crea tu primer sitio web o tienda WordPress para comenzar.">
        <Grid container spacing={3}>
          {sites.map((site) => (
            <Grid item xs={12} key={site.domain}>
              <Paper
                sx={{
                  p: 3,
                  backgroundColor: '#111827',
                  borderRadius: 3,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 2,
                }}
              >
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
                      {site.domain}
                    </Typography>
                    <Chip label={site.status} size="small" color="success" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                    <Chip label={site.type} size="small" sx={{ backgroundColor: 'rgba(6, 182, 212, 0.12)', color: '#67e8f9', fontWeight: 600, fontSize: '0.7rem' }} />
                  </Box>
                  <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                    Entorno: <strong>{site.phpVersion}</strong> | SSL: <span style={{ color: '#10b981' }}>{site.ssl}</span> | Disco: {site.diskUsedMb} MB / {site.diskLimitMb} MB
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Button
                    component={Link}
                    href={site.toolsUrl}
                    variant="contained"
                    color="primary"
                    startIcon={<SettingsRoundedIcon />}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                  >
                    Site Tools
                  </Button>
                  <Button
                    variant="outlined"
                    sx={{ borderColor: 'rgba(255, 255, 255, 0.15)', color: '#d1d5db', textTransform: 'none', borderRadius: '8px' }}
                    startIcon={<SpeedRoundedIcon />}
                  >
                    Métricas
                  </Button>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </ModuleStateContainer>
    </Box>
  );
}
