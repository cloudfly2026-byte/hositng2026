'use client';

import * as React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

export const VELUPI_TOKENS = {
  primary: '#FF6B00',
  primaryHover: '#E85A00',
  orangeLight: '#FF9100',
  yellow: '#FFB800',
  yellowLight: '#FFD54A',
  cream: '#FFF8ED',
  white: '#FFFFFF',
  text: '#2D1B17',
  textSecondary: '#667085',
  border: '#F2E8DC',
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  gradient: 'linear-gradient(135deg, #FFD54A 0%, #FFB800 35%, #FF9100 70%, #FF6B00 100%)',
};

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#FF6B00', // Velupi Primary Solar Orange
      light: '#FF9100',
      dark: '#E85A00',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FFB800', // Velupi Sun Yellow
      light: '#FFD54A',
      dark: '#D97706',
      contrastText: '#2D1B17',
    },
    background: {
      default: '#FFF8ED', // Velupi Cream
      paper: '#FFFFFF',   // Velupi Pure White
    },
    success: {
      main: '#16A34A',
    },
    warning: {
      main: '#D97706',
    },
    error: {
      main: '#DC2626',
    },
    text: {
      primary: '#2D1B17', // Velupi Deep Warm Charcoal
      secondary: '#667085',
    },
    divider: '#F2E8DC',
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
      color: '#2D1B17',
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
      color: '#2D1B17',
    },
    h6: {
      fontWeight: 600,
      color: '#2D1B17',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#FFFFFF',
          border: '1px solid #F2E8DC',
          boxShadow: '0 2px 8px rgba(255, 107, 0, 0.04)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '8px 18px',
          boxShadow: 'none',
          fontWeight: 600,
          '&:hover': {
            boxShadow: '0 4px 14px rgba(255, 107, 0, 0.25)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #FF9100 0%, #FF6B00 100%)',
          color: '#FFFFFF',
          '&:hover': {
            background: 'linear-gradient(135deg, #FFB800 0%, #E85A00 100%)',
          },
        },
      },
    },
  },
});

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
