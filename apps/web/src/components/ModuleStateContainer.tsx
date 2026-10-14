'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import InboxRoundedIcon from '@mui/icons-material/InboxRounded';

export type StateType = 'loading' | 'empty' | 'error' | 'success';

interface ModuleStateContainerProps {
  state: StateType;
  children: React.ReactNode;
  loadingMessage?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  errorMessage?: string;
  onRetry?: () => void;
}

export function ModuleStateContainer({
  state,
  children,
  loadingMessage = 'Cargando recursos del módulo...',
  emptyTitle = 'No hay recursos creados',
  emptyMessage = 'Todavía no has creado ningún recurso en este módulo.',
  emptyActionLabel,
  onEmptyAction,
  errorMessage = 'Ha ocurrido un error al conectar con los servicios.',
  onRetry,
}: ModuleStateContainerProps) {
  if (state === 'loading') {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 12,
          gap: 2,
        }}
      >
        <CircularProgress size={36} sx={{ color: '#06b6d4' }} />
        <Typography variant="body2" sx={{ color: '#9ca3af', fontWeight: 500 }}>
          {loadingMessage}
        </Typography>
      </Box>
    );
  }

  if (state === 'error') {
    return (
      <Box sx={{ py: 4 }}>
        <Alert
          severity="error"
          variant="outlined"
          sx={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
          }}
          action={
            onRetry && (
              <Button
                color="inherit"
                size="small"
                onClick={onRetry}
                startIcon={<RefreshRoundedIcon />}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Reintentar
              </Button>
            )
          }
        >
          <AlertTitle sx={{ fontWeight: 700 }}>Error al cargar módulo</AlertTitle>
          {errorMessage}
        </Alert>
      </Box>
    );
  }

  if (state === 'empty') {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 10,
          px: 3,
          textAlign: 'center',
          border: '1px dashed rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          backgroundColor: 'rgba(255, 255, 255, 0.01)',
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '16px',
            backgroundColor: 'rgba(6, 182, 212, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#06b6d4',
            mb: 2,
          }}
        >
          <InboxRoundedIcon sx={{ fontSize: 30 }} />
        </Box>
        <Typography variant="h6" sx={{ color: '#f3f4f6', fontWeight: 700, mb: 1, fontSize: '1.05rem' }}>
          {emptyTitle}
        </Typography>
        <Typography variant="body2" sx={{ color: '#9ca3af', maxWidth: 440, mb: 3 }}>
          {emptyMessage}
        </Typography>
        {emptyActionLabel && onEmptyAction && (
          <Button
            variant="contained"
            color="primary"
            onClick={onEmptyAction}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '8px',
              px: 3,
              boxShadow: '0 4px 14px rgba(6, 182, 212, 0.25)',
            }}
          >
            {emptyActionLabel}
          </Button>
        )}
      </Box>
    );
  }

  return <>{children}</>;
}
