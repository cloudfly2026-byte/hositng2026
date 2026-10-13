'use client';

import * as React from 'react';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import DnsIcon from '@mui/icons-material/Dns';
import StorageIcon from '@mui/icons-material/Storage';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CodeIcon from '@mui/icons-material/Code';
import WebIcon from '@mui/icons-material/Web';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* Hero Welcome */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', mb: 0.5 }}>
            Panel de Control
          </Typography>
          <Typography variant="body1" sx={{ color: '#9ca3af' }}>
            Bienvenido al portal de autoservicio de <strong>Velupi Cloud Platform</strong>.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            component={Link}
            href="/services/wordpress"
            variant="contained"
            color="primary"
            startIcon={<WebIcon />}
          >
            Site Tools: velupi.com
          </Button>
          <Button
            component={Link}
            href="/services/apps"
            variant="outlined"
            color="secondary"
            startIcon={<CodeIcon />}
          >
            Cloud Apps (Dokploy)
          </Button>
        </Box>
      </Box>

      {/* Nodes Status Grid */}
      <Typography variant="h6" sx={{ color: '#e5e7eb', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <StorageIcon fontSize="small" sx={{ color: '#06b6d4' }} /> Nodos de Infraestructura Activos
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* HestiaCP Node */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              backgroundColor: '#111827',
              borderRadius: 3,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: 'linear-gradient(90deg, #06b6d4, #10b981)',
              },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <DnsIcon sx={{ color: '#06b6d4' }} />
                <Typography variant="h6" sx={{ color: '#fff' }}>
                  HestiaCP Node (PHP / DNS)
                </Typography>
              </Box>
              <Chip label="ONLINE" size="small" color="success" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
            </Box>
            <Typography variant="body2" sx={{ color: '#9ca3af', mb: 2 }}>
              Host: <Box component="span" sx={{ color: '#e5e7eb', fontWeight: 600 }}>cloudfly.com.co</Box>
            </Typography>
            <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 1 }}>
              Nameservers activos: <code>ns1.cloudfly.com.co</code>, <code>ns2.cloudfly.com.co</code>
            </Typography>
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <Typography variant="caption" sx={{ color: '#9ca3af' }}>Cargas activas:</Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                <Chip label="velupi.com (WordPress)" size="small" sx={{ backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#67e8f9' }} />
                <Chip label="MariaDB / MySQL" size="small" sx={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#d1d5db' }} />
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Dokploy Node */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              backgroundColor: '#111827',
              borderRadius: 3,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
              },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <RocketLaunchIcon sx={{ color: '#818cf8' }} />
                <Typography variant="h6" sx={{ color: '#fff' }}>
                  Dokploy Node (shared-node-01)
                </Typography>
              </Box>
              <Chip label="ONLINE" size="small" color="success" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
            </Box>
            <Typography variant="body2" sx={{ color: '#9ca3af', mb: 2 }}>
              IP: <Box component="span" sx={{ color: '#e5e7eb', fontWeight: 600 }}>169.58.220.244</Box> (Cloud VPS 4 MP)
            </Typography>
            <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 1 }}>
              Ubicación: Hub Europe | Motor: Docker / Traefik
            </Typography>
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <Typography variant="caption" sx={{ color: '#9ca3af' }}>Capacidad de memoria reservada:</Typography>
              <LinearProgress variant="determinate" value={25} sx={{ my: 1, borderRadius: 2, height: 6 }} />
              <Typography variant="caption" sx={{ color: '#6b7280' }}>25% reservado — 12 GB RAM disponibles para nuevas aplicaciones</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Commercial & Entitlements Overview */}
      <Typography variant="h6" sx={{ color: '#e5e7eb', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <VerifiedUserIcon fontSize="small" sx={{ color: '#10b981' }} /> Organización y Suscripción Activa
      </Typography>

      <Paper sx={{ p: 3, backgroundColor: '#111827', borderRadius: 3, mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>
                Cliente Piloto #001: Velupi
              </Typography>
              <Chip label="INTERNAL PILOT" size="small" color="primary" sx={{ fontWeight: 700 }} />
            </Box>
            <Typography variant="body2" sx={{ color: '#9ca3af', mb: 1 }}>
              Plan contratado: <strong>Velupi Web Hosting (Shared Cloud)</strong> — Dominio raíz: <code>velupi.com</code>
            </Typography>
            <Typography variant="caption" sx={{ color: '#6b7280' }}>
              Orden Interna: <code>VEL-INTERNAL-001</code> | SSL: <strong>Let's Encrypt Activo</strong> | DNS: Delegado a <code>cloudfly.com.co</code>
            </Typography>
          </Grid>
          <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Button
              component={Link}
              href="/checkout"
              variant="outlined"
              color="primary"
              sx={{ mr: 1 }}
            >
              Ver Planes y Precios
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Hermes AI Assistant Quick Card */}
      <Paper
        sx={{
          p: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)',
          border: '1px solid rgba(6, 182, 212, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              backgroundColor: 'rgba(6, 182, 212, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#06b6d4',
            }}
          >
            <AutoAwesomeIcon fontSize="medium" />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
              Hermes AI Assistant (DevOps Copilot)
            </Typography>
            <Typography variant="body2" sx={{ color: '#9ca3af' }}>
              Modo Solo Lectura auditado. Consulta métricas, diagnostica logs de Apache/Docker y revisa el estado de salud de tu stack.
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" sx={{ background: 'linear-gradient(90deg, #06b6d4, #6366f1)', color: '#fff' }}>
          Consultar a Hermes
        </Button>
      </Paper>
    </Box>
  );
}
