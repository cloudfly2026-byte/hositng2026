'use client';

import * as React from 'react';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import { useRouter, useSearchParams } from 'next/navigation';
import { defaultApiClient } from '../../modules/api-client';

interface PlanMetadata {
  code: string;
  name: string;
  category: string;
  description: string;
  monthlyCop: number;
  annualCop: number;
  features: string[];
  popular?: boolean;
}

const AVAILABLE_PLANS: PlanMetadata[] = [
  {
    code: 'wp-starter',
    name: 'Velupi WordPress Starter',
    category: 'WordPress & PHP 8.3',
    description: 'Hosting optimizado para WordPress, WooCommerce y sitios de alto tráfico.',
    monthlyCop: 35000,
    annualCop: 350000,
    features: [
      '1 Sitio web WordPress administrado',
      '10 GB Almacenamiento NVMe ultrarrápido',
      'Certificados SSL Let\'s Encrypt automáticos',
      'PHP 8.2 / 8.3 con aceleración OPcache',
      'Base de datos MariaDB dedicada',
      'Copias de seguridad diarias automáticas',
    ],
    popular: true,
  },
  {
    code: 'cloud-apps-pro',
    name: 'Velupi Cloud Apps (Node/Python)',
    category: 'Docker & Microservicios',
    description: 'PaaS para contenedores Docker, APIs NestJS, FastAPI, Django y Next.js.',
    monthlyCop: 55000,
    annualCop: 550000,
    features: [
      'Despliegue de contenedores Docker en caliente',
      'Soporte Node.js, Python, Java y Go',
      'Subdominio automático *.apps.velupi.com',
      'Consola de logs y métricas en vivo',
      'Enrutamiento Traefik v3.7 con TLS 1.3',
      'Secret Vault cifrado multi-tenant',
    ],
  },
  {
    code: 'vps-dedicated',
    name: 'Velupi VPS Dedicado 4 MP',
    category: 'Dedicated Cloud VPS',
    description: 'Servidor virtual de uso exclusivo sin contención ni ruidos de vecinos.',
    monthlyCop: 140000,
    annualCop: 1400000,
    features: [
      '4 vCPU Cores dedicados de alta frecuencia',
      '16 GB RAM dedicada garantizada',
      '100 GB NVMe Storage empresarial',
      'IP pública dedicada exclusiva IPv4',
      'Aislamiento estricto (single-tenant)',
      'Acceso SSH con firewall y hardening',
    ],
  },
];

export default function CartPage() {
  return (
    <React.Suspense fallback={<Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>}>
      <CartContent />
    </React.Suspense>
  );
}

function CartContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPlan = searchParams.get('plan') || 'wp-starter';
  const initialCycle = searchParams.get('cycle')?.toUpperCase() === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';

  const [selectedPlanCode, setSelectedPlanCode] = React.useState<string>(initialPlan);
  const [billingCycle, setBillingCycle] = React.useState<'MONTHLY' | 'ANNUAL'>(initialCycle);
  const [cartId, setCartId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const selectedPlan = AVAILABLE_PLANS.find((p) => p.code === selectedPlanCode) || AVAILABLE_PLANS[0];

  const subtotal = billingCycle === 'ANNUAL' ? selectedPlan.annualCop : selectedPlan.monthlyCop;
  const tax = Math.round(subtotal * 0.19);
  const total = subtotal + tax;

  const syncCartWithServer = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!cartId) {
        const created = await defaultApiClient.createCart({
          planCode: selectedPlan.code,
          billingCycle,
          currency: 'COP',
        });
        if (created?.id) {
          setCartId(created.id);
        }
      } else {
        await defaultApiClient.updateCart(cartId, {
          billingCycle,
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Error al calcular cotización oficial en el servidor.');
    } finally {
      setLoading(false);
    }
  }, [selectedPlan.code, billingCycle, cartId]);

  React.useEffect(() => {
    syncCartWithServer();
  }, [selectedPlanCode, billingCycle]);

  const handleProceedToCheckout = () => {
    const token = defaultApiClient.getAuthToken();
    const checkoutPath = cartId
      ? `/checkout?cartId=${encodeURIComponent(cartId)}&plan=${selectedPlan.code}&cycle=${billingCycle}`
      : `/checkout?plan=${selectedPlan.code}&cycle=${billingCycle}`;

    if (!token) {
      const returnTo = encodeURIComponent(checkoutPath);
      const registerPath = cartId
        ? `/register?returnTo=${returnTo}&cartId=${encodeURIComponent(cartId)}`
        : `/register?returnTo=${returnTo}`;
      router.push(registerPath);
    } else {
      router.push(checkoutPath);
    }
  };

  return (
    <Box sx={{ maxWidth: 1150, mx: 'auto', py: 2 }}>
      {/* Stepper Navigation */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, backgroundColor: 'rgba(255,255,255,0.03)', px: 3, py: 1.5, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)' }}>
          <Chip label="1" size="small" color="primary" />
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#fff' }}>Carrito y Período</Typography>
          <Typography variant="body2" sx={{ color: '#6b7280', mx: 1 }}>→</Typography>
          <Chip label="2" size="small" variant="outlined" sx={{ color: '#9ca3af' }} />
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>Datos Fiscales</Typography>
          <Typography variant="body2" sx={{ color: '#6b7280', mx: 1 }}>→</Typography>
          <Chip label="3" size="small" variant="outlined" sx={{ color: '#9ca3af' }} />
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>Pago Seguro Wompi</Typography>
        </Box>
      </Box>

      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', mb: 1 }}>
          Tu Carrito de Compra Cloud
        </Typography>
        <Typography variant="body1" sx={{ color: '#9ca3af' }}>
          Configura tu período de facturación con cotización transparente calculada en tiempo real.
        </Typography>

        {/* Cycle Switcher */}
        <Box sx={{ mt: 3, display: 'inline-flex', p: 0.5, backgroundColor: '#111827', borderRadius: 3, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Button
            size="small"
            variant={billingCycle === 'MONTHLY' ? 'contained' : 'text'}
            color="primary"
            onClick={() => setBillingCycle('MONTHLY')}
            sx={{ px: 3 }}
          >
            Facturación Mensual
          </Button>
          <Button
            size="small"
            variant={billingCycle === 'ANNUAL' ? 'contained' : 'text'}
            color="primary"
            onClick={() => setBillingCycle('ANNUAL')}
            sx={{ px: 3 }}
          >
            Facturación Anual <Chip label="AHORRA 2 MESES" size="small" color="success" sx={{ ml: 1, height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Left Column: Plan Selector & Features */}
        <Grid item xs={12} md={7}>
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShoppingBagIcon color="primary" /> Selecciona o Cambia tu Plan
          </Typography>

          {AVAILABLE_PLANS.map((plan) => {
            const isSelected = plan.code === selectedPlanCode;
            const priceForCycle = billingCycle === 'ANNUAL' ? plan.annualCop : plan.monthlyCop;

            return (
              <Card
                key={plan.code}
                onClick={() => setSelectedPlanCode(plan.code)}
                sx={{
                  mb: 2,
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.08)' : '#1f2937',
                  border: isSelected ? '2px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: '#60a5fa',
                  },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#fff' }}>
                          {plan.name}
                        </Typography>
                        {plan.popular && (
                          <Chip label="MÁS POPULAR" size="small" color="primary" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                        {plan.category}
                      </Typography>
                    </Box>

                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: isSelected ? '#60a5fa' : '#fff' }}>
                        ${priceForCycle.toLocaleString('es-CO')} COP
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                        /{billingCycle === 'ANNUAL' ? 'año' : 'mes'}
                      </Typography>
                    </Box>
                  </Box>

                  <Typography variant="body2" sx={{ color: '#d1d5db', mb: 2 }}>
                    {plan.description}
                  </Typography>

                  <Divider sx={{ my: 1.5, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

                  {/* Highlights Grid */}
                  <Grid container spacing={1}>
                    {plan.features.slice(0, 4).map((f, i) => (
                      <Grid item xs={12} sm={6} key={i}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <CheckCircleIcon sx={{ fontSize: 16, color: '#10b981' }} />
                          <Typography variant="caption" sx={{ color: '#e5e7eb' }}>
                            {f}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            );
          })}

          {/* Guarantees Box */}
          <Box sx={{ display: 'flex', gap: 2, mt: 3, p: 2, backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 2, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SpeedIcon color="success" />
              <Typography variant="caption" sx={{ color: '#9ca3af' }}>Activación instantánea</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon color="primary" />
              <Typography variant="caption" sx={{ color: '#9ca3af' }}>SLA 99.9% de Disponibilidad</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LockIcon sx={{ color: '#f59e0b' }} />
              <Typography variant="caption" sx={{ color: '#9ca3af' }}>Sin permanencia forzosa</Typography>
            </Box>
          </Box>
        </Grid>

        {/* Right Column: Order Summary Card */}
        <Grid item xs={12} md={5}>
          <Paper
            elevation={3}
            sx={{
              p: 3.5,
              backgroundColor: '#111827',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              position: 'sticky',
              top: 20,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#fff', mb: 2 }}>
              Resumen del Pedido
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#38bdf8' }}>
                {selectedPlan.name}
              </Typography>
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                Período: {billingCycle === 'ANNUAL' ? '12 meses (Anual con descuento)' : '1 mes (Facturación Mensual)'}
              </Typography>
            </Box>

            <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>Subtotal neto</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff' }}>
                ${subtotal.toLocaleString('es-CO')} COP
              </Typography>
            </Box>

            {billingCycle === 'ANNUAL' && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: '#10b981' }}>Descuento 2 meses gratis</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#10b981' }}>
                  -${(selectedPlan.monthlyCop * 2).toLocaleString('es-CO')} COP
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>IVA (19% Colombia)</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff' }}>
                ${tax.toLocaleString('es-CO')} COP
              </Typography>
            </Box>

            <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.15)' }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#fff' }}>Total a Pagar</Typography>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#10b981' }}>
                  ${total.toLocaleString('es-CO')} COP
                </Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                  Precios finales en moneda local
                </Typography>
              </Box>
            </Box>

            <Button
              fullWidth
              size="large"
              variant="contained"
              color="primary"
              disabled={loading}
              onClick={handleProceedToCheckout}
              endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ArrowForwardIcon />}
              sx={{
                py: 1.8,
                fontWeight: 800,
                fontSize: '1rem',
                borderRadius: 2,
                boxShadow: '0 8px 24px rgba(59, 130, 246, 0.35)',
              }}
            >
              {loading ? 'Sincronizando Carrito...' : 'Continuar al Checkout'}
            </Button>

            <Box sx={{ mt: 3, pt: 2, borderTop: '1px dashed rgba(255,255,255,0.08)' }}>
              <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', lineHeight: 1.5 }}>
                • <strong>Renovación transparente</strong>: Al vencer el ciclo contratado, renovarás a la tarifa vigente sin penalizaciones.
                <br />
                • <strong>Garantía de activación</strong>: El servicio se aprovisiona automáticamente en cuanto Wompi confirme tu transacción.
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
