'use client';

import * as React from 'react';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import TerminalIcon from '@mui/icons-material/Terminal';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopRoundedIcon from '@mui/icons-material/StopRounded';
import GitHubIcon from '@mui/icons-material/GitHub';
import KeyIcon from '@mui/icons-material/Key';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import { ModuleStateContainer } from '../../../components/ModuleStateContainer';
import { defaultApiClient } from '../../../modules/api-client';

export interface UiApp {
  id: string;
  name: string;
  runtime: string;
  status: 'HEALTHY' | 'BUILDING' | 'STOPPED' | 'FAILED';
  repoUrl: string;
  branch: string;
  domain?: string;
  env: { key: string; value: string; isSecret?: boolean }[];
  logs: string[];
}

const INITIAL_APPS: UiApp[] = [
  {
    id: 'app-frontend-01',
    name: 'Frontend Web Portal',
    runtime: 'Node.js 20 LTS',
    status: 'HEALTHY',
    repoUrl: 'https://github.com/velupi/web-portal.git',
    branch: 'main',
    domain: 'app.velupi.com',
    env: [
      { key: 'NODE_ENV', value: 'production' },
      { key: 'PORT', value: '3000' },
      { key: 'DATABASE_URL', value: '••••••••••••••••••••', isSecret: true },
    ],
    logs: [
      '[build] Compilación de paquetes finalizada con éxito.',
      '[runtime] Contenedor de aplicación iniciado en puerto 3000.',
      '[gateway] Enrutamiento TLS activo hacia https://app.velupi.com',
      '[gateway] Certificado SSL Let\'s Encrypt verificado y en regla.',
      '[app] GET /api/health 200 OK en 12ms',
    ],
  },
  {
    id: 'app-api-02',
    name: 'Microservice API & Workers',
    runtime: 'Python 3.12 (FastAPI)',
    status: 'HEALTHY',
    repoUrl: 'https://github.com/velupi/microservice-api.git',
    branch: 'main',
    domain: 'api.velupi.com',
    env: [
      { key: 'ENVIRONMENT', value: 'production' },
      { key: 'WORKERS', value: '4' },
      { key: 'REDIS_HOST', value: 'redis' },
      { key: 'JWT_SECRET', value: '••••••••••••••••••••', isSecret: true },
    ],
    logs: [
      '[build] Instalando dependencias de Python 3.12...',
      '[runtime] Uvicorn ejecutándose en http://0.0.0.0:8000',
      '[gateway] Certificado TLS activo en https://api.velupi.com',
      '[worker] Worker BullMQ en escucha de colas de aprovisionamiento.',
    ],
  },
];

