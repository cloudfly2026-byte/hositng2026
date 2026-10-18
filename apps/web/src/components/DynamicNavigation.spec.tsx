// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { Sidebar } from './Sidebar';
import { EffectiveCapabilities } from '@cloudfly/contracts';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

// Mock next/link to render a simple anchor
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('VELUPI — Dynamic Navigation & Capabilities Enforcement (Frontend TDD)', () => {
  const baseOrg = {
    id: 'org-tenant-web',
    name: 'Tenant Web Corp',
    slug: 'tenant-web',
    isInternalPilot: false,
  };

  it('renders ONLY web hosting tools when tenant only has a Web Hosting plan', () => {
    const hostingCapabilities: EffectiveCapabilities = {
      organization: baseOrg,
      role: 'OWNER',
      permissions: [
        'hosting.read',
        'hosting.manage',
        'databases.manage',
        'files.manage',
        'emails.manage',
        'ssl.manage',
        'backups.manage',
        'dns.read',
        'billing.read',
        'billing.manage',
      ],
      visibleModules: ['dashboard', 'hosting', 'files', 'databases', 'emails', 'dns', 'ssl', 'backups', 'billing', 'account'],
      enabledActions: ['hosting:read', 'hosting:manage'],
      contractedCapabilities: ['web_hosting', 'databases', 'emails', 'ssl', 'backups', 'dns'],
      servicesStatus: {
        hasActivePlan: true,
        subscriptionStatus: 'ACTIVE',
        gracePeriod: false,
        suspended: false,
        activePlans: ['plan-hosting'],
      },
      isOperator: false,
    };

    render(<Sidebar capabilities={hostingCapabilities} />);

    // Must be present
    expect(screen.getAllByText('Hosting Web').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('File Manager').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Databases').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Email Manager').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('DNS Manager').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Billing & Invoices').length).toBeGreaterThanOrEqual(1);

    // Uncontracted products must NOT be rendered in operative menu
    expect(screen.queryByText('Cloud Apps')).toBeNull();
    expect(screen.queryByText('Application Gateway')).toBeNull();
    expect(screen.queryByText('Microservices Studio')).toBeNull();
  });

  it('renders ONLY container tools when tenant has a Cloud Apps plan', () => {
    const cloudAppsCapabilities: EffectiveCapabilities = {
      organization: {
        id: 'org-tenant-apps',
        name: 'Container Startup',
        slug: 'container-startup',
        isInternalPilot: false,
      },
      role: 'DEVELOPER',
      permissions: ['apps.read', 'apps.deploy', 'gateway.manage', 'dns.read'],
      visibleModules: ['dashboard', 'apps', 'gateway', 'dns', 'account'],
      enabledActions: ['apps:read', 'apps:deploy'],
      contractedCapabilities: ['cloud_apps', 'gateway', 'dns'],
      servicesStatus: {
        hasActivePlan: true,
        subscriptionStatus: 'ACTIVE',
        gracePeriod: false,
        suspended: false,
        activePlans: ['plan-apps'],
      },
      isOperator: false,
    };

    render(<Sidebar capabilities={cloudAppsCapabilities} />);

    expect(screen.getAllByText('Cloud Apps').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Application Gateway').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('DNS Manager').length).toBeGreaterThanOrEqual(1);

    // Hosting Web and Billing must NOT be rendered for Developer without hosting plan
    expect(screen.queryByText('Hosting Web')).toBeNull();
    expect(screen.queryByText('File Manager')).toBeNull();
    expect(screen.queryByText('Email Manager')).toBeNull();
    expect(screen.queryByText('Billing & Invoices')).toBeNull();
  });

  it('displays "Sin Plan Contratado" banner and hides operative tools when user has NO active plan', () => {
    const noPlanCapabilities: EffectiveCapabilities = {
      organization: {
        id: 'org-free',
        name: 'Free Organization',
        slug: 'free-org',
        isInternalPilot: false,
      },
      role: 'OWNER',
      permissions: ['billing.read', 'billing.manage'],
      visibleModules: ['dashboard', 'billing', 'account'],
      enabledActions: [],
      contractedCapabilities: [],
      servicesStatus: {
        hasActivePlan: false,
        subscriptionStatus: 'NO_PLAN',
        gracePeriod: false,
        suspended: false,
        activePlans: [],
      },
      isOperator: false,
    };

    render(<Sidebar capabilities={noPlanCapabilities} />);

    // CTA banner must appear
    expect(screen.getAllByText(/Sin Plan Contratado/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Contratar Plan').length).toBeGreaterThanOrEqual(1);

    // Operative modules must NOT appear
    expect(screen.queryByText('Hosting Web')).toBeNull();
    expect(screen.queryByText('Cloud Apps')).toBeNull();
    expect(screen.queryByText('Databases')).toBeNull();
    expect(screen.queryByText('Microservices Studio')).toBeNull();

    // Billing & Invoices must be available for OWNER to contract a plan
    expect(screen.getAllByText('Billing & Invoices').length).toBeGreaterThanOrEqual(1);
  });

  it('displays "Servicios Suspendidos" alert banner with billing link when subscription is SUSPENDED', () => {
    const suspendedCapabilities: EffectiveCapabilities = {
      organization: baseOrg,
      role: 'OWNER',
      permissions: ['hosting.read', 'billing.read', 'billing.manage'],
      visibleModules: ['dashboard', 'hosting', 'files', 'databases', 'billing', 'account'],
      enabledActions: ['hosting:read', 'billing:read'],
      contractedCapabilities: ['web_hosting', 'databases'],
      servicesStatus: {
        hasActivePlan: true,
        subscriptionStatus: 'SUSPENDED',
        gracePeriod: false,
        suspended: true,
        activePlans: ['plan-hosting'],
      },
      isOperator: false,
    };

    render(<Sidebar capabilities={suspendedCapabilities} />);

    expect(screen.getAllByText(/Servicios Suspendidos/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Regularizar Factura/i).length).toBeGreaterThanOrEqual(1);
  });

  it('updates rendered modules dynamically when switching active organization capabilities', () => {
    const capsOrg1: EffectiveCapabilities = {
      organization: { id: 'org-1', name: 'Org Uno', slug: 'org-1', isInternalPilot: false },
      role: 'OWNER',
      permissions: ['hosting.read', 'billing.read'],
      visibleModules: ['dashboard', 'hosting', 'billing', 'account'],
      enabledActions: [],
      contractedCapabilities: ['web_hosting'],
      servicesStatus: { hasActivePlan: true, subscriptionStatus: 'ACTIVE', gracePeriod: false, suspended: false, activePlans: ['p1'] },
      isOperator: false,
    };

    const capsOrg2: EffectiveCapabilities = {
      organization: { id: 'org-2', name: 'Org Dos', slug: 'org-2', isInternalPilot: false },
      role: 'VIEWER',
      permissions: ['apps.read'],
      visibleModules: ['dashboard', 'apps', 'account'],
      enabledActions: [],
      contractedCapabilities: ['cloud_apps'],
      servicesStatus: { hasActivePlan: true, subscriptionStatus: 'ACTIVE', gracePeriod: false, suspended: false, activePlans: ['p2'] },
      isOperator: false,
    };

    const { rerender } = render(<Sidebar capabilities={capsOrg1} />);
    expect(screen.getAllByText('Hosting Web').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Cloud Apps')).toBeNull();

    // User switches organization -> rerender with Org 2 capabilities
    rerender(<Sidebar capabilities={capsOrg2} />);
    expect(screen.queryByText('Hosting Web')).toBeNull();
    expect(screen.getAllByText('Cloud Apps').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Billing & Invoices')).toBeNull();
  });
});
