'use client';

import * as React from 'react';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ReplayIcon from '@mui/icons-material/Replay';
import { useRouter } from 'next/navigation';
import { defaultApiClient } from '../../modules/api-client';
import { useCapabilities } from '../../modules/capabilities-context';

export default function OrdersPage() {
  const router = useRouter();
  const { capabilities } = useCapabilities();
  const [orders, setOrders] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const activeOrgId = capabilities?.organization?.id;

  const loadOrders = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await defaultApiClient.listOrders(activeOrgId);
      setOrders(data || []);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar las órdenes del cliente.');
    } finally {
      setLoading(false);
    }
  }, [activeOrgId]);

  React.useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', py: 3, px: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ReceiptLongIcon sx={{ color: '#FF6B00', fontSize: 32 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#2D1B17' }}>
              Historial de Órdenes y Contratos
            </Typography>
            <Typography variant="body2" sx={{ color: '#667085' }}>
              Organización: {capabilities?.organization?.name || activeOrgId || 'Cargando...'}
            </Typography>
          </Box>
        </Box>

        <Button
          variant="outlined"
          startIcon={<ReplayIcon />}
          onClick={loadOrders}
          size="small"
          sx={{
            color: '#2D1B17',
            borderColor: '#F2E8DC',
            textTransform: 'none',
            borderRadius: 2,
            '&:hover': { borderColor: '#FF6B00', backgroundColor: '#FFF8ED' },
          }}
        >
          Actualizar
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ p: 6, textAlign: 'center' }}>
          <CircularProgress size={36} sx={{ color: '#FF6B00', mb: 2 }} />
          <Typography variant="body2" sx={{ color: '#667085' }}>
            Cargando órdenes autorizadas...
          </Typography>
        </Box>
      ) : orders.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 5,
            textAlign: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: 3,
            border: '1px solid #F2E8DC',
          }}
        >
          <ReceiptLongIcon sx={{ color: '#9CA3AF', fontSize: 48, mb: 1.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#2D1B17', mb: 1 }}>
            No hay órdenes registradas
          </Typography>
          <Typography variant="body2" sx={{ color: '#667085', mb: 3, maxWidth: 500, mx: 'auto' }}>
            Esta organización aún no cuenta con órdenes de compra activas. Explora nuestro catálogo para comenzar.
          </Typography>
          <Button
            variant="contained"
            onClick={() => router.push('/cart')}
            sx={{
              backgroundColor: '#FF6B00',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              '&:hover': { backgroundColor: '#E85A00' },
            }}
          >
            Explorar Planes
          </Button>
        </Paper>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid #F2E8DC',
            backgroundColor: '#FFFFFF',
          }}
        >
          <Table>
            <TableHead sx={{ backgroundColor: '#FFFDF9' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#2D1B17' }}>Número</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#2D1B17' }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#2D1B17' }}>Ciclo</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#2D1B17' }}>Total</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#2D1B17' }}>Fecha</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#2D1B17', textAlign: 'right' }}>Acción</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((ord) => {
                const isPaid = ord.status === 'PAID' || ord.status === 'COMPLETED' || ord.status === 'ACTIVE';
                const isPending = ord.status === 'PENDING_PAYMENT' || ord.status === 'PROVISIONING';
                const totalFormatted = (Math.round((ord.totalCents || 0) / 100)).toLocaleString('es-CO');

                return (
                  <TableRow key={ord.id} hover>
                    <TableCell sx={{ fontWeight: 600, color: '#2D1B17' }}>
                      #{ord.orderNumber || ord.id}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ord.status}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          backgroundColor: isPaid ? '#D1FAE5' : isPending ? '#FEF3C7' : '#FEE2E2',
                          color: isPaid ? '#065F46' : isPending ? '#92400E' : '#991B1B',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: '#667085', fontSize: '0.85rem' }}>
                      {ord.billingCycle || 'MONTHLY'}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#FF6B00' }}>
                      ${totalFormatted} {ord.currency || 'COP'}
                    </TableCell>
                    <TableCell sx={{ color: '#667085', fontSize: '0.85rem' }}>
                      {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('es-CO') : 'Reciente'}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<VisibilityIcon />}
                        onClick={() => router.push(`/orders/${ord.id}`)}
                        sx={{
                          textTransform: 'none',
                          borderRadius: 2,
                          color: '#2D1B17',
                          borderColor: '#F2E8DC',
                          '&:hover': { borderColor: '#FF6B00', backgroundColor: '#FFF8ED' },
                        }}
                      >
                        Detalles
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
