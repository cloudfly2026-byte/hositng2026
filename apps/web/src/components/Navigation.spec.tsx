// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { Breadcrumbs } from './Breadcrumbs';
import { Sidebar } from './Sidebar';
import { ModuleStateContainer } from './ModuleStateContainer';
import { MODULE_REGISTRY } from '../modules/module-registry';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dns'),
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

describe('Modular Navigation & White-Label Components', () => {
  it('renders breadcrumbs dynamically for current route', () => {
    render(<Breadcrumbs currentPath="/dns" />);
    expect(screen.getByText('Velupi Cloud')).toBeDefined();
    expect(screen.getByText('DNS Manager')).toBeDefined();
  });

  it('renders sidebar with all primary categories and module names', () => {
    render(<Sidebar userRole="OWNER" />);
    // Check key modules (using getAllByText because responsive desktop + mobile drawers are rendered)
    expect(screen.getAllByText('Hosting Web').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('File Manager').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Databases').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('DNS Manager').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Cloud Apps').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Microservices Studio').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Billing & Invoices').length).toBeGreaterThanOrEqual(1);
  });

  it('enforces strict white-label integrity across rendered sidebar and breadcrumbs', () => {
    const { container } = render(
      <div>
        <Sidebar userRole="OWNER" />
        <Breadcrumbs currentPath="/hosting" />
      </div>
    );
    const textContent = container.textContent?.toLowerCase() || '';

    // Forbidden provider and port names
    expect(textContent).not.toContain('hestia');
    expect(textContent).not.toContain('dokploy');
    expect(textContent).not.toContain('traefik');
    expect(textContent).not.toContain('8083');
  });

  it('renders ModuleStateContainer states correctly', () => {
    // 1. Loading state
    const { rerender } = render(
      <ModuleStateContainer state="loading">
        <div>Contenido Real</div>
      </ModuleStateContainer>
    );
    expect(screen.getByText('Cargando recursos del módulo...')).toBeDefined();

    // 2. Empty state
    rerender(
      <ModuleStateContainer state="empty" emptyTitle="No hay datos" emptyMessage="Crea tu primer recurso.">
        <div>Contenido Real</div>
      </ModuleStateContainer>
    );
    expect(screen.getByText('No hay datos')).toBeDefined();
    expect(screen.getByText('Crea tu primer recurso.')).toBeDefined();

    // 3. Error state with retry
    const onRetry = vi.fn();
    rerender(
      <ModuleStateContainer state="error" errorMessage="Fallo de conexión" onRetry={onRetry}>
        <div>Contenido Real</div>
      </ModuleStateContainer>
    );
    expect(screen.getByText('Fallo de conexión')).toBeDefined();
    expect(screen.getByText('Reintentar')).toBeDefined();

    // 4. Success state
    rerender(
      <ModuleStateContainer state="success">
        <div>Contenido Exitoso</div>
      </ModuleStateContainer>
    );
    expect(screen.getByText('Contenido Exitoso')).toBeDefined();
  });

  it('verifies all 14 modules have valid routes and titles', () => {
    expect(MODULE_REGISTRY.length).toBe(14);
    for (const mod of MODULE_REGISTRY) {
      expect(mod.id).toBeTruthy();
      expect(mod.title).toBeTruthy();
      expect(mod.path.startsWith('/')).toBe(true);
      expect(mod.category).toBeTruthy();
    }
  });
});
