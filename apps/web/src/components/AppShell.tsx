'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import { Sidebar, DRAWER_WIDTH } from './Sidebar';
import { Topbar } from './Topbar';
import { Navbar } from './Navbar';

interface AppShellProps {
  children: React.ReactNode;
}

const COMMERCIAL_ROUTES = [
  '/cart',
  '/checkout',
  '/login',
  '/register',
  '/orders',
];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname() || '/';
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const isCommercialPage = COMMERCIAL_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleMobileClose = () => {
    setMobileOpen(false);
  };

  if (isCommercialPage) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#FFF8ED' }}>
        <Navbar />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3, md: 4 },
            maxWidth: 1400,
            width: '100%',
            boxSizing: 'border-box',
            mx: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#FFF8ED' }}>
      {/* Responsive Sidebar (Persistent Desktop + Mobile Drawer) */}
      <Sidebar mobileOpen={mobileOpen} onMobileClose={handleMobileClose} />

      {/* Main Content Area */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          backgroundColor: '#FFF8ED',
        }}
      >
        <Topbar onDrawerToggle={handleDrawerToggle} />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3, md: 4 },
            maxWidth: 1600,
            width: '100%',
            boxSizing: 'border-box',
            mx: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
