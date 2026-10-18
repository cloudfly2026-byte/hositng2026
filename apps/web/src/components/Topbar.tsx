'use client';

import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';

// Icons
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ArrowDropDownRoundedIcon from '@mui/icons-material/ArrowDropDownRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';

import { useRouter } from 'next/navigation';
import { EffectiveCapabilities } from '@cloudfly/contracts';
import { Breadcrumbs } from './Breadcrumbs';
import { DRAWER_WIDTH } from './Sidebar';
import { defaultApiClient } from '../modules/api-client';
import { useOptionalCapabilities } from '../modules/capabilities-context';

interface TopbarProps {
  onDrawerToggle: () => void;
  capabilities?: EffectiveCapabilities | null;
  activeOrgId?: string;
  onSelectOrg?: (orgId: string) => void;
}

export function Topbar({
  onDrawerToggle,
  capabilities: propCapabilities,
  activeOrgId: propActiveOrgId,
  onSelectOrg: propOnSelectOrg,
}: TopbarProps) {
  const router = useRouter();
  const optionalContext = useOptionalCapabilities();
  const capabilities = propCapabilities !== undefined ? propCapabilities : (optionalContext?.capabilities ?? null);
  const activeOrgId = propActiveOrgId ?? optionalContext?.activeOrgId ?? capabilities?.organization?.id ?? 'org-velupi-internal';
  const onSelectOrg = propOnSelectOrg ?? optionalContext?.setActiveOrgId;

  const [orgMenuAnchor, setOrgMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [userMenuAnchor, setUserMenuAnchor] = React.useState<null | HTMLElement>(null);

  const handleOpenOrgMenu = (event: React.MouseEvent<HTMLElement>) => {
    setOrgMenuAnchor(event.currentTarget);
  };

  const handleCloseOrgMenu = () => {
    setOrgMenuAnchor(null);
  };

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = async () => {
    handleCloseUserMenu();
    try {
      await defaultApiClient.logout();
    } catch {
      // Ignored
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    } else {
      router.push('/login');
    }
  };

  const currentOrgName =
    capabilities?.organization?.name ||
    activeOrgId ||
    'org-velupi-internal';

  const currentRole = capabilities?.role || 'OWNER';

  return (
    <AppBar
      position="sticky"
      sx={{
        width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        ml: { md: `${DRAWER_WIDTH}px` },
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #F2E8DC',
        boxShadow: '0 2px 8px rgba(255, 107, 0, 0.04)',
        color: '#2D1B17',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 3 }, minHeight: 64 }}>
        {/* Left: Mobile Toggle & Breadcrumbs */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton
            color="inherit"
            aria-label="Abrir navegación"
            edge="start"
            onClick={onDrawerToggle}
            sx={{ display: { md: 'none' }, color: '#2D1B17' }}
          >
            <MenuRoundedIcon />
          </IconButton>

          <Breadcrumbs />
        </Box>

        {/* Right: Organization, Hermes AI, Notifications, User Account */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
          {/* Hermes AI Read-Only Badge */}
          <Tooltip title="Asistente DevOps Hermes AI activo en modo solo lectura con auditoría de seguridad">
            <Chip
              icon={<AutoAwesomeRoundedIcon sx={{ fontSize: '14px !important', color: '#a78bfa !important' }} />}
              label="Hermes AI"
              size="small"
              sx={{
                display: { xs: 'none', sm: 'flex' },
                backgroundColor: 'rgba(139, 92, 246, 0.12)',
                color: '#c4b5fd',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                fontWeight: 600,
                fontSize: '0.72rem',
                height: 24,
              }}
            />
          </Tooltip>

          {/* Organization Switcher Dropdown */}
          <Button
            onClick={handleOpenOrgMenu}
            size="small"
            variant="outlined"
            endIcon={<ArrowDropDownRoundedIcon sx={{ color: '#667085' }} />}
            startIcon={<BusinessRoundedIcon sx={{ fontSize: '16px !important', color: '#FF6B00' }} />}
            sx={{
              display: { xs: 'none', sm: 'flex' },
              borderColor: '#F2E8DC',
              color: '#2D1B17',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.78rem',
              py: 0.4,
              px: 1.2,
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              '&:hover': {
                borderColor: '#FF6B00',
                backgroundColor: 'rgba(255, 107, 0, 0.04)',
              },
            }}
          >
            {currentOrgName}
          </Button>

          <Menu
            anchorEl={orgMenuAnchor}
            open={Boolean(orgMenuAnchor)}
            onClose={handleCloseOrgMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              sx: {
                backgroundColor: '#FFFFFF',
                border: '1px solid #F2E8DC',
                color: '#2D1B17',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                minWidth: 200,
                borderRadius: 2,
              },
            }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" sx={{ color: '#667085', fontWeight: 700 }}>
                ORGANIZACIÓN ACTIVA
              </Typography>
            </Box>
            <MenuItem onClick={handleCloseOrgMenu} selected sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#2D1B17' }}>
                {currentOrgName}
              </Typography>
              <Chip label={currentRole} size="small" color="primary" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
            </MenuItem>
          </Menu>

          {/* Notifications Bell */}
          <Tooltip title="Notificaciones del sistema y auditoría">
            <IconButton size="small" sx={{ color: '#9ca3af', '&:hover': { color: '#f3f4f6' } }}>
              <Badge badgeContent={2} color="info" sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem', height: 16, minWidth: 16 } }}>
                <NotificationsNoneRoundedIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* User Account Avatar & Menu */}
          <Box
            onClick={handleOpenUserMenu}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              py: 0.5,
              px: 1,
              borderRadius: '8px',
              transition: 'background-color 0.15s ease',
              '&:hover': {
                backgroundColor: 'rgba(255, 107, 0, 0.05)',
              },
            }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                fontSize: '0.85rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #FF6B00 0%, #FFB800 100%)',
                color: '#FFFFFF',
              }}
            >
              E
            </Avatar>
            <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#2D1B17', fontSize: '0.82rem', lineHeight: 1.1 }}>
                Edwin
              </Typography>
              <Typography variant="caption" sx={{ color: '#FF6B00', fontWeight: 800, fontSize: '0.68rem' }}>
                {currentRole}
              </Typography>
            </Box>
          </Box>

          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={handleCloseUserMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              sx: {
                backgroundColor: '#FFFFFF',
                border: '1px solid #F2E8DC',
                color: '#2D1B17',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                minWidth: 180,
                borderRadius: 2,
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #F2E8DC' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#2D1B17' }}>
                Edwin
              </Typography>
              <Typography variant="caption" sx={{ color: '#667085' }}>
                admin@velupi.com
              </Typography>
            </Box>
            <MenuItem onClick={handleCloseUserMenu} sx={{ py: 1, gap: 1.5, fontSize: '0.85rem', color: '#2D1B17' }}>
              <PersonOutlineRoundedIcon fontSize="small" sx={{ color: '#667085' }} />
              Mi Perfil
            </MenuItem>
            <MenuItem onClick={handleCloseUserMenu} sx={{ py: 1, gap: 1.5, fontSize: '0.85rem', color: '#2D1B17' }}>
              <BusinessRoundedIcon fontSize="small" sx={{ color: '#667085' }} />
              Organizaciones
            </MenuItem>
            <MenuItem onClick={handleLogout} sx={{ py: 1, gap: 1.5, fontSize: '0.85rem', color: '#DC2626' }}>
              <LogoutRoundedIcon fontSize="small" />
              Cerrar Sesión
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
