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
        <CircularProgress size={36} sx={{ color: '#FF6B00' }} />
        <Typography variant="body2" sx={{ color: '#667085', fontWeight: 500 }}>
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
            backgroundColor: '#FEE2E2',
            borderColor: '#FCA5A5',
            color: '#991B1B',
            borderRadius: 2,
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
          border: '1px dashed #F2E8DC',
          borderRadius: 3,
          backgroundColor: '#FFFFFF',
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 3,
            backgroundColor: '#FFF4E5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FF6B00',
            mb: 2,
          }}
        >
          <InboxRoundedIcon sx={{ fontSize: 30 }} />
        </Box>
        <Typography variant="h6" sx={{ color: '#2D1B17', fontWeight: 700, mb: 1, fontSize: '1.05rem' }}>
          {emptyTitle}
        </Typography>
        <Typography variant="body2" sx={{ color: '#667085', maxWidth: 440, mb: 3 }}>
          {emptyMessage}
        </Typography>
        {emptyActionLabel && onEmptyAction && (
          <Button
            variant="contained"
            onClick={onEmptyAction}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              px: 3,
              backgroundColor: '#FF6B00',
              '&:hover': { backgroundColor: '#E85A00' },
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
