'use client';

import * as React from 'react';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import GoogleIcon from '@mui/icons-material/Google';
import GitHubIcon from '@mui/icons-material/GitHub';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { defaultApiClient } from '../../modules/api-client';

export default function LoginPage() {
  return (
    <React.Suspense fallback={<Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>}>
      <LoginContent />
    </React.Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawReturnTo = searchParams.get('returnTo') || '/';
  const returnTo =
    rawReturnTo.startsWith('/') &&
    !rawReturnTo.startsWith('//') &&
    rawReturnTo !== '/login' &&
    rawReturnTo !== '/register' &&
    !rawReturnTo.startsWith('/login?') &&
    !rawReturnTo.startsWith('/register?')
      ? rawReturnTo
      : '/';
  const cartId = searchParams.get('cartId');

  // Steps: 'ENTER_EMAIL' | 'ENTER_CODE'
  const [step, setStep] = React.useState<'ENTER_EMAIL' | 'ENTER_CODE'>('ENTER_EMAIL');
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [oauthLoading, setOauthLoading] = React.useState<'google' | 'github' | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [infoMessage, setInfoMessage] = React.useState<string | null>(null);
  const [cooldown, setCooldown] = React.useState<number>(0);

  // Countdown timer for resend
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Auto-handle OAuth callback tokens and error from query params
  React.useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    const errParam = searchParams.get('error');

    if (errParam) {
      setError(decodeURIComponent(errParam));
    } else if (token) {
      defaultApiClient.setAuthToken(token);
      if (typeof window !== 'undefined') {
        localStorage.setItem('velupi_access_token', token);
        localStorage.setItem('velupi_auth_token', token);
        if (refreshToken) {
          localStorage.setItem('velupi_refresh_token', refreshToken);
        }
        document.cookie = `velupi_session=${token}; path=/; max-age=604800; SameSite=Lax`;
        document.cookie = `velupi_access_token=${token}; path=/; max-age=604800; SameSite=Lax`;

        // If payload has organizationId, save it to velupi_active_org_id
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (payload?.organizationId) {
              localStorage.setItem('velupi_active_org_id', payload.organizationId);
            }
          }
        } catch {
          // ignore
        }

        window.location.href = returnTo;
        return;
      }
      router.push(returnTo);
    }
  }, [searchParams, router, returnTo]);

  // Step 1: Request OTP code (Registers if new, or sends access code if existing)
  const handleRequestCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Por favor ingresa un correo electrónico válido.');
      return;
    }

    setLoading(true);
    try {
      const res = await defaultApiClient.requestAccessCode(cleanEmail);
      setStep('ENTER_CODE');
      setCooldown(res.cooldownSeconds || 60);

      if (res.isNewUser) {
        setInfoMessage(`¡Cuenta creada! Enviamos tu código de activación y bienvenida a ${cleanEmail}.`);
      } else {
        setInfoMessage(`Enviamos un código de acceso de 6 dígitos a ${cleanEmail}.`);
      }
    } catch (err: any) {
      setError(err?.message || 'Error al solicitar el código de acceso.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code and login
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = code.trim();
    if (cleanCode.length !== 6) {
      setError('El código debe tener 6 dígitos.');
      return;
    }

    setLoading(true);
    try {
      const response = await defaultApiClient.verifyAccessCode(email.trim().toLowerCase(), cleanCode);

      if (response?.tokens?.accessToken) {
        defaultApiClient.setAuthToken(response.tokens.accessToken);
        if (typeof window !== 'undefined') {
          localStorage.setItem('velupi_access_token', response.tokens.accessToken);
          localStorage.setItem('velupi_auth_token', response.tokens.accessToken);
          if (response.tokens.refreshToken) {
            localStorage.setItem('velupi_refresh_token', response.tokens.refreshToken);
          }
          if (response?.organization?.id) {
            localStorage.setItem('velupi_active_org_id', response.organization.id);
          }
        }
      }

      // If a cart was in progress, claim it
      if (cartId) {
        try {
          await defaultApiClient.claimCart(cartId, {
            userId: response?.user?.id,
            organizationId: response?.organization?.id,
          });
        } catch {
          // Non-blocking
        }
      }

      // Hard navigation to refresh memory state and render dashboard
      if (typeof window !== 'undefined') {
        window.location.href = returnTo;
      } else {
        router.push(returnTo);
      }
    } catch (err: any) {
      setError(err?.message || 'Código incorrecto o expirado.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    setOauthLoading(provider);
    setError(null);
    try {
      const res = await defaultApiClient.getOAuthStart(provider, returnTo);
      if (res?.authorizationUrl) {
        window.location.href = res.authorizationUrl;
      }
    } catch (err: any) {
      setError(err?.message || `Error al conectar con ${provider}.`);
      setOauthLoading(null);
    }
  };

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', py: 5, px: 2 }}>
      {cartId && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, backgroundColor: '#FFFFFF', px: 2.5, py: 1, borderRadius: 3, border: '1px solid #F2E8DC', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <Chip label="1" size="small" color="success" sx={{ height: 22, fontSize: '0.75rem' }} />
            <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 600 }}>Carrito</Typography>
            <Typography variant="caption" sx={{ color: '#9ca3af' }}>→</Typography>
            <Chip label="2" size="small" color="primary" sx={{ height: 22, fontSize: '0.75rem' }} />
            <Typography variant="caption" sx={{ color: '#2D1B17', fontWeight: 700 }}>Iniciar Sesión</Typography>
            <Typography variant="caption" sx={{ color: '#9ca3af' }}>→</Typography>
            <Chip label="3" size="small" variant="outlined" sx={{ height: 22, fontSize: '0.75rem', color: '#6b7280', borderColor: '#E5E7EB' }} />
            <Typography variant="caption" sx={{ color: '#6b7280' }}>Facturación</Typography>
          </Box>
        </Box>
      )}

      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4 },
          backgroundColor: '#FFFFFF',
          border: '1px solid #F2E8DC',
          borderRadius: 3,
          boxShadow: '0 4px 16px rgba(255, 107, 0, 0.06)',
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#2D1B17', mb: 0.5 }}>
            {step === 'ENTER_EMAIL' ? 'Acceder a Velupi' : 'Ingresa tu Código'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#667085' }}>
            {step === 'ENTER_EMAIL'
              ? 'Inicia sesión o regístrate automáticamente con tu correo.'
              : `Ingresa el código de 6 dígitos que enviamos a ${email}`}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {infoMessage && (
          <Alert severity="info" icon={<CheckCircleOutlineIcon fontSize="inherit" />} sx={{ mb: 3, borderRadius: 2 }}>
            {infoMessage}
          </Alert>
        )}

        {step === 'ENTER_EMAIL' ? (
          <>
            {/* Social Buttons */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={oauthLoading === 'google' ? <CircularProgress size={18} color="inherit" /> : <GoogleIcon />}
                onClick={() => handleOAuth('google')}
                disabled={loading || oauthLoading !== null}
                sx={{
                  py: 1.2,
                  textTransform: 'none',
                  fontWeight: 600,
                  color: '#2D1B17',
                  borderColor: '#E5E7EB',
                  backgroundColor: '#FFFFFF',
                  '&:hover': {
                    borderColor: '#FF6B00',
                    backgroundColor: 'rgba(255, 107, 0, 0.04)',
                  },
                }}
              >
                Continuar con Google
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={oauthLoading === 'github' ? <CircularProgress size={18} color="inherit" /> : <GitHubIcon />}
                onClick={() => handleOAuth('github')}
                disabled={loading || oauthLoading !== null}
                sx={{
                  py: 1.2,
                  textTransform: 'none',
                  fontWeight: 600,
                  color: '#2D1B17',
                  borderColor: '#E5E7EB',
                  backgroundColor: '#FFFFFF',
                  '&:hover': {
                    borderColor: '#FF6B00',
                    backgroundColor: 'rgba(255, 107, 0, 0.04)',
                  },
                }}
              >
                Continuar con GitHub
              </Button>
            </Box>

            <Divider sx={{ my: 3, borderColor: '#F2E8DC' }}>
              <Typography variant="caption" sx={{ color: '#667085', px: 1, fontWeight: 600 }}>
                O CON TU CORREO
              </Typography>
            </Divider>

            {/* Email Form */}
            <Box component="form" onSubmit={handleRequestCode} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                required
                fullWidth
                type="email"
                label="Correo Electrónico"
                placeholder="ejemplo@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoFocus
                InputProps={{
                  startAdornment: <EmailOutlinedIcon sx={{ color: '#6b7280', mr: 1 }} />,
                }}
              />

              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                disabled={loading || !email.trim()}
                endIcon={loading ? <CircularProgress size={18} color="inherit" /> : <ArrowForwardIcon />}
                sx={{
                  py: 1.4,
                  mt: 1,
                  fontWeight: 800,
                  fontSize: '1rem',
                  borderRadius: 2,
                }}
              >
                {loading ? 'Enviando código...' : 'Continuar con Correo'}
              </Button>
            </Box>
          </>
        ) : (
          /* Step 2: Code Verification Form */
          <Box component="form" onSubmit={handleVerifyCode} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
              <MarkEmailReadOutlinedIcon sx={{ fontSize: 48, color: '#FF6B00' }} />
            </Box>

            <TextField
              required
              fullWidth
              label="Código de 6 dígitos"
              placeholder="123456"
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(val);
              }}
              disabled={loading}
              autoFocus
              inputProps={{
                maxLength: 6,
                style: {
                  textAlign: 'center',
                  fontSize: '1.75rem',
                  letterSpacing: '0.35em',
                  fontWeight: 800,
                },
              }}
            />

            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              disabled={loading || code.trim().length !== 6}
              endIcon={loading ? <CircularProgress size={18} color="inherit" /> : <ArrowForwardIcon />}
              sx={{
                py: 1.4,
                fontWeight: 800,
                fontSize: '1rem',
                borderRadius: 2,
              }}
            >
              {loading ? 'Verificando...' : 'Entrar a Velupi'}
            </Button>

            {/* Resend Cooldown Section */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mt: 1 }}>
              <Button
                variant="text"
                size="small"
                onClick={() => handleRequestCode()}
                disabled={cooldown > 0 || loading}
                startIcon={<RefreshIcon />}
                sx={{
                  textTransform: 'none',
                  color: cooldown > 0 ? '#9ca3af' : '#FF6B00',
                  fontWeight: 700,
                }}
              >
                {cooldown > 0
                  ? `Reenviar nuevo código en ${Math.floor(cooldown / 60)}:${(cooldown % 60).toString().padStart(2, '0')}`
                  : 'Reenviar nuevo código'}
              </Button>

              <Button
                variant="text"
                size="small"
                onClick={() => {
                  setStep('ENTER_EMAIL');
                  setCode('');
                  setError(null);
                  setInfoMessage(null);
                }}
                sx={{ textTransform: 'none', color: '#667085', fontSize: '0.8rem' }}
              >
                Cambiar correo electrónico
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
