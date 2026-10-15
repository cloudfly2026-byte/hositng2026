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
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import CheckIcon from '@mui/icons-material/Check';
import ShoppingCartCheckoutIcon from '@mui/icons-material/ShoppingCartCheckout';
import LockIcon from '@mui/icons-material/Lock';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { defaultApiClient } from '../../modules/api-client';

interface PlanOption {
  id: string;
  name: string;
  category: string;
  monthlyPriceCop: number;
  features: string[];
  recommended?: boolean;
}

const plans: PlanOption[] = [
  {
    id: 'wp-starter',
    name: 'Velupi WordPress Starter',
    category: 'WordPress / PHP',
    monthlyPriceCop: 35000,
    features: [
      '1 Sitio WordPress administrado',
      '10 GB Almacenamiento NVMe',
      'Certificados SSL Let\'s Encrypt gratis',
      'PHP 8.2 / 8.3 acelerado con OPcache',
      'Base de datos MariaDB dedicada',
      'Copias de seguridad diarias automáticas',
    ],
    recommended: true,
  },
  {
    id: 'cloud-apps-pro',
    name: 'Velupi Cloud Apps (Node/Python)',
    category: 'Docker / Dokploy',
    monthlyPriceCop: 55000,
    features: [
      'Despliegue de contenedores Docker',
      'Soporte Next.js, NestJS, FastAPI, Django',
      'Dominio temporal *.apps.velupi.com',
      'Consola de logs en vivo',
      'Secret Vault cifrado',
      'Subdominios y SSL automático Traefik',
    ],
  },
  {
    id: 'vps-dedicated',
    name: 'Velupi VPS Dedicado 4 MP',
    category: 'Dedicated Cloud (Contabo)',
    monthlyPriceCop: 140000,
    features: [
      '4 vCPU Cores dedicados',
      '16 GB RAM dedicada',
      '100 GB NVMe Storage',
      'IP pública dedicada exclusiva',
      'Acceso SSH root y hardening',
      'Sin contención de recursos (single-tenant)',
    ],
  },
];

