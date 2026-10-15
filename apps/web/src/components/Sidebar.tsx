'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';

// Material Icons
import CloudQueueRoundedIcon from '@mui/icons-material/CloudQueueRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';
import FolderSharedRoundedIcon from '@mui/icons-material/FolderSharedRounded';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import AlternateEmailRoundedIcon from '@mui/icons-material/AlternateEmailRounded';
import DnsRoundedIcon from '@mui/icons-material/DnsRounded';
import HttpsRoundedIcon from '@mui/icons-material/HttpsRounded';
import BackupRoundedIcon from '@mui/icons-material/BackupRounded';
import AppsRoundedIcon from '@mui/icons-material/AppsRounded';
import AltRouteRoundedIcon from '@mui/icons-material/AltRouteRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

import {
  MODULE_REGISTRY,
  MODULE_CATEGORIES,
  ModuleCategory,
  ModuleDefinition,
} from '../modules/module-registry';

export const DRAWER_WIDTH = 270;

const ICON_MAP: Record<string, React.ReactElement> = {
  DashboardRounded: <DashboardRoundedIcon fontSize="small" />,
  LanguageRounded: <LanguageRoundedIcon fontSize="small" />,
  FolderSharedRounded: <FolderSharedRoundedIcon fontSize="small" />,
  StorageRounded: <StorageRoundedIcon fontSize="small" />,
  AlternateEmailRounded: <AlternateEmailRoundedIcon fontSize="small" />,
  DnsRounded: <DnsRoundedIcon fontSize="small" />,
  HttpsRounded: <HttpsRoundedIcon fontSize="small" />,
  BackupRounded: <BackupRoundedIcon fontSize="small" />,
  AppsRounded: <AppsRoundedIcon fontSize="small" />,
  AltRouteRounded: <AltRouteRoundedIcon fontSize="small" />,
  AccountTreeRounded: <AccountTreeRoundedIcon fontSize="small" />,
  ReceiptLongRounded: <ReceiptLongRoundedIcon fontSize="small" />,
  AdminPanelSettingsRounded: <AdminPanelSettingsRoundedIcon fontSize="small" />,
};

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname() || '/';

  // State to track expanded submenus
  const [openSubmenus, setOpenSubmenus] = React.useState<Record<string, boolean>>(() => {
    // Automatically open submenus where the current pathname is an active child
    const initial: Record<string, boolean> = {};
    MODULE_REGISTRY.forEach((mod) => {
      if (mod.subItems && mod.subItems.some((s) => s.path === pathname || (s.path !== '/' && pathname.startsWith(s.path)))) {
        initial[mod.id] = true;
      }
    });
    return initial;
  });

  const handleToggleSubmenu = (moduleId: string) => {
    setOpenSubmenus((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const categoriesOrder: ModuleCategory[] = [
    'GENERAL',
    'WEB_HOSTING',
    'CLOUD_SERVICES',
    'NETWORK_DOMAINS',
    'ADMINISTRATION',
  ];

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        color: '#2D1B17',
        borderRight: '1px solid #F2E8DC',
      }}
    >
      {/* Brand Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #F2E8DC',
          backgroundColor: '#FFF8ED',
        }}
      >
        <Box component={Link} href="/" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, textDecoration: 'none' }}>
          <Box
            component="img"
            src="/velupi-logo.png"
            alt="Velupi Cloud Platform"
            sx={{
              height: 40,
              width: 'auto',
              display: 'block',
            }}
          />
        </Box>

        {/* Mobile close button */}
        <IconButton
          onClick={onMobileClose}
          sx={{ display: { xs: 'flex', md: 'none' }, color: '#667085' }}
          aria-label="Cerrar navegación"
        >
          <CloseRoundedIcon />
        </IconButton>
      </Box>

      {/* Navigation List by Categories */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 1.5, py: 2 }}>
        {categoriesOrder.map((catKey) => {
          const categoryMeta = MODULE_CATEGORIES[catKey];
          const modulesInCat = MODULE_REGISTRY.filter((m) => m.category === catKey);

          if (modulesInCat.length === 0) return null;

          return (
            <Box key={catKey} sx={{ mb: 2.5 }}>
              <Typography
                variant="overline"
                sx={{
                  px: 1.5,
                  py: 0.5,
                  display: 'block',
                  color: '#9E7A6E',
                  fontWeight: 700,
                  fontSize: '0.68rem',
                  letterSpacing: '0.08em',
                }}
              >
                {categoryMeta.label}
              </Typography>

              <List disablePadding>
                {modulesInCat.map((mod: ModuleDefinition) => {
                  const isDirectActive =
                    mod.path === '/'
                      ? pathname === '/'
                      : pathname === mod.path || pathname.startsWith(`${mod.path}/`);

                  const hasSubItems = mod.subItems && mod.subItems.length > 0;
                  const isSubmenuOpen = !!openSubmenus[mod.id];

                  return (
                    <React.Fragment key={mod.id}>
                      <ListItemButton
                        component={hasSubItems ? 'div' : Link}
                        href={hasSubItems ? undefined : mod.path}
                        onClick={hasSubItems ? () => handleToggleSubmenu(mod.id) : onMobileClose}
                        sx={{
                          borderRadius: '8px',
                          mb: 0.4,
                          py: 0.85,
                          px: 1.5,
                          color: isDirectActive ? '#FF6B00' : '#4B362F',
                          backgroundColor: isDirectActive ? 'rgba(255, 107, 0, 0.08)' : 'transparent',
                          borderLeft: isDirectActive ? '3px solid #FF6B00' : '3px solid transparent',
                          transition: 'all 0.15s ease',
                          '&:hover': {
                            backgroundColor: isDirectActive
                              ? 'rgba(255, 107, 0, 0.14)'
                              : 'rgba(255, 107, 0, 0.04)',
                            color: '#FF6B00',
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 32,
                            color: isDirectActive ? '#FF6B00' : '#8C766E',
                          }}
                        >
                          {ICON_MAP[mod.icon] || <DashboardRoundedIcon fontSize="small" />}
                        </ListItemIcon>
                        <ListItemText
                          primary={mod.title}
                          primaryTypographyProps={{
                            fontSize: '0.88rem',
                            fontWeight: isDirectActive ? 700 : 500,
                          }}
                        />
                        {mod.badge && (
                          <Chip
                            label={mod.badge}
                            size="small"
                            color={mod.badgeColor || 'primary'}
                            sx={{
                              height: 18,
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              mr: hasSubItems ? 0.5 : 0,
                            }}
                          />
                        )}
                        {hasSubItems && (
                          <Box sx={{ color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
                            {isSubmenuOpen ? (
                              <ExpandLessRoundedIcon fontSize="small" />
                            ) : (
                              <ExpandMoreRoundedIcon fontSize="small" />
                            )}
                          </Box>
                        )}
                      </ListItemButton>

                      {/* Submenu Items */}
                      {hasSubItems && (
                        <Collapse in={isSubmenuOpen} timeout="auto" unmountOnExit>
                          <List disablePadding sx={{ pl: 4, mb: 0.5 }}>
                            {mod.subItems!.map((sub) => {
                              const isSubActive =
                                sub.path === '/' ? pathname === '/' : pathname === sub.path;

                              return (
                                <ListItemButton
                                  key={sub.id}
                                  component={Link}
                                  href={sub.path}
                                  onClick={onMobileClose}
                                  sx={{
                                    borderRadius: '6px',
                                    py: 0.6,
                                    px: 1.5,
                                    mb: 0.2,
                                    color: isSubActive ? '#67e8f9' : '#9ca3af',
                                    backgroundColor: isSubActive ? 'rgba(6, 182, 212, 0.08)' : 'transparent',
                                    '&:hover': {
                                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                      color: '#f3f4f6',
                                    },
                                  }}
                                >
                                  <ListItemText
                                    primary={sub.title}
                                    primaryTypographyProps={{
                                      fontSize: '0.80rem',
                                      fontWeight: isSubActive ? 600 : 400,
                                    }}
                                  />
                                </ListItemButton>
                              );
                            })}
                          </List>
                        </Collapse>
                      )}
                    </React.Fragment>
                  );
                })}
              </List>
            </Box>
          );
        })}
      </Box>

      {/* Footer / Tenant Pill */}
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid #F2E8DC',
          backgroundColor: '#FFF8ED',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="caption" sx={{ color: '#9E7A6E', display: 'block', fontSize: '0.68rem', fontWeight: 600 }}>
              ORGANIZACIÓN
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#2D1B17', fontSize: '0.82rem' }}>
              org-velupi-internal
            </Typography>
          </Box>
          <Chip
            label="Pro"
            size="small"
            sx={{
              backgroundColor: 'rgba(255, 107, 0, 0.12)',
              color: '#FF6B00',
              fontWeight: 700,
              fontSize: '0.70rem',
              height: 20,
            }}
          />
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            borderRight: '1px solid #F2E8DC',
            backgroundColor: '#FFFFFF',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Persistent Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            borderRight: '1px solid #F2E8DC',
            backgroundColor: '#FFFFFF',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}
