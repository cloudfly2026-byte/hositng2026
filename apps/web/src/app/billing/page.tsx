'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded';
import ShoppingCartCheckoutRoundedIcon from '@mui/icons-material/ShoppingCartCheckoutRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import Link from 'next/link';
import { defaultApiClient } from '../../modules/api-client';


interface SubscriptionItem {
  id: string;
  planName: string;
  cycle: string;
  status: 'ACTIVE' | 'GRACE_PERIOD' | 'SUSPENDED' | 'CANCELLED';
  subtotal: string;
  tax: string;
  total: string;
  renewalDate: string;
  gracePeriodUntil?: string;
}

interface InvoiceItem {
  invoiceNumber: string;
  date: string;
  subtotal: string;
  tax: string;
  total: string;
  status: 'PAID' | 'PENDING' | 'VOID';
  paymentMethod: string;
  items: Array<{ description: string; quantity: number; amount: string }>;
}

export default function BillingPage() {
  const [subscriptions, setSubscriptions] = React.useState<SubscriptionItem[]>([
    {
      id: 'sub-org-velupi-001',
      planName: 'Velupi Web Cloud Hosting Pro',
      cycle: 'Anual',
      status: 'ACTIVE',
      subtotal: '$0 COP',
      tax: '$0 COP',
      total: '$0 COP (Piloto Interno #001)',
      renewalDate: '13 Octubre 2027',
    },
  ]);

  const [invoices, setInvoices] = React.useState<InvoiceItem[]>([
    {
      invoiceNumber: 'INV-2026-00001',
      date: '13 Octubre 2026',
      subtotal: '$0 COP',
      tax: '$0 COP',
      total: '$0 COP',
      status: 'PAID',
      paymentMethod: 'Orden Autorizada Interna Velupi',
      items: [
        {
          description: 'Velupi Web Hosting Pro — Piloto Interno (1 año)',
          quantity: 1,
          amount: '$0 COP',
        },
      ],
    },
  ]);

  const [isLoading, setIsLoading] = React.useState(false);
  const [fetchNotice, setFetchNotice] = React.useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = React.useState<InvoiceItem | null>(null);
  const [cancelTargetSub, setCancelTargetSub] = React.useState<SubscriptionItem | null>(null);

  const loadBillingData = React.useCallback(async () => {
    setIsLoading(true);
    setFetchNotice(null);
    try {
      const orgId = 'org-velupi-internal';
      const [subsRes, invRes] = await Promise.allSettled([
        defaultApiClient.getSubscriptions(orgId),
        defaultApiClient.getInvoices(orgId),
      ]);

      if (subsRes.status === 'fulfilled' && Array.isArray(subsRes.value) && subsRes.value.length > 0) {
        setSubscriptions(
          subsRes.value.map((s: any) => ({
            id: s.id,
            planName: s.planName || 'Plan Cloud Velupi',
            cycle: s.billingCycle === 'ANNUAL' ? 'Anual' : 'Mensual',
            status: s.status,
            subtotal: `$${(s.subtotalCents / 100).toLocaleString('es-CO')} COP`,
            tax: `$${(s.taxCents / 100).toLocaleString('es-CO')} COP`,
            total: `$${(s.totalCents / 100).toLocaleString('es-CO')} COP`,
            renewalDate: new Date(s.currentPeriodEnd).toLocaleDateString('es-CO'),
            gracePeriodUntil: s.gracePeriodUntil
              ? new Date(s.gracePeriodUntil).toLocaleDateString('es-CO')
              : undefined,
          }))
        );
      }

      if (invRes.status === 'fulfilled' && Array.isArray(invRes.value) && invRes.value.length > 0) {
        setInvoices(
          invRes.value.map((inv: any) => ({
            invoiceNumber: inv.invoiceNumber,
            date: new Date(inv.issuedAt).toLocaleDateString('es-CO'),
            subtotal: `$${(inv.subtotalCents / 100).toLocaleString('es-CO')} COP`,
            tax: `$${(inv.taxCents / 100).toLocaleString('es-CO')} COP`,
            total: `$${(inv.totalCents / 100).toLocaleString('es-CO')} COP`,
            status: inv.status,
            paymentMethod: 'Wompi / Orden Autorizada',
            items:
              inv.items?.map((item: any) => ({
                description: item.description || 'Servicio Cloud Velupi',
                quantity: item.quantity || 1,
                amount: `$${(item.unitPriceCents / 100).toLocaleString('es-CO')} COP`,
              })) || [],
          }))
        );
      }
    } catch (err: any) {
      setFetchNotice(err?.message || 'Error al conectar con la API de facturación.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadBillingData();
  }, [loadBillingData]);

  const handleConfirmCancel = () => {
    if (cancelTargetSub) {
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === cancelTargetSub.id ? { ...s, status: 'CANCELLED' } : s))
      );
      setCancelTargetSub(null);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ReceiptLongRoundedIcon sx={{ color: '#06b6d4', fontSize: '2rem' }} /> Facturación y Suscripciones
          </Typography>
          <Typography variant="body1" sx={{ color: '#9ca3af' }}>
            Gestiona tus planes comerciales activos, facturas tributarias y pagos en Velupi Cloud Platform.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            onClick={loadBillingData}
            variant="outlined"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <RefreshRoundedIcon />}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, borderColor: 'rgba(255,255,255,0.15)', color: '#fff' }}
          >
            Actualizar
          </Button>
          <Button
            component={Link}
            href="/checkout"
            variant="contained"
            color="primary"
            startIcon={<ShoppingCartCheckoutRoundedIcon />}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
          >
            Nuevo Plan Cloud
          </Button>
        </Box>
      </Box>

      {fetchNotice && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {fetchNotice}
        </Alert>
      )}


      {/* Subscriptions Section */}
      <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', mb: 2 }}>
        Suscripciones y Planes Activos
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {subscriptions.map((sub) => {
          const isGrace = sub.status === 'GRACE_PERIOD';
          const isSuspended = sub.status === 'SUSPENDED';
          const isActive = sub.status === 'ACTIVE';
          const isCancelled = sub.status === 'CANCELLED';

          return (
            <Grid item xs={12} key={sub.id}>
              {isGrace && (
                <Alert
                  severity="warning"
                  icon={<WarningAmberRoundedIcon />}
                  sx={{ mb: 2, backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}
                >
                  <AlertTitle sx={{ fontWeight: 700 }}>Período de Gracia Activo (5 días)</AlertTitle>
                  Tu período de facturación ha vencido. Tus cargas de trabajo continúan operando con normalidad temporalmente. Renueva tu pago para evitar la suspensión programada.
                </Alert>
              )}

              {isSuspended && (
                <Alert
                  severity="error"
                  icon={<SecurityRoundedIcon />}
                  sx={{ mb: 2, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                >
                  <AlertTitle sx={{ fontWeight: 700 }}>Servicio Suspendido (Conservación Segura de Datos)</AlertTitle>
                  El servicio se encuentra suspendido por falta de pago. En conformidad con la política de retención de Velupi Cloud, todos tus datos, bases de datos y archivos están 100% seguros y conservados durante 30 días. Realiza el pago para reactivarlo inmediatamente.
                </Alert>
              )}

              <Paper
                sx={{
                  p: 3,
                  backgroundColor: '#111827',
                  borderRadius: 3,
                  border: isGrace
                    ? '1px solid rgba(245, 158, 11, 0.5)'
                    : isSuspended
                    ? '1px solid rgba(239, 68, 68, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
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
                      {sub.planName}
                    </Typography>
                    <Chip
                      label={
                        isActive
                          ? 'ACTIVO'
                          : isGrace
                          ? 'PERÍODO DE GRACIA'
                          : isSuspended
                          ? 'SUSPENDIDO'
                          : 'CANCELADO'
                      }
                      size="small"
                      sx={{
                        backgroundColor: isActive
                          ? 'rgba(16, 185, 129, 0.2)'
                          : isGrace
                          ? 'rgba(245, 158, 11, 0.2)'
                          : isSuspended
                          ? 'rgba(239, 68, 68, 0.2)'
                          : 'rgba(156, 163, 175, 0.2)',
                        color: isActive
                          ? '#34d399'
                          : isGrace
                          ? '#fbbf24'
                          : isSuspended
                          ? '#f87171'
                          : '#9ca3af',
                        fontWeight: 700,
                      }}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                    Ciclo: {sub.cycle} &bull; Tarifa: {sub.total} &bull; Próxima renovación: {sub.renewalDate}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Button
                    component={Link}
                    href="/checkout"
                    variant="outlined"
                    sx={{ borderRadius: '8px', textTransform: 'none', borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }}
                  >
                    Cambiar / Renovar Plan
                  </Button>
                  {!isCancelled && (
                    <Button
                      variant="text"
                      color="error"
                      onClick={() => setCancelTargetSub(sub)}
                      sx={{ borderRadius: '8px', textTransform: 'none' }}
                    >
                      Cancelar Suscripción
                    </Button>
                  )}
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* Invoices History */}
      <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', mb: 2 }}>
        Historial de Facturas Tributarias
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
                Emitida el {inv.date} &bull; Método: {inv.paymentMethod}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 700, color: '#fff' }}>
                {inv.total}
              </Typography>
              <Chip
                label={inv.status === 'PAID' ? 'PAGADA' : inv.status === 'PENDING' ? 'PENDIENTE' : 'ANULADA'}
                size="small"
                sx={{
                  backgroundColor: inv.status === 'PAID' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  color: inv.status === 'PAID' ? '#34d399' : '#fbbf24',
                  fontWeight: 600,
                }}
              />
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadRoundedIcon />}
                onClick={() => setSelectedInvoice(inv)}
                sx={{ textTransform: 'none', color: '#06b6d4', borderColor: 'rgba(6, 182, 212, 0.4)' }}
              >
                Ver Detalle
              </Button>
            </Box>
          </Box>
        ))}
      </Paper>

      {/* Invoice Detail Dialog */}
      <Dialog
        open={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { backgroundColor: '#111827', borderRadius: 3, border: '1px solid rgba(255, 255, 255, 0.08)' },
        }}
      >
        <DialogTitle sx={{ color: '#fff', fontWeight: 800 }}>
          Factura Comercial {selectedInvoice?.invoiceNumber}
        </DialogTitle>
        <DialogContent sx={{ color: '#d1d5db' }}>
          {selectedInvoice && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" sx={{ color: '#9ca3af', mb: 2 }}>
                Emisor: <strong>Velupi Cloud Platform</strong> &bull; Fecha: {selectedInvoice.date}
              </Typography>
              <Divider sx={{ my: 1.5, borderColor: 'rgba(255, 255, 255, 0.08)' }} />
              {selectedInvoice.items.map((item, idx) => (
                <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ color: '#fff' }}>
                    {item.description} (x{item.quantity})
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                    {item.amount}
                  </Typography>
                </Box>
              ))}
              <Divider sx={{ my: 1.5, borderColor: 'rgba(255, 255, 255, 0.08)' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" sx={{ color: '#9ca3af' }}>Subtotal:</Typography>
                <Typography variant="body2" sx={{ color: '#fff' }}>{selectedInvoice.subtotal}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ color: '#9ca3af' }}>IVA (19% Colombia):</Typography>
                <Typography variant="body2" sx={{ color: '#fff' }}>{selectedInvoice.tax}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>Total Pagado:</Typography>
                <Typography variant="h6" sx={{ color: '#06b6d4', fontWeight: 800 }}>{selectedInvoice.total}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedInvoice(null)} sx={{ color: '#9ca3af', textTransform: 'none' }}>
            Cerrar
          </Button>
          <Button variant="contained" color="primary" onClick={() => setSelectedInvoice(null)} sx={{ textTransform: 'none' }}>
            Descargar Comprobante PDF
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={Boolean(cancelTargetSub)}
        onClose={() => setCancelTargetSub(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { backgroundColor: '#111827', borderRadius: 3, border: '1px solid rgba(255, 255, 255, 0.08)' },
        }}
      >
        <DialogTitle sx={{ color: '#fff', fontWeight: 800 }}>
          ¿Confirmar cancelación?
        </DialogTitle>
        <DialogContent sx={{ color: '#d1d5db' }}>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            La suscripción a <strong>{cancelTargetSub?.planName}</strong> se cancelará. Conservarás acceso completo a tus recursos hasta el fin del ciclo de facturación ({cancelTargetSub?.renewalDate}).
          </Typography>
          <Typography variant="caption" sx={{ color: '#9ca3af' }}>
            Tus datos no serán eliminados de inmediato. Dispones de un período de retención mínimo de 30 días.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCancelTargetSub(null)} sx={{ color: '#9ca3af', textTransform: 'none' }}>
            Mantener Suscripción
          </Button>
          <Button variant="contained" color="error" onClick={handleConfirmCancel} sx={{ textTransform: 'none' }}>
            Confirmar Cancelación
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
