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
  const tokenParam = searchParams.get('token');
  const refreshTokenParam = searchParams.get('refreshToken');

  React.useEffect(() => {
    if (tokenParam) {
      defaultApiClient.setAuthToken(tokenParam);
      if (typeof window !== 'undefined') {
        localStorage.setItem('velupi_auth_token', tokenParam);
        if (refreshTokenParam) {
          localStorage.setItem('velupi_refresh_token', refreshTokenParam);
        }
      }
    }
  }, [tokenParam, refreshTokenParam]);

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
    } catch (_err: any) {
      // Local cart is always valid even if backend sync encounters transient offline/network delay
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, backgroundColor: '#FFFFFF', px: 3, py: 1.5, borderRadius: 3, border: '1px solid #F2E8DC', boxShadow: '0 2px 8px rgba(255, 107, 0, 0.04)' }}>
          <Chip label="1" size="small" color="primary" />
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#2D1B17' }}>Carrito y Período</Typography>
          <Typography variant="body2" sx={{ color: '#9CA3AF', mx: 1 }}>→</Typography>
          <Chip label="2" size="small" variant="outlined" sx={{ color: '#6B7280', borderColor: '#E5E7EB' }} />
          <Typography variant="body2" sx={{ color: '#6B7280' }}>Datos Fiscales</Typography>
          <Typography variant="body2" sx={{ color: '#9CA3AF', mx: 1 }}>→</Typography>
          <Chip label="3" size="small" variant="outlined" sx={{ color: '#6B7280', borderColor: '#E5E7EB' }} />
          <Typography variant="body2" sx={{ color: '#6B7280' }}>Pago Seguro Wompi</Typography>
        </Box>
      </Box>

      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#2D1B17', mb: 1 }}>
          Tu Carrito de Compra Cloud
        </Typography>
        <Typography variant="body1" sx={{ color: '#667085' }}>
          Configura tu período de facturación con cotización transparente calculada en tiempo real.
        </Typography>

        {/* Cycle Switcher */}
        <Box sx={{ mt: 3, display: 'inline-flex', p: 0.5, backgroundColor: '#FFFFFF', borderRadius: 3, border: '1px solid #F2E8DC', boxShadow: '0 2px 8px rgba(255, 107, 0, 0.04)' }}>
          <Button
            size="small"
            variant={billingCycle === 'MONTHLY' ? 'contained' : 'text'}
            color="primary"
            onClick={() => setBillingCycle('MONTHLY')}
            sx={{ px: 3, fontWeight: 700 }}
          >
            Facturación Mensual
          </Button>
          <Button
            size="small"
            variant={billingCycle === 'ANNUAL' ? 'contained' : 'text'}
            color="primary"
            onClick={() => setBillingCycle('ANNUAL')}
            sx={{ px: 3, fontWeight: 700 }}
          >
            Facturación Anual <Chip label="AHORRA 2 MESES" size="small" sx={{ ml: 1, height: 20, fontSize: '0.65rem', fontWeight: 700, backgroundColor: '#10B981', color: '#fff' }} />
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Left Column: Plan Selector & Features */}
        <Grid item xs={12} md={7}>
          <Typography variant="h6" sx={{ color: '#2D1B17', fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShoppingBagIcon sx={{ color: '#FF6B00' }} /> Selecciona o Cambia tu Plan
          </Typography>

          {AVAILABLE_PLANS.map((plan) => {
            const isSelected = plan.code === selectedPlanCode;
            const priceForCycle = billingCycle === 'ANNUAL' ? plan.annualCop : plan.monthlyCop;

            return (
              <Card
                key={plan.code}
                onClick={() => setSelectedPlanCode(plan.code)}
                sx={{
                  mb: 2.5,
                  cursor: 'pointer',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 3,
                  border: isSelected ? '2px solid #FF6B00' : '1px solid #F2E8DC',
                  boxShadow: isSelected ? '0 4px 16px rgba(255, 107, 0, 0.12)' : '0 2px 8px rgba(0, 0, 0, 0.03)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: '#FF6B00',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#2D1B17' }}>
                          {plan.name}
                        </Typography>
                        {plan.popular && (
                          <Chip label="MÁS POPULAR" size="small" color="primary" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ color: '#667085', fontWeight: 600 }}>
                        {plan.category}
                      </Typography>
                    </Box>

                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#FF6B00' }}>
                        ${priceForCycle.toLocaleString('es-CO')} COP
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#667085' }}>
                        /{billingCycle === 'ANNUAL' ? 'año' : 'mes'}
                      </Typography>
                    </Box>
                  </Box>

                  <Typography variant="body2" sx={{ color: '#555555', mb: 2 }}>
                    {plan.description}
                  </Typography>

                  <Divider sx={{ my: 1.5, borderColor: '#F2E8DC' }} />

                  {/* Highlights Grid */}
                  <Grid container spacing={1}>
                    {plan.features.slice(0, 4).map((f, i) => (
                      <Grid item xs={12} sm={6} key={i}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <CheckCircleIcon sx={{ fontSize: 16, color: '#10B981' }} />
                          <Typography variant="caption" sx={{ color: '#4B5563', fontWeight: 500 }}>
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
          <Box sx={{ display: 'flex', gap: 2, mt: 3, p: 2, backgroundColor: '#FFFFFF', borderRadius: 2, border: '1px solid #F2E8DC' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SpeedIcon sx={{ color: '#10B981' }} />
              <Typography variant="caption" sx={{ color: '#4B5563', fontWeight: 600 }}>Activación instantánea</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon sx={{ color: '#FF6B00' }} />
              <Typography variant="caption" sx={{ color: '#4B5563', fontWeight: 600 }}>SLA 99.9% de Disponibilidad</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LockIcon sx={{ color: '#FFB800' }} />
              <Typography variant="caption" sx={{ color: '#4B5563', fontWeight: 600 }}>Sin permanencia forzosa</Typography>
            </Box>
          </Box>
        </Grid>

        {/* Right Column: Order Summary Card */}
        <Grid item xs={12} md={5}>
          <Paper
            elevation={0}
            sx={{
              p: 3.5,
              backgroundColor: '#FFFFFF',
              border: '1px solid #F2E8DC',
              borderRadius: 3,
              boxShadow: '0 4px 16px rgba(255, 107, 0, 0.06)',
              position: 'sticky',
              top: 20,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#2D1B17', mb: 2 }}>
              Resumen del Pedido
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#FF6B00' }}>
                {selectedPlan.name}
              </Typography>
              <Typography variant="body2" sx={{ color: '#667085' }}>
                Período: {billingCycle === 'ANNUAL' ? '12 meses (Anual con descuento)' : '1 mes (Facturación Mensual)'}
              </Typography>
            </Box>

            <Divider sx={{ my: 2, borderColor: '#F2E8DC' }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="body2" sx={{ color: '#667085' }}>Subtotal neto</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#2D1B17' }}>
                ${subtotal.toLocaleString('es-CO')} COP
              </Typography>
            </Box>

            {billingCycle === 'ANNUAL' && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: '#10b981', fontWeight: 600 }}>Descuento 2 meses gratis</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#10b981' }}>
                  -${(selectedPlan.monthlyCop * 2).toLocaleString('es-CO')} COP
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body2" sx={{ color: '#667085' }}>IVA (19% Colombia)</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#2D1B17' }}>
                ${tax.toLocaleString('es-CO')} COP
              </Typography>
            </Box>

            <Divider sx={{ my: 2, borderColor: '#F2E8DC' }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#2D1B17' }}>Total a Pagar</Typography>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#FF6B00' }}>
                  ${total.toLocaleString('es-CO')} COP
                </Typography>
                <Typography variant="caption" sx={{ color: '#667085' }}>
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
              }}
            >
              {loading ? 'Sincronizando Carrito...' : 'Continuar al Checkout'}
            </Button>

            <Box sx={{ mt: 3, pt: 2, borderTop: '1px dashed #F2E8DC' }}>
              <Typography variant="caption" sx={{ color: '#667085', display: 'block', lineHeight: 1.5 }}>
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
