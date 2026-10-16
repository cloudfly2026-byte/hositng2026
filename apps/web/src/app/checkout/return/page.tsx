'use client';

import * as React from 'react';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ReplayIcon from '@mui/icons-material/Replay';
import { useRouter, useSearchParams } from 'next/navigation';
import { defaultApiClient } from '../../../modules/api-client';

export default function CheckoutReturnPage() {
  return (
    <React.Suspense fallback={<Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>}>
      <ReturnContent />
    </React.Suspense>
  );
}

function ReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Wompi may pass ?id=<transactionId> or custom ?orderId=<orderId>
  const transactionId = searchParams.get('id');
  const orderId = searchParams.get('orderId');

  const [loading, setLoading] = React.useState(true);
  const [order, setOrder] = React.useState<any | null>(null);
  const [pollCount, setPollCount] = React.useState(0);

  const fetchOrderStatus = React.useCallback(async () => {
    const idToLookup = orderId || transactionId;
    if (!idToLookup) {
      setLoading(false);
      return;
    }

    try {
      const orderData = await defaultApiClient.getOrder(idToLookup);
      setOrder(orderData);
    } catch {
      // If direct order lookup isn't ready or order was by transaction ID, keep polling
    } finally {
      setLoading(false);
    }
  }, [orderId, transactionId]);

  React.useEffect(() => {
    fetchOrderStatus();

    // Auto-poll while status is pending or provisioning (up to 15 times)
    const interval = setInterval(() => {
      setPollCount((prev) => {
        if (prev < 15) {
          fetchOrderStatus();
          return prev + 1;
        }
        clearInterval(interval);
        return prev;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [fetchOrderStatus]);

  const status = order?.status || 'PENDING_PAYMENT';

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', py: 6, px: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 5 },
          backgroundColor: '#FFFFFF',
          border: '1px solid #F2E8DC',
          borderRadius: 3,
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
        }}
      >
        {loading ? (
          <Box sx={{ py: 4 }}>
            <CircularProgress size={48} sx={{ color: '#FF6B00', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#2D1B17', fontWeight: 700 }}>
              Consultando estado del pedido con Wompi...
            </Typography>
            <Typography variant="body2" sx={{ color: '#667085', mt: 1 }}>
              Verificando confirmación criptográfica en el Control Plane.
            </Typography>
          </Box>
        ) : status === 'ACTIVE' || status === 'COMPLETED' ? (
          <Box>
            <CheckCircleOutlineIcon sx={{ fontSize: '4.5rem', color: '#10B981', mb: 2 }} />
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#2D1B17', mb: 1 }}>
              ¡Tu Servicio Cloud está Activo!
            </Typography>
            <Typography variant="body1" sx={{ color: '#667085', mb: 3 }}>
              El pago fue verificado y tu infraestructura ha sido provisionada exitosamente.
            </Typography>

            {order?.orderNumber && (
              <Chip
                label={`Orden #${order.orderNumber}`}
                sx={{ mb: 3, fontWeight: 700, backgroundColor: '#D1FAE5', color: '#065F46' }}
              />
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                onClick={() => router.push('/')}
                sx={{ py: 1.2, px: 4, fontWeight: 700, borderRadius: 2, backgroundColor: '#FF6B00', '&:hover': { backgroundColor: '#E85A00' } }}
              >
                Ir al Dashboard
              </Button>
            </Box>
          </Box>
        ) : status === 'PAID' || status === 'PROVISIONING' ? (
          <Box>
            <RocketLaunchIcon sx={{ fontSize: '4rem', color: '#FF6B00', mb: 2 }} />
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#2D1B17', mb: 1 }}>
              ¡Pago Confirmado!
            </Typography>
            <Typography variant="body1" sx={{ color: '#667085', mb: 3 }}>
              Estamos configurando tu contenedor, zonas DNS y certificados SSL en tiempo real...
            </Typography>

            <Box sx={{ width: '100%', mb: 3 }}>
              <LinearProgress sx={{ height: 8, borderRadius: 4, backgroundColor: '#FFF4E5', '& .MuiLinearProgress-bar': { backgroundColor: '#FF6B00' } }} />
              <Typography variant="caption" sx={{ color: '#FF6B00', mt: 1, display: 'block', fontWeight: 600 }}>
                Aprovisionando infraestructura (BullMQ Worker activo)...
              </Typography>
            </Box>

            <Button
              variant="outlined"
              startIcon={<ReplayIcon />}
              onClick={fetchOrderStatus}
              sx={{ color: '#2D1B17', borderColor: '#F2E8DC', textTransform: 'none', borderRadius: 2, '&:hover': { borderColor: '#FF6B00', backgroundColor: '#FFF8ED' } }}
            >
              Actualizar Estado
            </Button>
          </Box>
        ) : status === 'FAILED' || status === 'CANCELLED' ? (
          <Box>
            <ErrorOutlineIcon sx={{ fontSize: '4.5rem', color: '#EF4444', mb: 2 }} />
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#2D1B17', mb: 1 }}>
              Pago No Aprobado
            </Typography>
            <Typography variant="body1" sx={{ color: '#667085', mb: 3 }}>
              La entidad bancaria rechazó la transacción o fue cancelada por el usuario. No se ha realizado ningún cobro.
            </Typography>

            <Button
              variant="contained"
              size="large"
              onClick={() => router.push('/cart')}
              sx={{ py: 1.2, px: 4, fontWeight: 700, borderRadius: 2, backgroundColor: '#FF6B00', '&:hover': { backgroundColor: '#E85A00' } }}
            >
              Volver al Carrito y Reintentar
            </Button>
          </Box>
        ) : (
          <Box>
            <HourglassEmptyIcon sx={{ fontSize: '4rem', color: '#F59E0B', mb: 2 }} />
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#2D1B17', mb: 1 }}>
              Validando Pago
            </Typography>
            <Typography variant="body1" sx={{ color: '#667085', mb: 3 }}>
              Estamos a la espera de la confirmación oficial del webhook firmado de Wompi. Esto suele tardar unos segundos.
            </Typography>

            <CircularProgress size={24} sx={{ color: '#FF6B00', mb: 2 }} />

            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ReplayIcon />}
                onClick={fetchOrderStatus}
                sx={{ color: '#2D1B17', borderColor: '#F2E8DC', textTransform: 'none', borderRadius: 2, '&:hover': { borderColor: '#FF6B00', backgroundColor: '#FFF8ED' } }}
              >
                Comprobar ahora
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
