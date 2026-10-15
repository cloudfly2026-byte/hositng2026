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
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #F2E8DC',
        boxShadow: '0 2px 10px rgba(255, 107, 0, 0.05)',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box component={Link} href="/" sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <Box
              component="img"
              src="/velupi-logo.png"
              alt="Velupi Cloud Platform"
              sx={{
                height: 44,
                width: 'auto',
                display: 'block',
              }}
            />
          </Box>

          <Chip
            label="Cloud Platform"
            size="small"
            sx={{
              ml: 1,
              backgroundColor: 'rgba(255, 107, 0, 0.08)',
              color: '#FF6B00',
              border: '1px solid rgba(255, 107, 0, 0.2)',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button component={Link} href="/" sx={{ color: '#2D1B17', fontWeight: 600 }}>
            Dashboard
          </Button>
          <Button component={Link} href="/services/wordpress" sx={{ color: '#2D1B17', fontWeight: 500 }}>
            Site Tools
          </Button>
          <Button component={Link} href="/services/apps" sx={{ color: '#2D1B17', fontWeight: 500 }}>
            Cloud Apps
          </Button>
          <Button component={Link} href="/cart" sx={{ color: '#2D1B17', fontWeight: 500 }}>
            Carrito
          </Button>
          <Button component={Link} href="/login" sx={{ color: '#2D1B17', fontWeight: 500 }}>
            Acceder
          </Button>
          <Button
            component={Link}
            href="/cart"
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #FF9100 0%, #FF6B00 100%)',
              color: '#fff',
              fontWeight: 700,
              '&:hover': {
                background: 'linear-gradient(135deg, #FFB800 0%, #E85A00 100%)',
              },
            }}
          >
            Contratar Plan
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
