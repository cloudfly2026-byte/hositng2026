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
        <CircularProgress size={40} sx={{ color: '#FF6B00', mb: 2 }} />
        <Typography variant="body1" sx={{ color: '#667085' }}>
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
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#2D1B17' }}>
              Orden #{order.orderNumber}
            </Typography>
            <Chip
              label={order.status}
              sx={{
                fontWeight: 700,
                fontSize: '0.75rem',
                backgroundColor: isCompleted ? '#D1FAE5' : isPaid ? '#FFF4E5' : isFailed ? '#FEE2E2' : '#FEF3C7',
                color: isCompleted ? '#065F46' : isPaid ? '#FF6B00' : isFailed ? '#991B1B' : '#92400E',
              }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: '#667085' }}>
            ID del Pedido: {order.id} · Moneda: {order.currency}
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<ReplayIcon />}
          onClick={loadData}
          size="small"
          sx={{ color: '#2D1B17', borderColor: '#F2E8DC', textTransform: 'none', borderRadius: 2, '&:hover': { borderColor: '#FF6B00', backgroundColor: '#FFF8ED' } }}
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
            backgroundColor: '#FFFDF9',
            border: '1px solid #F2E8DC',
            borderRadius: 3,
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <RocketLaunchIcon sx={{ color: '#FF6B00' }} />
            <Typography variant="h6" sx={{ color: '#2D1B17', fontWeight: 700 }}>
              {isCompleted ? 'Aprovisionamiento Exitoso' : 'Aprovisionamiento en Progreso'}
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ color: '#667085', mb: 2 }}>
            {isCompleted
              ? 'Todos los componentes cloud (servidor, DNS y SSL) han sido verificados y están operativos.'
              : 'El worker BullMQ está desplegando los recursos y configurando certificados SSL TLS 1.3.'}
          </Typography>

          <Box sx={{ width: '100%', mb: 1 }}>
            <LinearProgress
              variant={job ? 'determinate' : 'indeterminate'}
              value={job?.progressPercentage || 65}
              sx={{ height: 8, borderRadius: 4, backgroundColor: '#FFF4E5', '& .MuiLinearProgress-bar': { backgroundColor: '#FF6B00' } }}
            />
          </Box>
          <Typography variant="caption" sx={{ color: '#FF6B00', fontWeight: 600 }}>
            Paso actual: {job?.currentStep || 'CONFIGURING_SERVICES'} ({job?.progressPercentage || 65}%)
          </Typography>
        </Paper>
      )}

      {/* Order Details Card */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          backgroundColor: '#FFFFFF',
          border: '1px solid #F2E8DC',
          borderRadius: 3,
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#2D1B17', mb: 2 }}>
          Líneas de la Orden
        </Typography>

        {order.items?.map((item: any, idx: number) => (
          <Box key={idx} sx={{ mb: 2, p: 2, backgroundColor: '#FFFDF9', borderRadius: 2, border: '1px solid #F2E8DC' }}>
            <Typography variant="subtitle1" sx={{ color: '#2D1B17', fontWeight: 700 }}>
              Plan Version: {item.planVersionId}
            </Typography>
            <Typography variant="caption" sx={{ color: '#667085' }}>
              Ciclo: {item.billingCycle || order.billingCycle} · Cantidad: {item.quantity}
            </Typography>
          </Box>
        ))}

        <Divider sx={{ my: 2, borderColor: '#F2E8DC' }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" sx={{ color: '#667085' }}>Subtotal</Typography>
          <Typography variant="body2" sx={{ color: '#2D1B17', fontWeight: 600 }}>
            ${subtotalCop.toLocaleString('es-CO')} COP
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" sx={{ color: '#667085' }}>IVA 19%</Typography>
          <Typography variant="body2" sx={{ color: '#2D1B17', fontWeight: 600 }}>
            ${taxCop.toLocaleString('es-CO')} COP
          </Typography>
        </Box>

        <Divider sx={{ my: 1.5, borderColor: '#F2E8DC' }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Typography variant="subtitle1" sx={{ color: '#2D1B17', fontWeight: 700 }}>Total</Typography>
          <Typography variant="h5" sx={{ color: '#FF6B00', fontWeight: 800 }}>
            ${totalCop.toLocaleString('es-CO')} COP
          </Typography>
        </Box>

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={() => router.push('/')}
            sx={{ fontWeight: 700, borderRadius: 2, backgroundColor: '#FF6B00', '&:hover': { backgroundColor: '#E85A00' } }}
          >
            Ir al Dashboard
          </Button>
          <Button
            variant="outlined"
            onClick={() => router.push('/billing')}
            sx={{ color: '#2D1B17', borderColor: '#F2E8DC', borderRadius: 2, '&:hover': { borderColor: '#FF6B00', backgroundColor: '#FFF8ED' } }}
          >
            Ver Todas las Facturas
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
