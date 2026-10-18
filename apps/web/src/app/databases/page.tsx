'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded';
import KeyRoundedIcon from '@mui/icons-material/KeyRounded';
import { ModuleStateContainer } from '../../components/ModuleStateContainer';

export default function DatabasesPage() {
  const [state] = React.useState<'success'>('success');
  const [ssoLoading, setSsoLoading] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const handleOpenPhpMyAdmin = async () => {
    setSsoLoading(true);
    setFeedback(null);
    try {
      const { ssoUrl } = await import('../../modules/api-client').then((m) => m.defaultApiClient.getPhpMyAdminSso());
      window.open(ssoUrl, '_blank', 'noopener,noreferrer');
    } catch {
      window.open('https://pma.velupi.com', '_blank', 'noopener,noreferrer');
    } finally {
      setSsoLoading(false);
    }
  };

  const databases = [
    {
      name: 'velupi_wp_live',
      user: 'velupi_dbu',
      charset: 'utf8mb4_unicode_ci',
      sizeMb: 85,
      type: 'MariaDB 10.11',
      host: 'localhost (3306)',
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#2D1B17', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <StorageRoundedIcon sx={{ color: '#FF6B00', fontSize: '2rem' }} /> Databases
          </Typography>
          <Typography variant="body1" sx={{ color: '#667085' }}>
            Gestión segura de bases de datos MariaDB/MySQL, usuarios con privilegios acotados y acceso web.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<TerminalRoundedIcon />}
            onClick={handleOpenPhpMyAdmin}
            disabled={ssoLoading}
            sx={{ borderColor: '#F2E8DC', color: '#2D1B17', backgroundColor: '#FFFFFF', textTransform: 'none', borderRadius: 2, '&:hover': { borderColor: '#FF6B00', backgroundColor: '#FFFDF9' } }}
          >
            {ssoLoading ? 'Conectando SSO...' : 'phpMyAdmin'}
          </Button>
          <Button variant="contained" startIcon={<AddRoundedIcon />} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, backgroundColor: '#FF6B00', '&:hover': { backgroundColor: '#E85A00' } }}>
            Nueva Base de Datos
          </Button>
        </Box>
      </Box>

      <ModuleStateContainer state={state}>
        <Grid container spacing={3}>
          {databases.map((db) => (
            <Grid item xs={12} key={db.name}>
              <Paper
                sx={{
                  p: 3,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 3,
                  border: '1px solid #F2E8DC',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 2,
                }}
              >
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Typography variant="h6" sx={{ color: '#2D1B17', fontWeight: 700 }}>
                      {db.name}
                    </Typography>
                    <Chip label={db.type} size="small" sx={{ fontWeight: 600, fontSize: '0.75rem', backgroundColor: '#FFF4E5', color: '#FF6B00' }} />
                  </Box>
                  <Typography variant="body2" sx={{ color: '#667085' }}>
                    Usuario: <strong>{db.user}</strong> | Cotejamiento: <code>{db.charset}</code> | Tamaño: {db.sizeMb} MB
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Button variant="outlined" size="small" startIcon={<KeyRoundedIcon />} sx={{ borderColor: '#F2E8DC', color: '#2D1B17', textTransform: 'none', borderRadius: 2, '&:hover': { borderColor: '#FF6B00', backgroundColor: '#FFF8ED' } }}>
                    Cambiar Contraseña
                  </Button>
                  <Button variant="outlined" size="small" color="error" sx={{ textTransform: 'none', borderRadius: 2 }}>
                    Eliminar
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
