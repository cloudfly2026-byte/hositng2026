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

  const [pendingOrders, setPendingOrders] = React.useState<any[]>([]);
  const [cancellingOrderId, setCancellingOrderId] = React.useState<string | null>(null);
  const [cancelTargetOrder, setCancelTargetOrder] = React.useState<any | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [fetchNotice, setFetchNotice] = React.useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = React.useState<InvoiceItem | null>(null);
  const [cancelTargetSub, setCancelTargetSub] = React.useState<SubscriptionItem | null>(null);

  const loadBillingData = React.useCallback(async () => {
    setIsLoading(true);
    setFetchNotice(null);
    try {
      const orgId =
        (typeof window !== 'undefined' && localStorage.getItem('velupi_active_org_id')) ||
        'org-velupi-internal';
      const [subsRes, invRes, ordersRes] = await Promise.allSettled([
        defaultApiClient.getSubscriptions(orgId),
        defaultApiClient.getInvoices(orgId),
        defaultApiClient.listOrders(orgId),
      ]);

      if (ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value)) {
        const pending = ordersRes.value.filter(
          (o: any) => o.status === 'PENDING_PAYMENT' || o.status === 'DRAFT'
        );
        setPendingOrders(pending);
      }

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

  const handleCancelOrder = async () => {
    if (!cancelTargetOrder) return;
    setCancellingOrderId(cancelTargetOrder.id);
    try {
      await defaultApiClient.cancelOrder(cancelTargetOrder.id);
      setFetchNotice(`El pedido ${cancelTargetOrder.orderNumber || cancelTargetOrder.id} ha sido cancelado con éxito.`);
      setCancelTargetOrder(null);
      await loadBillingData();
    } catch (err: any) {
      setFetchNotice(err?.message || 'Error al cancelar el pedido.');
    } finally {
      setCancellingOrderId(null);
    }
  };

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
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#2D1B17', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ReceiptLongRoundedIcon sx={{ color: '#FF6B00', fontSize: '2rem' }} /> Facturación y Suscripciones
          </Typography>
          <Typography variant="body1" sx={{ color: '#667085' }}>
            Gestiona tus planes comerciales activos, facturas tributarias y pagos en Velupi Cloud Platform.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            onClick={loadBillingData}
            variant="outlined"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <RefreshRoundedIcon />}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, borderColor: '#F2E8DC', color: '#2D1B17', backgroundColor: '#FFFFFF', '&:hover': { borderColor: '#FF6B00', backgroundColor: '#FFFDF9' } }}
          >
            Actualizar
          </Button>
          <Button
            component={Link}
            href="/checkout"
            variant="contained"
            startIcon={<ShoppingCartCheckoutRoundedIcon />}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, backgroundColor: '#FF6B00', '&:hover': { backgroundColor: '#E85A00' } }}
          >
            Nuevo Plan Cloud
          </Button>
        </Box>
      </Box>

      {fetchNotice && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          {fetchNotice}
        </Alert>
      )}

      {/* Pending Orders & Collection Documents Section */}
      {pendingOrders.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Alert
            severity="warning"
            icon={<WarningAmberRoundedIcon />}
            sx={{
              mb: 2.5,
              backgroundColor: '#FFFBEB',
              color: '#B45309',
              border: '1px solid #FDE68A',
              borderRadius: 3,
            }}
          >
            <AlertTitle sx={{ fontWeight: 800 }}>Tienes {pendingOrders.length} pedido(s) pendiente(s) de pago</AlertTitle>
            Completa el pago de tu pedido para activar tus servicios o cancélalo si ya no deseas continuar.
          </Alert>

          <Typography variant="h6" sx={{ fontWeight: 700, color: '#2D1B17', mb: 2 }}>
            Documentos y Pedidos Pendientes de Pago
          </Typography>

          <Grid container spacing={2.5}>
            {pendingOrders.map((order) => {
              const amountCop = Math.round((order.totalCents || 0) / 100).toLocaleString('es-CO');
              return (
                <Grid item xs={12} key={order.id}>
                  <Paper
                    sx={{
                      p: 3,
                      backgroundColor: '#FFFFFF',
                      borderRadius: 3,
                      border: '1px solid #F59E0B',
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#2D1B17' }}>
                          Pedido #{order.orderNumber || order.id}
                        </Typography>
                        <Chip
                          label="PENDIENTE DE PAGO"
                          size="small"
                          sx={{
                            backgroundColor: '#FEF3C7',
                            color: '#92400E',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ color: '#667085' }}>
                        Total: <strong>${amountCop} COP</strong> &bull; Moneda: {order.currency || 'COP'}
                        {order.primaryDomain ? ` • Dominio principal: ${order.primaryDomain}` : ''}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                      <Button
                        component={Link}
                        href={`/checkout?orderId=${encodeURIComponent(order.id)}`}
                        variant="contained"
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 700,
                          backgroundColor: '#FF6B00',
                          '&:hover': { backgroundColor: '#E85A00' },
                        }}
                      >
                        Pagar Ahora
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => setCancelTargetOrder(order)}
                        disabled={cancellingOrderId === order.id}
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          borderColor: '#FCA5A5',
                        }}
                      >
                        {cancellingOrderId === order.id ? 'Cancelando...' : 'Cancelar Pedido'}
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* Subscriptions Section */}
      <Typography variant="h6" sx={{ fontWeight: 700, color: '#2D1B17', mb: 2 }}>
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
                  sx={{ mb: 2, backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D', borderRadius: 2 }}
                >
                  <AlertTitle sx={{ fontWeight: 700 }}>Período de Gracia Activo (5 días)</AlertTitle>
                  Tu período de facturación ha vencido. Tus cargas de trabajo continúan operando con normalidad temporalmente. Renueva tu pago para evitar la suspensión programada.
                </Alert>
              )}

              {isSuspended && (
                <Alert
                  severity="error"
                  icon={<SecurityRoundedIcon />}
                  sx={{ mb: 2, backgroundColor: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5', borderRadius: 2 }}
                >
                  <AlertTitle sx={{ fontWeight: 700 }}>Servicio Suspendido (Conservación Segura de Datos)</AlertTitle>
                  El servicio se encuentra suspendido por falta de pago. En conformidad con la política de retención de Velupi Cloud, todos tus datos, bases de datos y archivos están 100% seguros y conservados durante 30 días. Realiza el pago para reactivarlo inmediatamente.
                </Alert>
              )}

              <Paper
                sx={{
                  p: 3,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 3,
                  border: isGrace
                    ? '1px solid #F59E0B'
                    : isSuspended
                    ? '1px solid #EF4444'
                    : '1px solid #F2E8DC',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 2,
                }}
              >
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#2D1B17' }}>
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
                          ? '#D1FAE5'
                          : isGrace
                          ? '#FEF3C7'
                          : isSuspended
                          ? '#FEE2E2'
                          : '#F3F4F6',
                        color: isActive
                          ? '#065F46'
                          : isGrace
                          ? '#92400E'
                          : isSuspended
                          ? '#991B1B'
                          : '#6B7280',
                        fontWeight: 700,
                      }}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ color: '#667085' }}>
                    Ciclo: {sub.cycle} &bull; Tarifa: {sub.total} &bull; Próxima renovación: {sub.renewalDate}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Button
                    component={Link}
                    href="/checkout"
                    variant="outlined"
                    sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#F2E8DC', color: '#2D1B17', '&:hover': { borderColor: '#FF6B00', backgroundColor: '#FFF8ED' } }}
                  >
                    Cambiar / Renovar Plan
                  </Button>
                  {!isCancelled && (
                    <Button
                      variant="text"
                      color="error"
                      onClick={() => setCancelTargetSub(sub)}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
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
      <Typography variant="h6" sx={{ fontWeight: 700, color: '#2D1B17', mb: 2 }}>
        Historial de Facturas Tributarias
      </Typography>

      <Paper
        sx={{
          backgroundColor: '#FFFFFF',
          borderRadius: 3,
          border: '1px solid #F2E8DC',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
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
              borderBottom: '1px solid #F2E8DC',
              '&:last-child': { borderBottom: 'none' },
            }}
          >
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 700, color: '#2D1B17' }}>
                {inv.invoiceNumber}
              </Typography>
              <Typography variant="caption" sx={{ color: '#667085' }}>
                Emitida el {inv.date} &bull; Método: {inv.paymentMethod}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 700, color: '#2D1B17' }}>
                {inv.total}
              </Typography>
              <Chip
                label={inv.status === 'PAID' ? 'PAGADA' : inv.status === 'PENDING' ? 'PENDIENTE' : 'ANULADA'}
                size="small"
                sx={{
                  backgroundColor: inv.status === 'PAID' ? '#D1FAE5' : '#FEF3C7',
                  color: inv.status === 'PAID' ? '#065F46' : '#92400E',
                  fontWeight: 600,
                }}
              />
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadRoundedIcon />}
                onClick={() => setSelectedInvoice(inv)}
                sx={{ textTransform: 'none', color: '#FF6B00', borderColor: '#FF6B00', borderRadius: 2, '&:hover': { backgroundColor: '#FFF8ED', borderColor: '#E85A00' } }}
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
          sx: { backgroundColor: '#FFFFFF', borderRadius: 3, border: '1px solid #F2E8DC', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' },
        }}
      >
        <DialogTitle sx={{ color: '#2D1B17', fontWeight: 800 }}>
          Factura Comercial {selectedInvoice?.invoiceNumber}
        </DialogTitle>
        <DialogContent sx={{ color: '#2D1B17' }}>
          {selectedInvoice && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" sx={{ color: '#667085', mb: 2 }}>
                Emisor: <strong>Velupi Cloud Platform</strong> &bull; Fecha: {selectedInvoice.date}
              </Typography>
              <Divider sx={{ my: 1.5, borderColor: '#F2E8DC' }} />
              {selectedInvoice.items.map((item, idx) => (
                <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ color: '#2D1B17' }}>
                    {item.description} (x{item.quantity})
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#2D1B17', fontWeight: 600 }}>
                    {item.amount}
                  </Typography>
                </Box>
              ))}
              <Divider sx={{ my: 1.5, borderColor: '#F2E8DC' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" sx={{ color: '#667085' }}>Subtotal:</Typography>
                <Typography variant="body2" sx={{ color: '#2D1B17' }}>{selectedInvoice.subtotal}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ color: '#667085' }}>IVA (19% Colombia):</Typography>
                <Typography variant="body2" sx={{ color: '#2D1B17' }}>{selectedInvoice.tax}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px solid #F2E8DC' }}>
                <Typography variant="h6" sx={{ color: '#2D1B17', fontWeight: 700 }}>Total Pagado:</Typography>
                <Typography variant="h6" sx={{ color: '#FF6B00', fontWeight: 800 }}>{selectedInvoice.total}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedInvoice(null)} sx={{ color: '#667085', textTransform: 'none' }}>
            Cerrar
          </Button>
          <Button variant="contained" onClick={() => setSelectedInvoice(null)} sx={{ textTransform: 'none', backgroundColor: '#FF6B00', '&:hover': { backgroundColor: '#E85A00' } }}>
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
          sx: { backgroundColor: '#FFFFFF', borderRadius: 3, border: '1px solid #F2E8DC', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' },
        }}
      >
        <DialogTitle sx={{ color: '#2D1B17', fontWeight: 800 }}>
          ¿Confirmar cancelación?
        </DialogTitle>
        <DialogContent sx={{ color: '#2D1B17' }}>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            La suscripción a <strong>{cancelTargetSub?.planName}</strong> se cancelará. Conservarás acceso completo a tus recursos hasta el fin del ciclo de facturación ({cancelTargetSub?.renewalDate}).
          </Typography>
          <Typography variant="caption" sx={{ color: '#667085' }}>
            Tus datos no serán eliminados de inmediato. Dispones de un período de retención mínimo de 30 días.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCancelTargetSub(null)} sx={{ color: '#667085', textTransform: 'none' }}>
            Mantener Suscripción
          </Button>
          <Button variant="contained" color="error" onClick={handleConfirmCancel} sx={{ textTransform: 'none' }}>
            Confirmar Cancelación
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Order Dialog */}
      <Dialog
        open={Boolean(cancelTargetOrder)}
        onClose={() => setCancelTargetOrder(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { backgroundColor: '#FFFFFF', borderRadius: 3, border: '1px solid #F2E8DC', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' },
        }}
      >
        <DialogTitle sx={{ color: '#2D1B17', fontWeight: 800 }}>
          ¿Cancelar este pedido?
        </DialogTitle>
        <DialogContent sx={{ color: '#2D1B17' }}>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            El pedido #{cancelTargetOrder?.orderNumber || cancelTargetOrder?.id} se marcará como <strong>CANCELADO</strong> y la reserva temporal del dominio será liberada.
          </Typography>
          <Typography variant="caption" sx={{ color: '#667085' }}>
            Tu cuenta y los demás servicios activos permanecerán intactos. Podrás iniciar un nuevo pedido en cualquier momento.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCancelTargetOrder(null)} sx={{ color: '#667085', textTransform: 'none' }}>
            Volver
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleCancelOrder}
            disabled={cancellingOrderId !== null}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {cancellingOrderId ? 'Cancelando...' : 'Confirmar Cancelación'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