export default function CheckoutPage() {
  const [selectedPlanId, setSelectedPlanId] = React.useState('wp-starter');
  const [billingCycle, setBillingCycle] = React.useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [orderCompleted, setOrderCompleted] = React.useState(false);
  const [checkoutUrl, setCheckoutUrl] = React.useState<string | null>(null);
  const [orderNumber, setOrderNumber] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];

  const subtotal = billingCycle === 'ANNUAL'
    ? selectedPlan.monthlyPriceCop * 10 // 2 months free discount
    : selectedPlan.monthlyPriceCop;

  const tax = Math.round(subtotal * 0.19); // 19% IVA Colombia
  const total = subtotal + tax;

  const handleCheckout = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const planVersionMap: Record<string, string> = {
        'wp-starter': 'ver-wp-starter-v1',
        'app-node': 'ver-node-starter-v1',
        'vps-pro': 'ver-vps-pro-v1',
      };
      const planVersionId = planVersionMap[selectedPlanId] || 'ver-wp-starter-v1';
      const idempotencyKey = `idem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const redirectUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/billing`
          : 'https://app.velupi.com/billing';

      const result = await defaultApiClient.createCheckoutOrder({
        organizationId: 'org-velupi-internal',
        currency: 'COP',
        billingCycle,
        items: [{ planVersionId, quantity: 1 }],
        idempotencyKey,
        customerEmail: 'operaciones@velupi.com',
        redirectUrl,
      });

      if (result?.order?.orderNumber) {
        setOrderNumber(result.order.orderNumber);
      }
      if (result?.session?.checkoutUrl) {
        setCheckoutUrl(result.session.checkoutUrl);
      }
      setOrderCompleted(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al conectar con la pasarela o el Control Plane.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', mb: 1 }}>
          Selecciona tu Plan Cloud
        </Typography>
        <Typography variant="body1" sx={{ color: '#9ca3af' }}>
          Infraestructura cloud de alto rendimiento con activación instantánea y pago seguro vía Wompi.
        </Typography>

        {/* Billing Cycle Toggle */}
        <Box sx={{ mt: 3, display: 'inline-flex', p: 0.5, backgroundColor: '#111827', borderRadius: 3, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Button
            size="small"
            variant={billingCycle === 'MONTHLY' ? 'contained' : 'text'}
            color="primary"
            onClick={() => setBillingCycle('MONTHLY')}
          >
            Facturación Mensual
          </Button>
          <Button
            size="small"
            variant={billingCycle === 'ANNUAL' ? 'contained' : 'text'}
            color="primary"
            onClick={() => setBillingCycle('ANNUAL')}
          >
            Facturación Anual <Chip label="2 MESES GRATIS" size="small" color="success" sx={{ ml: 1, height: 20, fontSize: '0.65rem' }} />
          </Button>
        </Box>
      </Box>

      {/* Plans Comparison Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {plans.map((plan) => {
          const isSelected = plan.id === selectedPlanId;
          const displayPrice = billingCycle === 'ANNUAL'
            ? Math.round((plan.monthlyPriceCop * 10) / 12)
            : plan.monthlyPriceCop;

          return (
            <Grid item xs={12} md={4} key={plan.id}>
              <Card
                onClick={() => setSelectedPlanId(plan.id)}
                sx={{
                  backgroundColor: '#111827',
                  cursor: 'pointer',
                  border: isSelected ? '2px solid #06b6d4' : '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: isSelected ? '0 8px 24px rgba(6, 182, 212, 0.2)' : 'none',
                  transition: 'all 0.2s ease-in-out',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                {plan.recommended && (
                  <Chip
                    label="MÁS POPULAR"
                    size="small"
                    color="primary"
                    sx={{ position: 'absolute', top: 12, right: 12, fontWeight: 700, fontSize: '0.65rem' }}
                  />
                )}
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Typography variant="overline" sx={{ color: '#06b6d4', fontWeight: 700 }}>
                    {plan.category}
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 1 }}>
                    {plan.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 2 }}>
                    <Typography variant="h4" sx={{ color: '#fff', fontWeight: 800 }}>
                      ${displayPrice.toLocaleString('es-CO')}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#9ca3af', ml: 1 }}>
                      COP / mes
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {plan.features.map((feature, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckIcon fontSize="small" sx={{ color: '#10b981' }} />
                        <Typography variant="body2" sx={{ color: '#d1d5db', fontSize: '0.85rem' }}>
                          {feature}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Order Summary & Checkout Box */}
      <Paper sx={{ p: 4, backgroundColor: '#111827', borderRadius: 3, maxWidth: 650, mx: 'auto' }}>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShoppingCartCheckoutIcon sx={{ color: '#06b6d4' }} /> Resumen de la Orden
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>Plan seleccionado:</Typography>
          <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>{selectedPlan.name}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>Ciclo de cobro:</Typography>
          <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>{billingCycle === 'ANNUAL' ? 'Anual (Descuento 2 meses)' : 'Mensual'}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>Subtotal:</Typography>
          <Typography variant="body2" sx={{ color: '#fff' }}>${subtotal.toLocaleString('es-CO')} COP</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>IVA (19% Colombia):</Typography>
          <Typography variant="body2" sx={{ color: '#fff' }}>${tax.toLocaleString('es-CO')} COP</Typography>
        </Box>

        <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>Total a pagar:</Typography>
          <Typography variant="h5" sx={{ color: '#06b6d4', fontWeight: 800 }}>${total.toLocaleString('es-CO')} COP</Typography>
        </Box>

        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>Error en Checkout</AlertTitle>
            {errorMessage}
          </Alert>
        )}

        {orderCompleted ? (
          <Box sx={{ p: 2.5, backgroundColor: 'rgba(16, 185, 129, 0.15)', borderRadius: 2, textAlign: 'center', border: '1px solid #10b981' }}>
            <Typography variant="body1" sx={{ color: '#10b981', fontWeight: 700, mb: 0.5 }}>
              ¡Orden creada en el Control Plane!
            </Typography>
            {orderNumber && (
              <Typography variant="body2" sx={{ color: '#fff', mb: 1 }}>
                Número de Orden: <strong>{orderNumber}</strong>
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mb: 2 }}>
              Sesión de pago generada de forma segura mediante Wompi (Colombia).
            </Typography>

            {checkoutUrl ? (
              <Button
                variant="contained"
                color="success"
                fullWidth
                size="large"
                component="a"
                href={checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<OpenInNewIcon />}
                sx={{ py: 1.5, fontWeight: 700 }}
              >
                Continuar al Pago Seguro en Wompi
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="primary"
                fullWidth
                component="a"
                href="/billing"
                sx={{ py: 1.5, fontWeight: 700 }}
              >
                Ver Estado en Mis Facturas
              </Button>
            )}
          </Box>
        ) : (
          <Button
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            startIcon={<LockIcon />}
            disabled={isProcessing}
            onClick={handleCheckout}
            sx={{ py: 1.5, fontSize: '1rem', fontWeight: 700 }}
          >
            {isProcessing ? 'Conectando con pasarela Wompi...' : 'Pagar con Wompi (Tarjetas / PSE / Nequi)'}
          </Button>
        )}


        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#6b7280', mt: 2 }}>
          Transacción protegida con cifrado SSL de 256 bits y firma HMAC SHA-256. Ningún dato de tarjeta se almacena en Velupi.
        </Typography>
      </Paper>
    </Box>
  );
}
