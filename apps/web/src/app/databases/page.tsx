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
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <StorageRoundedIcon sx={{ color: '#06b6d4', fontSize: '2rem' }} /> Databases
          </Typography>
          <Typography variant="body1" sx={{ color: '#9ca3af' }}>
            Gestión segura de bases de datos MariaDB/MySQL, usuarios con privilegios acotados y acceso web.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" startIcon={<TerminalRoundedIcon />} sx={{ borderColor: 'rgba(255, 255, 255, 0.15)', color: '#d1d5db', textTransform: 'none', borderRadius: '8px' }}>
            phpMyAdmin
          </Button>
          <Button variant="contained" color="primary" startIcon={<AddRoundedIcon />} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
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
                      {db.name}
                    </Typography>
                    <Chip label={db.type} size="small" color="primary" sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
                  </Box>
                  <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                    Usuario: <strong>{db.user}</strong> | Cotejamiento: <code>{db.charset}</code> | Tamaño: {db.sizeMb} MB
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Button variant="outlined" size="small" startIcon={<KeyRoundedIcon />} sx={{ borderColor: 'rgba(255, 255, 255, 0.15)', color: '#d1d5db', textTransform: 'none', borderRadius: '8px' }}>
                    Cambiar Contraseña
                  </Button>
                  <Button variant="outlined" size="small" color="error" sx={{ textTransform: 'none', borderRadius: '8px' }}>
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
