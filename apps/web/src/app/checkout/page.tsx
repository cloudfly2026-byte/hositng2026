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
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import LockIcon from '@mui/icons-material/Lock';
import SecurityIcon from '@mui/icons-material/Security';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import PaymentIcon from '@mui/icons-material/Payment';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useRouter, useSearchParams } from 'next/navigation';
import { defaultApiClient } from '../../modules/api-client';

export default function CheckoutPage() {
  return (
    <React.Suspense fallback={<Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>}>
      <CheckoutContent />
    </React.Suspense>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const cartId = searchParams.get('cartId');
  const planQuery = searchParams.get('plan') || 'wp-starter';
  const cycleQuery = searchParams.get('cycle')?.toUpperCase() === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';

  const [cart, setCart] = React.useState<any | null>(null);
  const [loadingCart, setLoadingCart] = React.useState(true);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [orderCreated, setOrderCreated] = React.useState<any | null>(null);
  const [checkoutUrl, setCheckoutUrl] = React.useState<string | null>(null);

  // Fiscal Form State
  const [personType, setPersonType] = React.useState<'NATURAL' | 'JURIDICA'>('NATURAL');
  const [legalName, setLegalName] = React.useState('');
  const [taxIdType, setTaxIdType] = React.useState('CC');
  const [taxIdNumber, setTaxIdNumber] = React.useState('');
  const [billingEmail, setBillingEmail] = React.useState('');
  const [billingPhone, setBillingPhone] = React.useState('');
  const [billingAddress, setBillingAddress] = React.useState('');
  const [billingCity, setBillingCity] = React.useState('Bogotá, D.C.');
  const [acceptTerms, setAcceptTerms] = React.useState(false);

  // Check auth and load cart
  React.useEffect(() => {
    const token = defaultApiClient.getAuthToken();
    if (!token) {
      const returnUrl = cartId
        ? `/checkout?cartId=${encodeURIComponent(cartId)}&plan=${planQuery}&cycle=${cycleQuery}`
        : `/checkout?plan=${planQuery}&cycle=${cycleQuery}`;
      router.push(`/login?returnTo=${encodeURIComponent(returnUrl)}${cartId ? `&cartId=${encodeURIComponent(cartId)}` : ''}`);
      return;
    }

    async function loadCartData() {
      setLoadingCart(true);
      try {
        if (cartId) {
          const cartData = await defaultApiClient.getCart(cartId);
          setCart(cartData);
        } else {
          // If no cartId, create a draft for the queried plan
          const newCart = await defaultApiClient.createCart({
            planCode: planQuery,
            billingCycle: cycleQuery,
            currency: 'COP',
          });
          setCart(newCart);
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Error al recuperar cotización oficial del carrito.');
      } finally {
        setLoadingCart(false);
      }
    }

    loadCartData();
  }, [cartId, planQuery, cycleQuery]);

  // Pricing values from server cart draft or safe fallback
  const planName = cart?.items?.[0]?.planVersion?.name || (planQuery === 'cloud-apps-pro' ? 'Velupi Cloud Apps (Node/Python)' : planQuery === 'vps-dedicated' ? 'Velupi VPS Dedicado 4 MP' : 'Velupi WordPress Starter');
  const billingCycle = cart?.items?.[0]?.billingCycle || cycleQuery;
  const subtotalCop = cart ? Math.round(cart.subtotalCents / 100) : (planQuery === 'cloud-apps-pro' ? 55000 : planQuery === 'vps-dedicated' ? 140000 : 35000) * (billingCycle === 'ANNUAL' ? 10 : 1);
  const taxCop = cart ? Math.round(cart.taxCents / 100) : Math.round(subtotalCop * 0.19);
  const totalCop = cart ? Math.round(cart.totalCents / 100) : subtotalCop + taxCop;

  const handlePayWithWompi = async () => {
    setErrorMessage(null);

    if (!acceptTerms) {
      setErrorMessage('Debes aceptar las condiciones de contratación y la política de renovación.');
      return;
    }

    if (!legalName || !taxIdNumber || !billingEmail) {
      setErrorMessage('Por favor completa todos los datos fiscales obligatorios para la factura.');
      return;
    }

    setIsProcessing(true);
    try {
      const planVersionMap: Record<string, string> = {
        'wp-starter': 'ver-wp-starter-v1',
        'cloud-apps-pro': 'ver-node-starter-v1',
        'vps-dedicated': 'ver-vps-pro-v1',
      };

      const planCode = cart?.items?.[0]?.planCode || planQuery;
      const planVersionId = cart?.items?.[0]?.planVersionId || planVersionMap[planCode] || 'ver-wp-starter-v1';
      const idempotencyKey = `idem-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      const redirectUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/checkout/return`
          : 'https://app.velupi.com/checkout/return';

      const result = await defaultApiClient.createCheckoutOrder({
        organizationId: 'org-velupi-internal',
        currency: 'COP',
        billingCycle,
        items: [{ planVersionId, quantity: 1 }],
        idempotencyKey,
        customerEmail: billingEmail,
        redirectUrl,
      });

      if (result?.order) {
        setOrderCreated(result.order);
      }

      if (result?.session?.checkoutUrl) {
        setCheckoutUrl(result.session.checkoutUrl);
        // Redirect to Wompi hosted secure checkout
        window.location.href = result.session.checkoutUrl;
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al iniciar la pasarela de pagos con Wompi.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1150, mx: 'auto', py: 3, px: 2 }}>
      {/* Stepper Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, backgroundColor: 'rgba(255,255,255,0.03)', px: 3, py: 1.2, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)' }}>
          <Chip label="1" size="small" color="success" sx={{ height: 22, fontSize: '0.75rem' }} />
          <Typography variant="body2" sx={{ color: '#10b981', fontWeight: 600 }}>Carrito</Typography>
          <Typography variant="body2" sx={{ color: '#6b7280', mx: 0.5 }}>→</Typography>
          <Chip label="2" size="small" color="success" sx={{ height: 22, fontSize: '0.75rem' }} />
          <Typography variant="body2" sx={{ color: '#10b981', fontWeight: 600 }}>Cuenta</Typography>
          <Typography variant="body2" sx={{ color: '#6b7280', mx: 0.5 }}>→</Typography>
          <Chip label="3" size="small" color="primary" sx={{ height: 22, fontSize: '0.75rem' }} />
          <Typography variant="body2" sx={{ color: '#fff', fontWeight: 700 }}>Facturación y Pago</Typography>
        </Box>
      </Box>

      {/* Main Grid */}
      <Grid container spacing={4}>
        {/* Left Column: Fiscal Data & Payment Method */}
        <Grid item xs={12} md={7}>
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 3, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              {errorMessage}
            </Alert>
          )}

          {/* Fiscal Details Card */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              backgroundColor: '#FFFFFF',
              border: '1px solid #F2E8DC',
              borderRadius: 3,
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              mb: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <ReceiptLongIcon sx={{ color: '#FF6B00' }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#2D1B17' }}>
                Datos de Facturación Fiscal
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#667085', mb: 3 }}>
              Información requerida para emitir tu comprobante y habilitar tu suscripción cloud.
            </Typography>

            <Box sx={{ mb: 2 }}>
              <RadioGroup
                row
                value={personType}
                onChange={(e) => setPersonType(e.target.value as any)}
              >
                <FormControlLabel
                  value="NATURAL"
                  control={<Radio color="primary" />}
                  label={<Typography variant="body2" sx={{ color: '#2D1B17', fontWeight: 600 }}>Persona Natural</Typography>}
                />
                <FormControlLabel
                  value="JURIDICA"
                  control={<Radio color="primary" />}
                  label={<Typography variant="body2" sx={{ color: '#2D1B17', fontWeight: 600 }}>Persona Jurídica / Empresa</Typography>}
                />
              </RadioGroup>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  size="small"
                  label={personType === 'JURIDICA' ? 'Razón Social' : 'Nombre Completo'}
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder={personType === 'JURIDICA' ? 'Ej. Mi Empresa SAS' : 'Ej. Juan Pérez'}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Tipo Doc."
                  value={taxIdType}
                  onChange={(e) => setTaxIdType(e.target.value)}
                >
                  <MenuItem value="CC">Cédula (CC)</MenuItem>
                  <MenuItem value="NIT">NIT Empresa</MenuItem>
                  <MenuItem value="CE">Cédula Extranjería</MenuItem>
                  <MenuItem value="PP">Pasaporte</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={8}>
                <TextField
                  required
                  fullWidth
                  size="small"
                  label="Número de Identificación Fiscal"
                  value={taxIdNumber}
                  onChange={(e) => setTaxIdNumber(e.target.value)}
                  placeholder="Ej. 901.234.567-8"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  size="small"
                  type="email"
                  label="Correo para Facturación"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  placeholder="facturacion@miempresa.com"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Teléfono / Móvil"
                  value={billingPhone}
                  onChange={(e) => setBillingPhone(e.target.value)}
                  placeholder="+57 300 123 4567"
                />
              </Grid>

              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  size="small"
                  label="Dirección"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="Calle 100 # 15-20, Of. 402"
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Ciudad / País"
                  value={billingCity}
                  onChange={(e) => setBillingCity(e.target.value)}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Payment Provider Card */}
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
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <PaymentIcon sx={{ color: '#FF6B00' }} />
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#2D1B17' }}>
                  Método de Pago Seguro
                </Typography>
              </Box>
              <Chip label="WOMPI SANDBOX / PROD" size="small" color="primary" sx={{ fontSize: '0.65rem', fontWeight: 700 }} />
            </Box>

            <Typography variant="body2" sx={{ color: '#667085', mb: 2 }}>
              Tus transacciones están 100% cifradas y protegidas. Velupi no almacena números de tarjeta ni códigos CVV.
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, p: 2, backgroundColor: '#FAF6F0', borderRadius: 2, border: '1px solid #F2E8DC', mb: 3 }}>
              <Chip icon={<CreditCardIcon />} label="Tarjetas de Crédito / Débito (Visa, Mastercard)" size="small" variant="outlined" sx={{ color: '#2D1B17', borderColor: '#E5E7EB' }} />
              <Chip icon={<AccountBalanceIcon />} label="PSE (Todos los Bancos)" size="small" variant="outlined" sx={{ color: '#2D1B17', borderColor: '#E5E7EB' }} />
              <Chip label="Nequi & Bancolombia" size="small" variant="outlined" sx={{ color: '#2D1B17', borderColor: '#E5E7EB' }} />
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Typography variant="caption" sx={{ color: '#667085' }}>
                  Acepto los Términos de Servicio, la activación del servicio cloud y la política de renovación automática de Velupi.
                </Typography>
              }
            />

            <Button
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              disabled={isProcessing}
              onClick={handlePayWithWompi}
              startIcon={isProcessing ? <CircularProgress size={18} color="inherit" /> : <LockIcon />}
              endIcon={<OpenInNewIcon />}
              sx={{
                mt: 2.5,
                py: 1.5,
                fontWeight: 800,
                fontSize: '1.05rem',
                borderRadius: 2,
              }}
            >
              {isProcessing ? 'Conectando con Wompi...' : `Pagar $${totalCop.toLocaleString('es-CO')} COP con Wompi`}
            </Button>
          </Paper>
        </Grid>

        {/* Right Column: Order Summary */}
        <Grid item xs={12} md={5}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              backgroundColor: '#FFFFFF',
              border: '1px solid #F2E8DC',
              borderRadius: 3,
              boxShadow: '0 4px 16px rgba(255, 107, 0, 0.06)',
              position: 'sticky',
              top: 24,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#2D1B17', mb: 2 }}>
              Resumen de la Orden
            </Typography>

            {loadingCart ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <CircularProgress size={28} />
                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#667085' }}>
                  Calculando cotización oficial...
                </Typography>
              </Box>
            ) : (
              <Box>
                <Box sx={{ mb: 2.5, p: 2, backgroundColor: '#FAF6F0', borderRadius: 2, border: '1px solid #F2E8DC' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#FF6B00' }}>
                    {planName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#667085', fontWeight: 600 }}>
                    Período: {billingCycle === 'ANNUAL' ? 'Facturación Anual (12 Meses con 2 meses gratis)' : 'Facturación Mensual'}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="body2" sx={{ color: '#667085' }}>Subtotal</Typography>
                  <Typography variant="body2" sx={{ color: '#2D1B17', fontWeight: 700 }}>
                    ${subtotalCop.toLocaleString('es-CO')} COP
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="body2" sx={{ color: '#667085' }}>IVA (19% Colombia)</Typography>
                  <Typography variant="body2" sx={{ color: '#2D1B17', fontWeight: 700 }}>
                    ${taxCop.toLocaleString('es-CO')} COP
                  </Typography>
                </Box>

                <Divider sx={{ my: 2, borderColor: '#F2E8DC' }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: '#2D1B17', fontWeight: 800 }}>Total a Pagar</Typography>
                  <Typography variant="h5" sx={{ color: '#FF6B00', fontWeight: 900 }}>
                    ${totalCop.toLocaleString('es-CO')} <Typography component="span" variant="caption" sx={{ color: '#667085' }}>COP</Typography>
                  </Typography>
                </Box>

                <Box sx={{ p: 1.5, backgroundColor: '#FFF8ED', borderRadius: 2, border: '1px solid #F2E8DC', mb: 2 }}>
                  <Typography variant="caption" sx={{ color: '#667085', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ShieldOutlinedIcon sx={{ fontSize: '1rem', color: '#FF6B00' }} />
                    Cotización inmutable validada por el Control Plane de Velupi.
                  </Typography>
                </Box>

                <Box sx={{ textAlign: 'center' }}>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => router.push(`/cart${cartId ? `?cartId=${encodeURIComponent(cartId)}` : ''}`)}
                    sx={{ color: '#FF6B00', textTransform: 'none', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    ← Modificar plan o período en el carrito
                  </Button>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
