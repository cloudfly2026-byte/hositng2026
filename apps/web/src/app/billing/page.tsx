'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { ModuleStateContainer } from '../../components/ModuleStateContainer';

export default function BillingPage() {
  const [state] = React.useState<'success'>('success');

  const subscriptions = [
    {
      id: 'sub-org-velupi-001',
      plan: 'Velupi Web Hosting Pro',
      cycle: 'Anual',
      status: 'ACTIVE',
      amount: '$0 COP (Piloto Interno)',
      renewalDate: '13 Octubre 2027',
    },
  ];

  const invoices = [
    {
      invoiceNumber: 'INV-2026-0001',
      date: '13 Octubre 2026',
      total: '$0 COP',
      status: 'PAGADA',
      method: 'Autorización Piloto Interno',
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ReceiptLongRoundedIcon sx={{ color: '#06b6d4', fontSize: '2rem' }} /> Facturación y Suscripciones
          </Typography>
          <Typography variant="body1" sx={{ color: '#9ca3af' }}>
            Gestiona tus planes comerciales activos, facturas tributarias y métodos de pago de Velupi Cloud.
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<CreditCardRoundedIcon />} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
          Actualizar Método de Pago
        </Button>
      </Box>

      {/* Subscriptions */}
      <ModuleStateContainer state={state} emptyTitle="No hay suscripciones activas" emptyMessage="Elige un plan comercial para activar tus servicios en Velupi Cloud.">
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', mb: 2 }}>
          Suscripciones Activas
        </Typography>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {subscriptions.map((sub) => (
            <Grid item xs={12} key={sub.id}>
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>
                      {sub.plan}
                    </Typography>
                    <Chip label={sub.status} size="small" sx={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 600 }} />
                  </Box>
                  <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                    Ciclo: {sub.cycle} &bull; Tarifa: {sub.amount} &bull; Próxima renovación: {sub.renewalDate}
                  </Typography>
                </Box>
                <Button variant="outlined" sx={{ borderRadius: '8px', textTransform: 'none', borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                  Cambiar Plan
                </Button>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Invoices */}
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', mb: 2 }}>
          Historial de Facturas
        </Typography>
        <Paper
          sx={{
            backgroundColor: '#111827',
            borderRadius: 3,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            overflow: 'hidden',
          }}
        >
          {invoices.map((inv) => (
            <Box
              key={inv.invoiceNumber}
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
                  {inv.invoiceNumber}
                </Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                  Fecha: {inv.date} &bull; Método: {inv.method}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#fff' }}>
                  {inv.total}
                </Typography>
                <Chip label={inv.status} size="small" sx={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 600 }} />
                <Button size="small" variant="text" startIcon={<DownloadRoundedIcon />} sx={{ textTransform: 'none', color: '#06b6d4' }}>
                  Descargar PDF
                </Button>
              </Box>
            </Box>
          ))}
        </Paper>
      </ModuleStateContainer>
    </Box>
  );
}