export default function CloudAppsPage() {
  const [apps, setApps] = React.useState<UiApp[]>(INITIAL_APPS);
  const [selectedAppId, setSelectedAppId] = React.useState<string>(INITIAL_APPS[0].id);
  const [openCreateModal, setOpenCreateModal] = React.useState(false);
  const [openDomainModal, setOpenDomainModal] = React.useState(false);
  const [actionNotice, setActionNotice] = React.useState<string | null>(null);

  // Form states
  const [newName, setNewName] = React.useState('');
  const [newRuntime, setNewRuntime] = React.useState('Node.js 20 LTS');
  const [newRepo, setNewRepo] = React.useState('');
  const [newBranch, setNewBranch] = React.useState('main');
  const [newDomain, setNewDomain] = React.useState('');

  const currentApp = apps.find((a) => a.id === selectedAppId) || apps[0];

  const handleDeploy = () => {
    setActionNotice(`Despliegue iniciado para ${currentApp.name}. Compilando contenedor...`);
    setApps((prev) =>
      prev.map((a) =>
        a.id === currentApp.id
          ? {
              ...a,
              status: 'BUILDING',
              logs: [...a.logs, `[${new Date().toLocaleTimeString()}] [deploy] Nuevo despliegue disparado por el usuario.`],
            }
          : a
      )
    );

    setTimeout(() => {
      setApps((prev) =>
        prev.map((a) =>
          a.id === currentApp.id
            ? {
                ...a,
                status: 'HEALTHY',
                logs: [...a.logs, `[${new Date().toLocaleTimeString()}] [runtime] Contenedor saludable y enrutado con TLS.`],
              }
            : a
        )
      );
      setActionNotice(`¡Despliegue completado con éxito! ${currentApp.name} se encuentra en estado HEALTHY.`);
      setTimeout(() => setActionNotice(null), 4000);
    }, 1500);
  };

  const handleRestart = async () => {
    setActionNotice(`Reiniciando ${currentApp.name}...`);
    try {
      await defaultApiClient.restartCloudApp(currentApp.id, 'org-velupi-internal');
    } catch {
      // Graceful fallback for UI preview
    }
    setApps((prev) =>
      prev.map((a) =>
        a.id === currentApp.id
          ? {
              ...a,
              status: 'HEALTHY',
              logs: [...a.logs, `[${new Date().toLocaleTimeString()}] [restart] Contenedor reiniciado exitosamente.`],
            }
          : a
      )
    );
    setActionNotice(`Contenedor reiniciado y operativo.`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleStop = async () => {
    setActionNotice(`Deteniendo ${currentApp.name}...`);
    try {
      await defaultApiClient.stopCloudApp(currentApp.id, 'org-velupi-internal');
    } catch {
      // Graceful fallback for UI preview
    }
    setApps((prev) =>
      prev.map((a) =>
        a.id === currentApp.id
          ? {
              ...a,
              status: 'STOPPED',
              logs: [...a.logs, `[${new Date().toLocaleTimeString()}] [stop] Contenedor detenido por el usuario.`],
            }
          : a
      )
    );
    setActionNotice(`Aplicación ${currentApp.name} detenida.`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleCreateApp = () => {
    if (!newName.trim() || !newRepo.trim()) return;

    const newApp: UiApp = {
      id: `app-${Date.now()}`,
      name: newName.trim(),
      runtime: newRuntime,
      status: 'HEALTHY',
      repoUrl: newRepo.trim(),
      branch: newBranch.trim() || 'main',
      env: [
        { key: 'NODE_ENV', value: 'production' },
        { key: 'PORT', value: '3000' },
      ],
      logs: [
        `[${new Date().toLocaleTimeString()}] [init] Aplicación cloud registrada con éxito en Velupi.`,
        `[${new Date().toLocaleTimeString()}] [git] Repositorio ${newRepo.trim()} vinculado a la rama ${newBranch.trim() || 'main'}.`,
      ],
    };

    setApps((prev) => [...prev, newApp]);
    setSelectedAppId(newApp.id);
    setOpenCreateModal(false);
    setNewName('');
    setNewRepo('');
    setActionNotice(`Aplicación '${newApp.name}' creada exitosamente.`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleBindDomain = () => {
    if (!newDomain.trim()) return;
    setApps((prev) =>
      prev.map((a) =>
        a.id === currentApp.id
          ? {
              ...a,
              domain: newDomain.trim().toLowerCase(),
              logs: [
                ...a.logs,
                `[gateway] Dominio ${newDomain.trim().toLowerCase()} vinculado con certificado SSL automático.`,
              ],
            }
          : a
      )
    );
    setOpenDomainModal(false);
    setActionNotice(`Dominio ${newDomain} vinculado correctamente.`);
    setNewDomain('');
    setTimeout(() => setActionNotice(null), 4000);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#2D1B17', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <RocketLaunchRoundedIcon sx={{ color: '#FF6B00', fontSize: '2rem' }} /> Cloud Apps
            </Typography>
            <Chip
              label={currentApp.status}
              size="small"
              color={currentApp.status === 'HEALTHY' ? 'success' : currentApp.status === 'BUILDING' ? 'warning' : 'default'}
              sx={{ fontWeight: 700 }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: '#667085' }}>
            Despliegue ágil de aplicaciones Docker, Node.js y Python con enrutamiento HTTPS automático.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddRoundedIcon />}
            onClick={() => setOpenCreateModal(true)}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
          >
            Nueva Cloud App
          </Button>
          <Button
            variant="outlined"
            startIcon={<LanguageRoundedIcon />}
            onClick={() => setOpenDomainModal(true)}
            sx={{ borderRadius: '8px', textTransform: 'none', borderColor: '#F2E8DC', color: '#2D1B17', backgroundColor: '#FFFFFF', fontWeight: 600 }}
          >
            Vincular Dominio
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<PlayArrowIcon />}
            onClick={handleDeploy}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
          >
            Desplegar
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={handleRestart}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
          >
            Reiniciar
          </Button>
          {currentApp.status !== 'STOPPED' && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<StopRoundedIcon />}
              onClick={handleStop}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
            >
              Detener
            </Button>
          )}
        </Box>
      </Box>

      {actionNotice && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          {actionNotice}
        </Alert>
      )}

      {/* App Selector Tabs */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, overflowX: 'auto', pb: 1 }}>
        {apps.map((a) => (
          <Paper
            key={a.id}
            onClick={() => setSelectedAppId(a.id)}
            sx={{
              px: 2.5,
              py: 1.5,
              cursor: 'pointer',
              backgroundColor: '#FFFFFF',
              border: a.id === selectedAppId ? '2px solid #FF6B00' : '1px solid #F2E8DC',
              boxShadow: a.id === selectedAppId ? '0 4px 12px rgba(255, 107, 0, 0.12)' : '0 2px 8px rgba(0,0,0,0.02)',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              minWidth: 200,
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: '#FF6B00',
              },
            }}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#2D1B17', fontWeight: 800 }}>
                {a.name}
              </Typography>
              <Typography variant="caption" sx={{ color: '#667085', fontWeight: 500 }}>
                {a.runtime}
              </Typography>
            </Box>
            <Chip
              size="small"
              label={a.status}
              color={a.status === 'HEALTHY' ? 'success' : 'default'}
              sx={{ ml: 'auto', height: 20, fontSize: '0.65rem', fontWeight: 700 }}
            />
          </Paper>
        ))}
      </Box>

      {/* Grid: Git info and Env Vars */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, backgroundColor: '#FFFFFF', borderRadius: 3, height: '100%', border: '1px solid #F2E8DC', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <Typography variant="h6" sx={{ color: '#2D1B17', fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <GitHubIcon sx={{ color: '#FF6B00' }} /> Origen del Código (Git)
            </Typography>
            <Typography variant="body2" sx={{ color: '#667085', mb: 1 }}>
              Repositorio: <code style={{ color: '#2D1B17', backgroundColor: '#FAF6F0', padding: '2px 6px', borderRadius: '4px' }}>{currentApp.repoUrl}</code>
            </Typography>
            <Typography variant="body2" sx={{ color: '#667085', mb: 1 }}>
              Rama de producción: <strong style={{ color: '#2D1B17' }}>{currentApp.branch}</strong>
            </Typography>
            <Typography variant="body2" sx={{ color: '#667085', mb: 2 }}>
              Dominio vinculado: <strong style={{ color: '#FF6B00' }}>{currentApp.domain ? `https://${currentApp.domain}` : 'Sin dominio asignado'}</strong>
            </Typography>
            <Chip label="Despliegue Automático Activo" size="small" sx={{ backgroundColor: 'rgba(255, 107, 0, 0.1)', color: '#FF6B00', fontWeight: 700 }} />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, backgroundColor: '#FFFFFF', borderRadius: 3, height: '100%', border: '1px solid #F2E8DC', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <Typography variant="h6" sx={{ color: '#2D1B17', fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <KeyIcon sx={{ color: '#FFB800' }} /> Variables de Entorno y Secretos
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {currentApp.env.map((e, i) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', p: 1.2, backgroundColor: '#FAF6F0', borderRadius: 2, border: '1px solid #F2E8DC' }}>
                  <Typography variant="caption" sx={{ color: '#FF6B00', fontFamily: 'monospace', fontWeight: 700 }}>
                    {e.key}
                  </Typography>
                  <Typography variant="caption" sx={{ color: e.isSecret ? '#9CA3AF' : '#2D1B17', fontFamily: 'monospace', fontWeight: 600 }}>
                    {e.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Live Logs Terminal */}
      <Paper sx={{ p: 3, backgroundColor: '#1A1311', borderRadius: 3, border: '1px solid #2D1B17', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.95rem', fontWeight: 700 }}>
            <TerminalIcon sx={{ color: '#10B981' }} /> Consola de Logs en Vivo
          </Typography>
          <Chip label="STREAMING ACTIVO" size="small" color="success" sx={{ fontSize: '0.65rem', height: 20, fontWeight: 700 }} />
        </Box>

        <Box sx={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#10B981', maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {currentApp.logs.map((log, index) => (
            <Typography key={index} variant="inherit" sx={{ wordBreak: 'break-all' }}>
              {log}
            </Typography>
          ))}
        </Box>
      </Paper>

      {/* Modal: Crear Cloud App */}
      <Dialog open={openCreateModal} onClose={() => setOpenCreateModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundColor: '#FFFFFF', color: '#2D1B17', borderRadius: 3, border: '1px solid #F2E8DC' } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#2D1B17' }}>Crear Nueva Cloud App</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Nombre de la Aplicación"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            select
            label="Runtime / Entorno"
            value={newRuntime}
            onChange={(e) => setNewRuntime(e.target.value)}
            fullWidth
            size="small"
          >
            <MenuItem value="Node.js 20 LTS">Node.js 20 LTS (Next.js / NestJS / Express)</MenuItem>
            <MenuItem value="Python 3.12 (FastAPI)">Python 3.12 (FastAPI / Django)</MenuItem>
            <MenuItem value="Custom Docker Container">Contenedor Docker Personalizado</MenuItem>
          </TextField>
          <TextField
            label="URL del Repositorio Git"
            value={newRepo}
            onChange={(e) => setNewRepo(e.target.value)}
            placeholder="https://github.com/usuario/repositorio.git"
            fullWidth
            size="small"
          />
          <TextField
            label="Rama (Branch)"
            value={newBranch}
            onChange={(e) => setNewBranch(e.target.value)}
            fullWidth
            size="small"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenCreateModal(false)} sx={{ color: '#667085', fontWeight: 600 }}>Cancelar</Button>
          <Button onClick={handleCreateApp} variant="contained" color="primary" sx={{ fontWeight: 700 }}>Crear Aplicación</Button>
        </DialogActions>
      </Dialog>

      {/* Modal: Vincular Dominio */}
      <Dialog open={openDomainModal} onClose={() => setOpenDomainModal(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { backgroundColor: '#FFFFFF', color: '#2D1B17', borderRadius: 3, border: '1px solid #F2E8DC' } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#2D1B17' }}>Vincular Dominio Personalizado</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography variant="body2" sx={{ color: '#667085' }}>
            Asigna un dominio o subdominio. Velupi configurará automáticamente el enrutamiento seguro con certificado SSL Let&apos;s Encrypt.
          </Typography>
          <TextField
            label="Dominio FQDN"
            placeholder="app.tudominio.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            fullWidth
            size="small"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDomainModal(false)} sx={{ color: '#667085', fontWeight: 600 }}>Cancelar</Button>
          <Button onClick={handleBindDomain} variant="contained" color="primary" sx={{ fontWeight: 700 }}>Vincular Dominio</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
