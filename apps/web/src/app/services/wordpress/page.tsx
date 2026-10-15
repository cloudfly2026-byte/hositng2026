'use client';

import * as React from 'react';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import SecurityIcon from '@mui/icons-material/Security';
import StorageIcon from '@mui/icons-material/Storage';
import BackupIcon from '@mui/icons-material/Backup';
import FolderIcon from '@mui/icons-material/Folder';
import SpeedIcon from '@mui/icons-material/Speed';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import { defaultApiClient } from '../../../modules/api-client';

export default function WordPressSiteToolsPage() {
  const [phpVersion, setPhpVersion] = React.useState('8.2');
  const [backupStatus, setBackupStatus] = React.useState<'idle' | 'running' | 'success'>('idle');
  const [activeSite, setActiveSite] = React.useState<{ domain: string; phpVersion: string; sslEnabled: boolean } | null>(null);

  React.useEffect(() => {
    defaultApiClient
      .listHostingSites()
      .then((sites) => {
        if (Array.isArray(sites) && sites.length > 0) {
          const s = sites[0];
          setActiveSite(s);
          if (s.phpVersion) setPhpVersion(s.phpVersion);
        }
      })
      .catch(() => {
        // Fallback for offline/unauthenticated preview
      });
  }, []);

  const triggerBackup = () => {
    setBackupStatus('running');
    setTimeout(() => {
      setBackupStatus('success');
    }, 1500);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff' }}>
              {activeSite?.domain || 'velupi.com'}
            </Typography>
            <Chip label="WordPress 6.7" size="small" sx={{ backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#67e8f9', fontWeight: 600 }} />
            <Chip label="ACTIVO" size="small" color="success" sx={{ fontWeight: 700 }} />
          </Box>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>
            Servidor: <strong>shared-node-01</strong> | IP: <code>89.117.147.134</code> | Nameservers: <code>ns1/ns2.velupi.com</code>
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            color="primary"
            endIcon={<OpenInNewIcon />}
            href={`https://${activeSite?.domain || 'velupi.com'}`}
            target="_blank"
          >
            Visitar Sitio Web
          </Button>
        </Box>
      </Box>

      {/* Site Tools Action Grid */}
      <Typography variant="h6" sx={{ color: '#e5e7eb', mb: 2 }}>
        Site Tools — Administración Contextual
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* SSL / Security */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: '#111827', height: '100%' }}>
            <CardContent>
              <SecurityIcon sx={{ color: '#10b981', fontSize: 36, mb: 1.5 }} />
              <Typography variant="h6" sx={{ color: '#fff', mb: 0.5 }}>
                Certificado SSL/TLS
              </Typography>
              <Typography variant="body2" sx={{ color: '#9ca3af', mb: 2, fontSize: '0.85rem' }}>
                Let's Encrypt automático configurado con renovación cada 90 días.
              </Typography>
              <Chip
                icon={<CheckCircleIcon />}
                label="HTTPS Forzado (HSTS)"
                size="small"
                color="success"
                sx={{ fontWeight: 600 }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* PHP Version & Settings */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: '#111827', height: '100%' }}>
            <CardContent>
              <SpeedIcon sx={{ color: '#06b6d4', fontSize: 36, mb: 1.5 }} />
              <Typography variant="h6" sx={{ color: '#fff', mb: 0.5 }}>
                Versión de PHP
              </Typography>
              <Typography variant="body2" sx={{ color: '#9ca3af', mb: 2, fontSize: '0.85rem' }}>
                Runtime PHP-FPM acelerado con OPcache y memoria límite de 512MB.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant={phpVersion === '8.2' ? 'contained' : 'outlined'}
                  color="primary"
                  onClick={() => setPhpVersion('8.2')}
                >
                  PHP 8.2
                </Button>
                <Button
                  size="small"
                  variant={phpVersion === '8.3' ? 'contained' : 'outlined'}
                  color="primary"
                  onClick={() => setPhpVersion('8.3')}
                >
                  PHP 8.3
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Database */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: '#111827', height: '100%' }}>
            <CardContent>
              <StorageIcon sx={{ color: '#818cf8', fontSize: 36, mb: 1.5 }} />
              <Typography variant="h6" sx={{ color: '#fff', mb: 0.5 }}>
                Bases de Datos
              </Typography>
              <Typography variant="body2" sx={{ color: '#9ca3af', mb: 2, fontSize: '0.85rem' }}>
                MariaDB 10.11 administrada con optimización para WooCommerce.
              </Typography>
              <Button size="small" variant="outlined" color="secondary" fullWidth>
                Abrir phpMyAdmin
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Backups */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: '#111827', height: '100%' }}>
            <CardContent>
              <BackupIcon sx={{ color: '#f59e0b', fontSize: 36, mb: 1.5 }} />
              <Typography variant="h6" sx={{ color: '#fff', mb: 0.5 }}>
                Copias de Seguridad
              </Typography>
              <Typography variant="body2" sx={{ color: '#9ca3af', mb: 2, fontSize: '0.85rem' }}>
                Copias diarias automáticas guardadas en almacenamiento seguro fuera de nodo.
              </Typography>
              <Button
                size="small"
                variant="contained"
                color="warning"
                fullWidth
                disabled={backupStatus === 'running'}
                onClick={triggerBackup}
              >
                {backupStatus === 'running'
                  ? 'Generando Backup...'
                  : backupStatus === 'success'
                  ? 'Backup Creado!'
                  : 'Crear Backup Ahora'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* File Manager and Domains Details */}
      <Paper sx={{ p: 3, backgroundColor: '#111827', borderRadius: 3 }}>
        <Typography variant="h6" sx={{ color: '#fff', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <FolderIcon sx={{ color: '#06b6d4' }} /> Configuración DNS y Archivos del Vhost
        </Typography>
        <Typography variant="body2" sx={{ color: '#9ca3af', mb: 2 }}>
          Ruta del sitio: <code>/home/u_velupi/web/velupi.com/public_html</code>
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip label="DNS A: 89.117.147.134" variant="outlined" sx={{ color: '#e5e7eb' }} />
          <Chip label="Nameservers: ns1/ns2.cloudfly.com.co" variant="outlined" sx={{ color: '#e5e7eb' }} />
          <Chip label="Glue Hostnames: ns1/ns2.velupi.com → 89.117.147.134" variant="outlined" sx={{ color: '#06b6d4', borderColor: 'rgba(6, 182, 212, 0.4)' }} />
        </Box>
      </Paper>
    </Box>
  );
}
