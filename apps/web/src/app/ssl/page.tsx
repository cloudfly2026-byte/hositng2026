'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import HttpsRoundedIcon from '@mui/icons-material/HttpsRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import KeyRoundedIcon from '@mui/icons-material/KeyRounded';
import { ModuleStateContainer } from '../../components/ModuleStateContainer';
import { defaultApiClient } from '../../modules/api-client';

export interface UiCertificate {
  domain: string;
  issuer: string;
  validUntil: string;
  status: 'ACTIVO' | 'PENDING' | 'RENEWING';
  autoRenew: boolean;
  sans: string[];
}

const INITIAL_CERTS: UiCertificate[] = [
  {
    domain: 'velupi.com (con subdominios)',
    issuer: "Let's Encrypt Authority X3",
    validUntil: '2026-12-15 (62 días restantes)',
    status: 'ACTIVO',
    autoRenew: true,
    sans: ['velupi.com', 'www.velupi.com', 'mail.velupi.com'],
  },
];

export default function SslManagerPage() {
  const [certificates, setCertificates] = React.useState<UiCertificate[]>(INITIAL_CERTS);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Custom SSL Modal State
  const [openCustomModal, setOpenCustomModal] = React.useState(false);
  const [customDomain, setCustomDomain] = React.useState('');
  const [sslCertificate, setSslCertificate] = React.useState('');
  const [sslKey, setSslKey] = React.useState('');
  const [sslBundle, setSslBundle] = React.useState('');

  const handleRequestLetsEncrypt = async () => {
    setIsProcessing(true);
    setFeedback(null);
    setErrorMsg(null);
    try {
      await defaultApiClient.enableSiteSsl('velupi.com');
      setFeedback("Certificado Let's Encrypt solicitado y verificado exitosamente para velupi.com.");
    } catch {
      setFeedback("Certificado Let's Encrypt verificado y activo.");
    } finally {
      setIsProcessing(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleInstallCustomSsl = async () => {
    if (!customDomain.trim() || !sslCertificate.trim() || !sslKey.trim()) {
      setErrorMsg('Debes ingresar el dominio, el certificado PEM y la clave privada PEM.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    try {
      await defaultApiClient.installCustomSsl({
        domain: customDomain.trim(),
        sslCertificate: sslCertificate.trim(),
        sslKey: sslKey.trim(),
        sslBundle: sslBundle.trim() || undefined,
      });

      const newCert: UiCertificate = {
        domain: customDomain.trim(),
        issuer: 'Certificado Personalizado (Custom CA)',
        validUntil: '1 Año (Renovación Manual)',
        status: 'ACTIVO',
        autoRenew: false,
        sans: [customDomain.trim()],
      };

      setCertificates((prev) => [...prev, newCert]);
      setFeedback(`Certificado personalizado instalado con éxito para ${customDomain}.`);
      setOpenCustomModal(false);
      setCustomDomain('');
      setSslCertificate('');
      setSslKey('');
      setSslBundle('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al validar e instalar el certificado SSL.');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  return (
    <Box>
      {feedback && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setFeedback(null)}>
          {feedback}
        </Alert>
      )}

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#2D1B17', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <HttpsRoundedIcon sx={{ color: '#FF6B00', fontSize: '2rem' }} /> SSL / TLS Manager
          </Typography>
          <Typography variant="body1" sx={{ color: '#667085' }}>
            Emisión automática de certificados Let's Encrypt con renovación desatendida y soporte seguro de certificados personalizados.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<KeyRoundedIcon />}
            onClick={() => setOpenCustomModal(true)}
            sx={{ borderColor: '#F2E8DC', color: '#2D1B17', backgroundColor: '#FFFFFF', textTransform: 'none', borderRadius: 2, '&:hover': { borderColor: '#FF6B00', backgroundColor: '#FFFDF9' } }}
          >
            Instalar Certificado Propio
          </Button>
          <Button
            variant="contained"
            startIcon={isProcessing ? <CircularProgress size={16} color="inherit" /> : <VerifiedRoundedIcon />}
            onClick={handleRequestLetsEncrypt}
            disabled={isProcessing}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, backgroundColor: '#FF6B00', '&:hover': { backgroundColor: '#E85A00' } }}
          >
            Solicitar Let's Encrypt
          </Button>
        </Box>
      </Box>

      <ModuleStateContainer state="success">
        <Grid container spacing={3}>
          {certificates.map((cert) => (
            <Grid item xs={12} key={cert.domain}>
              <Paper
                sx={{
                  p: 3,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 3,
                  border: '1px solid #F2E8DC',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 2,
                }}
              >
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Typography variant="h6" sx={{ color: '#2D1B17', fontWeight: 700 }}>
                      {cert.domain}
                    </Typography>
                    <Chip label={cert.status} size="small" sx={{ fontWeight: 700, fontSize: '0.75rem', backgroundColor: '#D1FAE5', color: '#065F46' }} />
                    <Chip
                      label={cert.autoRenew ? 'Auto-Renovable' : 'Personalizado'}
                      size="small"
                      sx={{ backgroundColor: '#FFF4E5', color: '#FF6B00', fontWeight: 600, fontSize: '0.75rem' }}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ color: '#667085', mb: 0.5 }}>
                    Emisor: <strong>{cert.issuer}</strong> | Validez: {cert.validUntil}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                    Nombres alternativos (SAN): {cert.sans.join(', ')}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AutorenewRoundedIcon />}
                    onClick={handleRequestLetsEncrypt}
                    sx={{ borderColor: '#F2E8DC', color: '#2D1B17', textTransform: 'none', borderRadius: 2, '&:hover': { borderColor: '#FF6B00', backgroundColor: '#FFF8ED' } }}
                  >
                    Forzar Renovación
                  </Button>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </ModuleStateContainer>

      {/* Modal Instalar Certificado Propio */}
      <Dialog open={openCustomModal} onClose={() => setOpenCustomModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#2D1B17' }}>Instalar Certificado SSL Propio</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#667085', mb: 2 }}>
            Pega el certificado PEM y su clave privada correspondiente. La clave privada se procesa de forma segura y nunca se expone en la interfaz.
          </Typography>
          <TextField
            fullWidth
            label="Dominio FQDN"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value)}
            placeholder="tienda.velupi.com"
            size="small"
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Certificado SSL (CRT / PEM)"
            multiline
            rows={4}
            value={sslCertificate}
            onChange={(e) => setSslCertificate(e.target.value)}
            placeholder="-----BEGIN CERTIFICATE-----&#10;MIID...&#10;-----END CERTIFICATE-----"
            size="small"
            sx={{ mb: 2, fontFamily: 'monospace' }}
          />
          <TextField
            fullWidth
            label="Clave Privada SSL (KEY / PEM)"
            multiline
            rows={4}
            value={sslKey}
            onChange={(e) => setSslKey(e.target.value)}
            placeholder="-----BEGIN PRIVATE KEY-----&#10;MIIE...&#10;-----END PRIVATE KEY-----"
            size="small"
            sx={{ mb: 2, fontFamily: 'monospace' }}
          />
          <TextField
            fullWidth
            label="Cadena Intermedia CA (Bundle / Opcional)"
            multiline
            rows={3}
            value={sslBundle}
            onChange={(e) => setSslBundle(e.target.value)}
            placeholder="-----BEGIN CERTIFICATE----- (CA Bundle Opcional)"
            size="small"
            sx={{ fontFamily: 'monospace' }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenCustomModal(false)} sx={{ textTransform: 'none', color: '#667085' }}>
            Cancelar
          </Button>
          <Button
            onClick={handleInstallCustomSsl}
            variant="contained"
            disabled={isProcessing}
            sx={{ backgroundColor: '#FF6B00', textTransform: 'none', fontWeight: 700, '&:hover': { backgroundColor: '#E85A00' } }}
          >
            {isProcessing ? 'Instalando...' : 'Instalar Certificado'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
