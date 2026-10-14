'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import HttpsRoundedIcon from '@mui/icons-material/HttpsRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import { ModuleStateContainer } from '../../components/ModuleStateContainer';

export default function SslManagerPage() {
  const [state] = React.useState<'success'>('success');

  const certificates = [
    {
      domain: 'velupi.com (con subdominios)',
      issuer: "Let's Encrypt Authority X3",
      validUntil: '2026-12-15 (62 días restantes)',
      status: 'ACTIVO',
      autoRenew: true,
      sans: ['velupi.com', 'www.velupi.com', 'mail.velupi.com'],
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <HttpsRoundedIcon sx={{ color: '#06b6d4', fontSize: '2rem' }} /> SSL / TLS Manager
          </Typography>
          <Typography variant="body1" sx={{ color: '#9ca3af' }}>
            Emisión automática de certificados Let's Encrypt con renovación desatendida y soporte de certificados personalizados.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" sx={{ borderColor: 'rgba(255, 255, 255, 0.15)', color: '#d1d5db', textTransform: 'none', borderRadius: '8px' }}>
            Instalar Certificado Propio
          </Button>
          <Button variant="contained" color="primary" startIcon={<VerifiedRoundedIcon />} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
            Solicitar Let's Encrypt
          </Button>
        </Box>
      </Box>

      <ModuleStateContainer state={state}>
        <Grid container spacing={3}>
          {certificates.map((cert) => (
            <Grid item xs={12} key={cert.domain}>
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
                      {cert.domain}
                    </Typography>
                    <Chip label={cert.status} size="small" color="success" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                    <Chip label="Auto-Renovable" size="small" sx={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#34d399', fontWeight: 600, fontSize: '0.7rem' }} />
                  </Box>
                  <Typography variant="body2" sx={{ color: '#9ca3af', mb: 0.5 }}>
                    Emisor: <strong>{cert.issuer}</strong> | Validez: {cert.validUntil}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>
                    Nombres alternativos (SAN): {cert.sans.join(', ')}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Button variant="outlined" size="small" startIcon={<AutorenewRoundedIcon />} sx={{ borderColor: 'rgba(255, 255, 255, 0.15)', color: '#d1d5db', textTransform: 'none', borderRadius: '8px' }}>
                    Forzar Renovación
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
