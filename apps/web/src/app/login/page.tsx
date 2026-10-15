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
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
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
  const returnTo = rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : '/';
  const cartId = searchParams.get('cartId');

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [oauthLoading, setOauthLoading] = React.useState<'google' | 'github' | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await defaultApiClient.login({ email, password });

      if (response?.tokens?.accessToken) {
        defaultApiClient.setAuthToken(response.tokens.accessToken);
      }

      // If a cart was in progress, claim it with this authenticated account
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
      setError(err?.message || 'Credenciales inválidas o correo no registrado.');
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, backgroundColor: 'rgba(255,255,255,0.03)', px: 2.5, py: 1, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)' }}>
            <Chip label="1" size="small" color="success" sx={{ height: 22, fontSize: '0.75rem' }} />
            <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 600 }}>Carrito</Typography>
            <Typography variant="caption" sx={{ color: '#6b7280' }}>→</Typography>
            <Chip label="2" size="small" color="primary" sx={{ height: 22, fontSize: '0.75rem' }} />
            <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700 }}>Iniciar Sesión</Typography>
            <Typography variant="caption" sx={{ color: '#6b7280' }}>→</Typography>
            <Chip label="3" size="small" variant="outlined" sx={{ height: 22, fontSize: '0.75rem', color: '#6b7280' }} />
            <Typography variant="caption" sx={{ color: '#6b7280' }}>Facturación</Typography>
          </Box>
        </Box>
      )}

      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4 },
          backgroundColor: '#111827',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 3,
          boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff', mb: 0.5 }}>
            Iniciar Sesión
          </Typography>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>
            Ingresa a tu consola de Velupi Cloud Platform.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
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
              color: '#fff',
              borderColor: 'rgba(255, 255, 255, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              '&:hover': {
                borderColor: '#06b6d4',
                backgroundColor: 'rgba(6, 182, 212, 0.05)',
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
              color: '#fff',
              borderColor: 'rgba(255, 255, 255, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              '&:hover': {
                borderColor: '#06b6d4',
                backgroundColor: 'rgba(6, 182, 212, 0.05)',
              },
            }}
          >
            Continuar con GitHub
          </Button>
        </Box>

        <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <Typography variant="caption" sx={{ color: '#6b7280', px: 1 }}>
            O CON TU CORREO REGISTRADO
          </Typography>
        </Divider>

        {/* Login Form */}
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            InputProps={{
              startAdornment: <LockOutlinedIcon sx={{ color: '#6b7280', mr: 1 }} />,
            }}
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
              fontWeight: 700,
              fontSize: '1rem',
              borderRadius: 2,
              boxShadow: '0 4px 14px rgba(6, 182, 212, 0.4)',
            }}
          >
            {loading ? 'Iniciando sesión...' : 'Entrar a Velupi'}
          </Button>
        </Box>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>
            ¿No tienes cuenta aún?{' '}
            <Link
              href={`/register?returnTo=${encodeURIComponent(returnTo)}${cartId ? `&cartId=${encodeURIComponent(cartId)}` : ''}`}
              style={{ color: '#06b6d4', textDecoration: 'none', fontWeight: 600 }}
            >
              Regístrate aquí
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
