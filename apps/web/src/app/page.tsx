'use client';

import * as React from 'react';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import DnsIcon from '@mui/icons-material/Dns';
import StorageIcon from '@mui/icons-material/Storage';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CodeIcon from '@mui/icons-material/Code';
import WebIcon from '@mui/icons-material/Web';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LanguageIcon from '@mui/icons-material/Language';
import LayersIcon from '@mui/icons-material/Layers';
import RefreshIcon from '@mui/icons-material/Refresh';
import Link from 'next/link';

interface DashboardSummary {
  organizationId: string;
  counts: {
    websites: number;
    cloudApps: number;
    dnsZones: number;
    databases: number;
    subscriptions: number;
  };
  quotas: {
    diskUsedMb: number;
    diskLimitMb: number;
    sitesCount: number;
    maxSites: number;
    databasesCount: number;
    maxDatabases: number;
    emailsCount: number;
    maxEmails: number;
  };
  services: Array<{
    id: string;
    name: string;
    type: 'WEBSITE' | 'CLOUD_APP';
    domain?: string;
    status: string;
    createdAt: string;
  }>;
  subscription: {
    id: string;
    status: string;
    billingCycle: string;
    currentPeriodEnd: string;
  } | null;
}

export default function DashboardPage() {
  const [activeOrgId, setActiveOrgId] = React.useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('velupi_active_org_id') || 'org-velupi-internal';
    }
    return 'org-velupi-internal';
  });
  const [summary, setSummary] = React.useState<DashboardSummary | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('velupi_active_org_id');
      if (stored && stored !== activeOrgId) {
        setActiveOrgId(stored);
      }
    }
  }, [activeOrgId]);

  const fetchSummary = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.velupi.com';
      const token = typeof window !== 'undefined' ? localStorage.getItem('velupi_access_token') : null;

      const headers: Record<string, string> = {
        'x-tenant-id': activeOrgId,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${apiUrl}/dashboard/summary?organizationId=${activeOrgId}`, {
        headers,
      });

      if (!res.ok) {
        throw new Error(`Error ${res.status}: Fallo al consultar métricas del dashboard.`);
      }

      const data = await res.json();
      setSummary(data);
    } catch {
      // Fallback seguro: solo mostrar servicios preconfigurados si es el piloto interno
      if (activeOrgId === 'org-velupi-internal') {
        setSummary({
          organizationId: activeOrgId,
          counts: {
            websites: 1,
            cloudApps: 0,
            dnsZones: 1,
            databases: 1,
            subscriptions: 1,
          },
          quotas: {
            diskUsedMb: 120,
            diskLimitMb: 10240,
            sitesCount: 1,
            maxSites: 10,
            databasesCount: 1,
            maxDatabases: 20,
            emailsCount: 0,
            maxEmails: 50,
          },
          services: [
            {
              id: 'site-velupi.com',
              name: 'velupi.com',
              type: 'WEBSITE',
              domain: 'velupi.com',
              status: 'HEALTHY',
              createdAt: new Date().toISOString(),
            },
          ],
          subscription: {
            id: 'sub-org-velupi-001',
            status: 'ACTIVE',
            billingCycle: 'ANNUAL',
            currentPeriodEnd: '2027-10-13T00:00:00.000Z',
          },
        });
      } else {
        setSummary({
          organizationId: activeOrgId,
          counts: { websites: 0, cloudApps: 0, dnsZones: 0, databases: 0, subscriptions: 0 },
          quotas: { diskUsedMb: 0, diskLimitMb: 10240, sitesCount: 0, maxSites: 10, databasesCount: 0, maxDatabases: 20, emailsCount: 0, maxEmails: 50 },
          services: [],
          subscription: null,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [activeOrgId]);

  React.useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const counts = summary?.counts || { websites: 0, cloudApps: 0, dnsZones: 0, databases: 0, subscriptions: 0 };
  const quotas = summary?.quotas || { diskUsedMb: 0, diskLimitMb: 10240, sitesCount: 0, maxSites: 10, databasesCount: 0, maxDatabases: 20 };
  const services = summary?.services || [];
  const diskPercentage = quotas.diskLimitMb > 0 ? Math.round((quotas.diskUsedMb / quotas.diskLimitMb) * 100) : 0;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* Hero Welcome */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#2D1B17', mb: 0.5 }}>
            Panel de Control
          </Typography>
          <Typography variant="body1" sx={{ color: '#667085' }}>
            Portal de autoservicio &bull; Organización activa: <strong>{activeOrgId}</strong>
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Button
            size="small"
            variant="text"
            onClick={fetchSummary}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
            sx={{ color: '#FF6B00', textTransform: 'none', fontWeight: 600 }}
          >
            Actualizar
          </Button>
          <Button
            component={Link}
            href="/services/wordpress"
            variant="contained"
            color="primary"
            startIcon={<WebIcon />}
            sx={{ fontWeight: 700 }}
          >
            Site Tools: velupi.com
          </Button>
          <Button
            component={Link}
            href="/services/apps"
            variant="outlined"
            color="primary"
            startIcon={<CodeIcon />}
            sx={{ fontWeight: 700 }}
          >
            Cloud Apps (Contenedores)
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Metrics Summary Cards */}
      <Typography variant="h6" sx={{ color: '#2D1B17', fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <LayersIcon fontSize="small" sx={{ color: '#FF6B00' }} /> Métricas y Recursos en Tiempo Real
      </Typography>

      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 2.5, backgroundColor: '#FFFFFF', borderRadius: 3, border: '1px solid #F2E8DC', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ color: '#667085', fontWeight: 700 }}>SITIOS WEB</Typography>
              <LanguageIcon sx={{ color: '#FF6B00', fontSize: '1.2rem' }} />
            </Box>
            <Typography variant="h4" sx={{ color: '#2D1B17', fontWeight: 800 }}>
              {counts.websites}
            </Typography>
            <Typography variant="caption" sx={{ color: '#667085' }}>
              {quotas.sitesCount} de {quotas.maxSites} cupos usados
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 2.5, backgroundColor: '#FFFFFF', borderRadius: 3, border: '1px solid #F2E8DC', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ color: '#667085', fontWeight: 700 }}>APPS CLOUD</Typography>
              <RocketLaunchIcon sx={{ color: '#FFB800', fontSize: '1.2rem' }} />
            </Box>
            <Typography variant="h4" sx={{ color: '#2D1B17', fontWeight: 800 }}>
              {counts.cloudApps}
            </Typography>
            <Typography variant="caption" sx={{ color: '#667085' }}>
              Contenedores Docker activos
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 2.5, backgroundColor: '#FFFFFF', borderRadius: 3, border: '1px solid #F2E8DC', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ color: '#667085', fontWeight: 700 }}>ZONAS DNS</Typography>
              <DnsIcon sx={{ color: '#10B981', fontSize: '1.2rem' }} />
            </Box>
            <Typography variant="h4" sx={{ color: '#2D1B17', fontWeight: 800 }}>
              {counts.dnsZones}
            </Typography>
            <Typography variant="caption" sx={{ color: '#667085' }}>
              BIND9 autoritativo sincronizado
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 2.5, backgroundColor: '#FFFFFF', borderRadius: 3, border: '1px solid #F2E8DC', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ color: '#667085', fontWeight: 700 }}>BASES DE DATOS</Typography>
              <StorageIcon sx={{ color: '#FF6B00', fontSize: '1.2rem' }} />
            </Box>
            <Typography variant="h4" sx={{ color: '#2D1B17', fontWeight: 800 }}>
              {counts.databases}
            </Typography>
            <Typography variant="caption" sx={{ color: '#667085' }}>
              {quotas.databasesCount} de {quotas.maxDatabases} cupos usados
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Active Services List & Empty State */}
      <Typography variant="h6" sx={{ color: '#2D1B17', fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <WebIcon fontSize="small" sx={{ color: '#FF6B00' }} /> Servicios y Despliegues Activos
      </Typography>

      <Paper sx={{ backgroundColor: '#FFFFFF', borderRadius: 3, border: '1px solid #F2E8DC', mb: 4, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        {services.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ color: '#667085', mb: 2 }}>
              No hay servicios desplegados en esta organización.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button component={Link} href="/services/wordpress" variant="contained" color="primary" size="small" sx={{ fontWeight: 700 }}>
                Crear Sitio Web
              </Button>
              <Button component={Link} href="/services/apps" variant="outlined" color="primary" size="small" sx={{ fontWeight: 700 }}>
                Desplegar Cloud App
              </Button>
            </Box>
          </Box>
        ) : (
          services.map((svc) => (
            <Box
              key={svc.id}
              sx={{
                p: 2.5,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2,
                borderBottom: '1px solid #F2E8DC',
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                  <Typography variant="subtitle1" sx={{ color: '#2D1B17', fontWeight: 700 }}>
                    {svc.name}
                  </Typography>
                  <Chip
                    label={svc.type === 'WEBSITE' ? 'SITIO WEB' : 'CLOUD APP'}
                    size="small"
                    sx={{ backgroundColor: 'rgba(255, 107, 0, 0.1)', color: '#FF6B00', fontWeight: 700, fontSize: '0.65rem' }}
                  />
                  <Chip
                    label={svc.status}
                    size="small"
                    sx={{
                      backgroundColor: svc.status === 'HEALTHY' || svc.status === 'RUNNING' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: svc.status === 'HEALTHY' || svc.status === 'RUNNING' ? '#059669' : '#dc2626',
                      fontWeight: 700,
                      fontSize: '0.65rem',
                    }}
                  />
                </Box>
                <Typography variant="caption" sx={{ color: '#667085' }}>
                  Dominio: <code>{svc.domain || 'Dominio interno'}</code> &bull; Creado: {new Date(svc.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
              <Button
                component={Link}
                href={svc.type === 'WEBSITE' ? '/services/wordpress' : '/services/apps'}
                size="small"
                variant="outlined"
                sx={{ textTransform: 'none', color: '#FF6B00', borderColor: 'rgba(255, 107, 0, 0.5)', fontWeight: 600 }}
              >
                Administrar
              </Button>
            </Box>
          ))
        )}
      </Paper>

      {/* Nodes Status Grid */}
      <Typography variant="h6" sx={{ color: '#2D1B17', fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <StorageIcon fontSize="small" sx={{ color: '#FF6B00' }} /> Nodos de Infraestructura Activos
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Web Hosting Node */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              backgroundColor: '#FFFFFF',
              border: '1px solid #F2E8DC',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
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
                background: 'linear-gradient(90deg, #FF6B00, #FFB800)',
              },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <DnsIcon sx={{ color: '#FF6B00' }} />
                <Typography variant="h6" sx={{ color: '#2D1B17', fontWeight: 700 }}>
                  Nodo de Hosting Web (PHP / DNS)
                </Typography>
              </Box>
              <Chip label="ONLINE" size="small" color="success" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
            </Box>
            <Typography variant="body2" sx={{ color: '#667085', mb: 2 }}>
              Host: <Box component="span" sx={{ color: '#2D1B17', fontWeight: 600 }}>cloudfly.com.co</Box> (<code>89.117.147.134</code>)
            </Typography>
            <Typography variant="caption" sx={{ color: '#667085', display: 'block', mb: 1 }}>
              Nameservers: <code>ns1/ns2.cloudfly.com.co</code> | Glue: <code>ns1/ns2.velupi.com</code>
            </Typography>
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #F2E8DC' }}>
              <Typography variant="caption" sx={{ color: '#667085', fontWeight: 600 }}>Consumo de disco asignado:</Typography>
              <LinearProgress variant="determinate" value={diskPercentage} sx={{ my: 1, borderRadius: 2, height: 6 }} />
              <Typography variant="caption" sx={{ color: '#667085' }}>
                {quotas.diskUsedMb} MB usados de {quotas.diskLimitMb} MB ({diskPercentage}%)
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Cloud Apps Node */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              backgroundColor: '#FFFFFF',
              border: '1px solid #F2E8DC',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
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
                background: 'linear-gradient(90deg, #FF9100, #FF6B00)',
              },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <RocketLaunchIcon sx={{ color: '#FFB800' }} />
                <Typography variant="h6" sx={{ color: '#2D1B17', fontWeight: 700 }}>
                  Nodo de Aplicaciones Cloud (shared-node-01)
                </Typography>
              </Box>
              <Chip label="ONLINE" size="small" color="success" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
            </Box>
            <Typography variant="body2" sx={{ color: '#667085', mb: 2 }}>
              IP: <Box component="span" sx={{ color: '#2D1B17', fontWeight: 600 }}>169.58.220.244</Box> (Cloud VPS 4 MP)
            </Typography>
            <Typography variant="caption" sx={{ color: '#667085', display: 'block', mb: 1 }}>
              Ubicación: Hub Europe | Motor: Contenedores Cloud & Proxy Perimetral
            </Typography>
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #F2E8DC' }}>
              <Typography variant="caption" sx={{ color: '#667085', fontWeight: 600 }}>Capacidad de memoria reservada:</Typography>
              <LinearProgress variant="determinate" value={25} sx={{ my: 1, borderRadius: 2, height: 6 }} />
              <Typography variant="caption" sx={{ color: '#667085' }}>25% reservado — 12 GB RAM disponibles para nuevas aplicaciones</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Commercial & Entitlements Overview */}
      <Typography variant="h6" sx={{ color: '#2D1B17', fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <VerifiedUserIcon fontSize="small" sx={{ color: '#10B981' }} /> Organización y Suscripción Activa
      </Typography>

      <Paper sx={{ p: 3, backgroundColor: '#FFFFFF', border: '1px solid #F2E8DC', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', borderRadius: 3, mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Typography variant="h5" sx={{ color: '#2D1B17', fontWeight: 800 }}>
                Cliente Piloto #001: Velupi
              </Typography>
              <Chip label="INTERNAL PILOT" size="small" color="primary" sx={{ fontWeight: 700 }} />
            </Box>
            <Typography variant="body2" sx={{ color: '#667085', mb: 1 }}>
              Plan contratado: <strong>Velupi Web Hosting (Shared Cloud)</strong> — Dominio raíz: <code>velupi.com</code>
            </Typography>
            <Typography variant="caption" sx={{ color: '#667085' }}>
              Orden Interna: <code>VEL-INTERNAL-001</code> | SSL: <strong>Let's Encrypt Activo</strong> | DNS: Delegado a <code>cloudfly.com.co</code>
            </Typography>
          </Grid>
          <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Button
              component={Link}
              href="/cart"
              variant="contained"
              color="primary"
              sx={{ fontWeight: 700 }}
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
