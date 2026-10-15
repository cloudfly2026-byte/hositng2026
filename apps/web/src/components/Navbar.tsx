'use client';

import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import Link from 'next/link';

export function Navbar() {
  return (
    <AppBar
      position="sticky"
      sx={{
        backgroundColor: 'rgba(17, 24, 39, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: 'none',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)',
              color: '#fff',
            }}
          >
            <CloudQueueIcon fontSize="medium" />
          </Box>
          <Box>
            <Typography
              variant="h6"
              component={Link}
              href="/"
              sx={{
                fontWeight: 800,
                color: '#fff',
                textDecoration: 'none',
                letterSpacing: '-0.02em',
              }}
            >
              Velupi{' '}
              <Box component="span" sx={{ color: '#06b6d4', fontWeight: 500, fontSize: '0.9rem' }}>
                Cloud
              </Box>
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: '#9ca3af', mt: -0.5 }}>
              Tus ideas merecen volar
            </Typography>
          </Box>

          <Chip
            label="org-velupi-internal"
            size="small"
            sx={{
              ml: 2,
              backgroundColor: 'rgba(6, 182, 212, 0.12)',
              color: '#67e8f9',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button component={Link} href="/" color="inherit" sx={{ color: '#d1d5db' }}>
            Dashboard
          </Button>
          <Button component={Link} href="/services/wordpress" color="inherit" sx={{ color: '#d1d5db' }}>
            Site Tools (WordPress)
          </Button>
          <Button component={Link} href="/services/apps" color="inherit" sx={{ color: '#d1d5db' }}>
            Cloud Apps (Docker)
          </Button>
          <Button component={Link} href="/cart" color="inherit" sx={{ color: '#d1d5db' }}>
            Carrito
          </Button>
          <Button component={Link} href="/login" color="inherit" sx={{ color: '#d1d5db' }}>
            Acceder
          </Button>
          <Button component={Link} href="/cart" variant="contained" color="primary">
            Contratar Plan
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
