'use client';

import * as React from 'react';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import TerminalIcon from '@mui/icons-material/Terminal';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import GitHubIcon from '@mui/icons-material/GitHub';
import KeyIcon from '@mui/icons-material/Key';

export default function CloudAppsPage() {
  const [logs] = React.useState<string[]>([
    '[2026-10-13 18:25:01] [Dokploy] Pulling image node:20-alpine...',
    '[2026-10-13 18:25:05] [Dokploy] Container started with ID 89afc011e',
    '[2026-10-13 18:25:08] [Next.js] Ready in 1250ms on http://0.0.0.0:3000',
    '[2026-10-13 18:25:12] [Traefik] Router velupi-frontend mapped to https://myfrontend.apps.velupi.com',
    '[2026-10-13 18:25:14] [Traefik] Let\'s Encrypt TLS certificate active',
    '[2026-10-13 18:26:00] [App] GET / 200 OK in 14ms',
  ]);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff' }}>
              Next.js Frontend Container
            </Typography>
            <Chip label="Node.js 20 LTS" size="small" sx={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontWeight: 600 }} />
            <Chip label="HEALTHY" size="small" color="success" sx={{ fontWeight: 700 }} />
          </Box>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>
            Servidor: <strong>shared-node-01 (169.58.220.244)</strong> | Motor: <strong>Dokploy / Docker</strong>
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" color="primary" startIcon={<PlayArrowIcon />}>
            Redesplegar
          </Button>
          <Button variant="outlined" color="secondary" startIcon={<RefreshIcon />}>
            Reiniciar Contenedor
          </Button>
        </Box>
      </Box>

      {/* Grid: Git info and Env Vars */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, backgroundColor: '#111827', borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ color: '#fff', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <GitHubIcon sx={{ color: '#06b6d4' }} /> Origen del Código (Git)
            </Typography>
            <Typography variant="body2" sx={{ color: '#9ca3af', mb: 1 }}>
              Repositorio: <code>https://github.com/cloudfly2026-byte/hositng2026.git</code>
            </Typography>
            <Typography variant="body2" sx={{ color: '#9ca3af', mb: 2 }}>
              Rama: <strong>main</strong> (Autodeploy activado vía webhook)
            </Typography>
            <Chip label="Commit: f210bcf" size="small" sx={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#e5e7eb' }} />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, backgroundColor: '#111827', borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ color: '#fff', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <KeyIcon sx={{ color: '#818cf8' }} /> Variables de Entorno (Protegidas)
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ color: '#06b6d4' }}>NODE_ENV</Typography>
                <Typography variant="caption" sx={{ color: '#e5e7eb' }}>production</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ color: '#06b6d4' }}>PORT</Typography>
                <Typography variant="caption" sx={{ color: '#e5e7eb' }}>3000</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ color: '#06b6d4' }}>DATABASE_URL</Typography>
                <Typography variant="caption" sx={{ color: '#6b7280' }}>•••••••••••••••••••• (Secret Vault)</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Live Logs Terminal */}
      <Paper sx={{ p: 3, backgroundColor: '#0d1117', borderRadius: 3, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.95rem' }}>
            <TerminalIcon sx={{ color: '#10b981' }} /> Consola de Logs en Vivo (Dokploy Container)
          </Typography>
          <Chip label="STREAMING" size="small" color="success" sx={{ fontSize: '0.65rem', height: 20 }} />
        </Box>
        <Box
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.82rem',
            lineHeight: 1.6,
            color: '#7ee787',
            backgroundColor: '#030712',
            p: 2,
            borderRadius: 2,
            maxHeight: 300,
            overflowY: 'auto',
          }}
        >
          {logs.map((log, index) => (
            <Box key={index} sx={{ py: 0.2 }}>{log}</Box>
          ))}
        </Box>
      </Paper>
    </Box>
  );
}
