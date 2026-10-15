'use client';

import * as React from 'react';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReplayIcon from '@mui/icons-material/Replay';
import { useParams, useRouter } from 'next/navigation';
import { defaultApiClient } from '../../../modules/api-client';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.orderId as string;

  const [order, setOrder] = React.useState<any | null>(null);
  const [job, setJob] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    if (!orderId) return;
    setError(null);

    try {
      const orderData = await defaultApiClient.getOrder(orderId);
      setOrder(orderData);

      // If job is in progress or completed, attempt to fetch job progress
      if (orderData?.provisioningJobId) {
        try {
          const jobData = await defaultApiClient.getProvisioningJob(
            orderData.provisioningJobId,
            orderData.organizationId
          );
          setJob(jobData);
        } catch {
          // Non-blocking
        }
      }
    } catch (err: any) {
      setError(err?.message || `No se pudo encontrar la orden ${orderId}`);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  React.useEffect(() => {
    loadData();

    // Auto refresh while pending or provisioning
    const interval = setInterval(() => {
      if (order?.status === 'PENDING_PAYMENT' || order?.status === 'PROVISIONING') {
        loadData();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [loadData, order?.status]);

  if (loading) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <CircularProgress size={40} sx={{ color: '#06b6d4', mb: 2 }} />
        <Typography variant="body1" sx={{ color: '#9ca3af' }}>
          Cargando detalles de la orden...
        </Typography>
      </Box>
    );
  }

  if (error || !order) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', py: 6, px: 2 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'Orden no encontrada.'}
        </Alert>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => router.push('/')}>
          Volver al Inicio
        </Button>
      </Box>
    );
  }

  const isCompleted = order.status === 'COMPLETED' || order.status === 'ACTIVE';
  const isPaid = order.status === 'PAID' || order.status === 'PROVISIONING';
  const isFailed = order.status === 'FAILED' || order.status === 'CANCELLED';

  const totalCop = Math.round(order.totalCents / 100);
  const subtotalCop = Math.round(order.subtotalCents / 100);
  const taxCop = Math.round(order.taxCents / 100);

  return (
    <Box sx={{ maxWidth: 840, mx: 'auto', py: 4, px: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff' }}>
              Orden #{order.orderNumber}
            </Typography>
            <Chip
              label={order.status}
              color={isCompleted ? 'success' : isPaid ? 'primary' : isFailed ? 'error' : 'warning'}
              sx={{ fontWeight: 700, fontSize: '0.75rem' }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>
            ID del Pedido: {order.id} · Moneda: {order.currency}
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<ReplayIcon />}
          onClick={loadData}
          size="small"
          sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)', textTransform: 'none' }}
        >
          Actualizar
        </Button>
      </Box>

      {/* Provisioning Progress Card if Paid */}
      {isPaid && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            backgroundColor: 'rgba(6, 182, 212, 0.05)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            borderRadius: 3,
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <RocketLaunchIcon sx={{ color: '#06b6d4' }} />
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
              {isCompleted ? 'Aprovisionamiento Exitoso' : 'Aprovisionamiento en Progreso'}
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ color: '#9ca3af', mb: 2 }}>
            {isCompleted
              ? 'Todos los componentes cloud (servidor, DNS y SSL) han sido verificados y están operativos.'
              : 'El worker BullMQ está desplegando los recursos y configurando certificados SSL TLS 1.3.'}
          </Typography>

          <Box sx={{ width: '100%', mb: 1 }}>
            <LinearProgress
              variant={job ? 'determinate' : 'indeterminate'}
              value={job?.progressPercentage || 65}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
          <Typography variant="caption" sx={{ color: '#06b6d4', fontWeight: 600 }}>
            Paso actual: {job?.currentStep || 'CONFIGURING_SERVICES'} ({job?.progressPercentage || 65}%)
          </Typography>
        </Paper>
      )}

      {/* Order Details Card */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          backgroundColor: '#111827',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 3,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', mb: 2 }}>
          Líneas de la Orden
        </Typography>

        {order.items?.map((item: any, idx: number) => (
          <Box key={idx} sx={{ mb: 2, p: 2, backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700 }}>
              Plan Version: {item.planVersionId}
            </Typography>
            <Typography variant="caption" sx={{ color: '#9ca3af' }}>
              Ciclo: {item.billingCycle || order.billingCycle} · Cantidad: {item.quantity}
            </Typography>
          </Box>
        ))}

        <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>Subtotal</Typography>
          <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
            ${subtotalCop.toLocaleString('es-CO')} COP
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>IVA 19%</Typography>
          <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
            ${taxCop.toLocaleString('es-CO')} COP
          </Typography>
        </Box>

        <Divider sx={{ my: 1.5, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700 }}>Total</Typography>
          <Typography variant="h5" sx={{ color: '#06b6d4', fontWeight: 800 }}>
            ${totalCop.toLocaleString('es-CO')} COP
          </Typography>
        </Box>

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => router.push('/')}
            sx={{ fontWeight: 700 }}
          >
            Ir al Dashboard
          </Button>
          <Button
            variant="outlined"
            onClick={() => router.push('/billing')}
            sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}
          >
            Ver Todas las Facturas
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
