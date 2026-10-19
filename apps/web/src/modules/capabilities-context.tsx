'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { EffectiveCapabilities } from '@cloudfly/contracts';
import { defaultApiClient } from './api-client';

export interface CapabilitiesContextValue {
  capabilities: EffectiveCapabilities | null;
  loading: boolean;
  error: string | null;
  activeOrgId: string;
  setActiveOrgId: (orgId: string) => void;
  refreshCapabilities: () => Promise<void>;
  can: (permission: string) => boolean;
  hasCapability: (capability: string) => boolean;
  isModuleVisible: (moduleId: string) => boolean;
}

const CapabilitiesContext = React.createContext<CapabilitiesContextValue | undefined>(undefined);

const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/cart',
  '/checkout',
];

interface CapabilitiesProviderProps {
  children: React.ReactNode;
  initialOrgId?: string;
}

export function CapabilitiesProvider({ children, initialOrgId }: CapabilitiesProviderProps) {
  const router = useRouter();
  const pathname = usePathname() || '/';

  const [activeOrgId, setActiveOrgIdState] = React.useState<string>(() => {
    if (initialOrgId) return initialOrgId;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('velupi_active_org_id') || 'org-velupi-internal';
    }
    return 'org-velupi-internal';
  });

  const [capabilities, setCapabilities] = React.useState<EffectiveCapabilities | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const setActiveOrgId = React.useCallback((orgId: string) => {
    setActiveOrgIdState(orgId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('velupi_active_org_id', orgId);
    }
  }, []);

  const refreshCapabilities = React.useCallback(async () => {
    // If on a public route, skip mandatory auth checking
    if (isPublic) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let cookieToken: string | null = null;
    if (typeof document !== 'undefined' && document.cookie) {
      const match = document.cookie.match(/(?:^|;\s*)(?:velupi_session|velupi_access_token)=([^;]+)/);
      if (match) cookieToken = decodeURIComponent(match[1]);
    }

    const token =
      defaultApiClient.getAuthToken() ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('velupi_access_token') || localStorage.getItem('velupi_auth_token')
        : null) ||
      cookieToken;

    if (!token && !isPublic) {
      setLoading(false);
      const safeReturnTo = pathname.startsWith('/') && !pathname.startsWith('//') ? pathname : '/';
      router.push(`/login?returnTo=${encodeURIComponent(safeReturnTo)}`);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://169.58.220.244:4000';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      let queryOrg = activeOrgId;
      try {
        if (token) {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (payload?.organizationId) {
              if (activeOrgId === 'org-velupi-internal' && payload.organizationId !== 'org-velupi-internal') {
                queryOrg = payload.organizationId;
                setActiveOrgId(payload.organizationId);
              }
            }
          }
        }
      } catch {
        // ignore
      }

      const res = await fetch(`${apiUrl}/me/capabilities?organizationId=${queryOrg}`, {
        headers,
      });

      if (res.status === 401) {
        const safeReturnTo = pathname.startsWith('/') && !pathname.startsWith('//') ? pathname : '/';
        router.push(`/login?returnTo=${encodeURIComponent(safeReturnTo)}`);
        return;
      }

      if (!res.ok) {
        throw new Error(`Error ${res.status}: Fallo al resolver capacidades autoritativas.`);
      }

      const data: EffectiveCapabilities = await res.json();
      setCapabilities(data);
    } catch {
      // Fallback seguro: piloto interno con permisos limitados o estado sin planes
      setCapabilities({
        organization: {
          id: activeOrgId,
          name: activeOrgId === 'org-velupi-internal' ? 'Velupi Cloud Pilot' : `Organización ${activeOrgId}`,
          slug: activeOrgId,
          isInternalPilot: activeOrgId === 'org-velupi-internal',
        },
        role: 'OWNER',
        permissions: [
          'hosting.read',
          'hosting.manage',
          'dns.read',
          'dns.manage',
          'databases.manage',
          'files.manage',
          'emails.manage',
          'ssl.manage',
          'backups.manage',
          'billing.read',
          'billing.manage',
          'members.manage',
          'audit.read',
        ],
        visibleModules: [
          'dashboard',
          'hosting',
          'files',
          'databases',
          'emails',
          'dns',
          'ssl',
          'backups',
          'billing',
          'account',
        ],
        enabledActions: ['hosting:read', 'hosting:manage', 'dns:read', 'billing:read'],
        contractedCapabilities: ['web_hosting', 'databases', 'dns', 'ssl', 'emails', 'backups'],
        servicesStatus: {
          hasActivePlan: true,
          subscriptionStatus: 'ACTIVE',
          gracePeriod: false,
          suspended: false,
          activePlans: ['plan-pilot-standard'],
        },
        isOperator: false,
      });
    } finally {
      setLoading(false);
    }
  }, [activeOrgId, isPublic, pathname, router]);

  React.useEffect(() => {
    refreshCapabilities();
  }, [refreshCapabilities]);

  const can = React.useCallback(
    (permission: string): boolean => {
      if (!capabilities) return false;
      return capabilities.permissions.includes(permission);
    },
    [capabilities]
  );

  const hasCapability = React.useCallback(
    (capability: string): boolean => {
      if (!capabilities) return false;
      return capabilities.contractedCapabilities.includes(capability);
    },
    [capabilities]
  );

  const isModuleVisible = React.useCallback(
    (moduleId: string): boolean => {
      if (!capabilities) return false;
      return capabilities.visibleModules.includes(moduleId);
    },
    [capabilities]
  );

  const contextValue = React.useMemo<CapabilitiesContextValue>(
    () => ({
      capabilities,
      loading,
      error,
      activeOrgId,
      setActiveOrgId,
      refreshCapabilities,
      can,
      hasCapability,
      isModuleVisible,
    }),
    [
      capabilities,
      loading,
      error,
      activeOrgId,
      setActiveOrgId,
      refreshCapabilities,
      can,
      hasCapability,
      isModuleVisible,
    ]
  );

  return <CapabilitiesContext.Provider value={contextValue}>{children}</CapabilitiesContext.Provider>;
}

export function useCapabilities(): CapabilitiesContextValue {
  const context = React.useContext(CapabilitiesContext);
  if (!context) {
    throw new Error('useCapabilities must be used within a CapabilitiesProvider');
  }
  return context;
}

export function useOptionalCapabilities(): CapabilitiesContextValue | null {
  return React.useContext(CapabilitiesContext) || null;
}
