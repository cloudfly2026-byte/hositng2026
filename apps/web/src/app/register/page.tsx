'use client';

import * as React from 'react';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import GoogleIcon from '@mui/icons-material/Google';
import GitHubIcon from '@mui/icons-material/GitHub';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import BusinessIcon from '@mui/icons-material/Business';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { defaultApiClient } from '../../modules/api-client';

export default function RegisterPage() {
  return (
    <React.Suspense fallback={<Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>}>
      <RegisterContent />
    </React.Suspense>
  );
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawReturnTo = searchParams.get('returnTo') || '/checkout';
  // Sanitize returnTo: ensure it starts with / and not //
  const returnTo = rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : '/checkout';
  const cartId = searchParams.get('cartId');

  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [organizationName, setOrganizationName] = React.useState('');
  const [acceptTerms, setAcceptTerms] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [oauthLoading, setOauthLoading] = React.useState<'google' | 'github' | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!acceptTerms) {
      setError('Debes aceptar los Términos de Servicio y la Política de Privacidad.');
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const response = await defaultApiClient.register({
        email,
        password,
        fullName,
        organizationName: organizationName.trim() || `${fullName.split(' ')[0]}'s Cloud`,
      });

      if (response?.tokens?.accessToken) {
        defaultApiClient.setAuthToken(response.tokens.accessToken);
      }

      // If a cart was selected before register, claim it with the new user & org
      if (cartId) {
        try {
          await defaultApiClient.claimCart(cartId, {
            userId: response?.user?.id,
            organizationId: response?.organization?.id,
          });
        } catch {
          // Non-blocking: continue to returnTo
        }
      }

      router.push(returnTo);
    } catch (err: any) {
      setError(err?.message || 'Error al crear la cuenta. Inténtalo nuevamente.');
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
    <Box sx={{ maxWidth: 520, mx: 'auto', py: 4, px: 2 }}>
      {/* Stepper indicator if coming from cart */}
      {cartId && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, backgroundColor: '#FFFFFF', px: 2.5, py: 1, borderRadius: 3, border: '1px solid #F2E8DC', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <Chip label="1" size="small" color="success" sx={{ height: 22, fontSize: '0.75rem' }} />
            <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 600 }}>Carrito</Typography>
            <Typography variant="caption" sx={{ color: '#9ca3af' }}>→</Typography>
            <Chip label="2" size="small" color="primary" sx={{ height: 22, fontSize: '0.75rem' }} />
            <Typography variant="caption" sx={{ color: '#2D1B17', fontWeight: 700 }}>Crear Cuenta</Typography>
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
            Crea tu Cuenta Velupi
          </Typography>
          <Typography variant="body2" sx={{ color: '#667085' }}>
            Accede al panel de control cloud y activa tu infraestructura en minutos.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

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
            O REGÍSTRATE CON TU EMAIL
          </Typography>
        </Divider>

        {/* Registration Form */}
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            required
            fullWidth
            label="Nombre Completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
            InputProps={{
              startAdornment: <PersonOutlineIcon sx={{ color: '#6b7280', mr: 1 }} />,
            }}
          />

          <TextField
            required
            fullWidth
            type="email"
            label="Correo Electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            InputProps={{
              startAdornment: <EmailOutlinedIcon sx={{ color: '#6b7280', mr: 1 }} />,
            }}
          />

          <TextField
            required
            fullWidth
            type="password"
            label="Contraseña"
            helperText="Mínimo 8 caracteres, incluye mayúsculas y números"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            InputProps={{
              startAdornment: <LockOutlinedIcon sx={{ color: '#6b7280', mr: 1 }} />,
            }}
          />

          <TextField
            fullWidth
            label="Nombre de la Organización / Empresa"
            placeholder="Ej. Mi Empresa Cloud SAS"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            disabled={loading}
            InputProps={{
              startAdornment: <BusinessIcon sx={{ color: '#6b7280', mr: 1 }} />,
            }}
          />

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
                Acepto los Términos de Servicio y la Política de Tratamiento de Datos Personales.
              </Typography>
            }
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            disabled={loading}
            endIcon={loading ? <CircularProgress size={18} color="inherit" /> : <ArrowForwardIcon />}
            sx={{
              py: 1.4,
              mt: 1,
              fontWeight: 800,
              fontSize: '1rem',
              borderRadius: 2,
            }}
          >
            {loading ? 'Creando cuenta...' : 'Crear Cuenta y Continuar'}
          </Button>
        </Box>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#667085' }}>
            ¿Ya tienes una cuenta?{' '}
            <Link
              href={`/login?returnTo=${encodeURIComponent(returnTo)}${cartId ? `&cartId=${encodeURIComponent(cartId)}` : ''}`}
              style={{ color: '#FF6B00', textDecoration: 'none', fontWeight: 700 }}
            >
              Iniciar Sesión
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
