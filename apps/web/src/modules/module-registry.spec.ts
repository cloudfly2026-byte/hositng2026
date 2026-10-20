import { describe, it, expect } from 'vitest';
import {
  MODULE_REGISTRY,
  MODULE_CATEGORIES,
  checkWhiteLabelIntegrity,
  getBreadcrumbs,
  getModulesByCategory,
  filterModulesByRole,
  type ModuleDefinition,
} from './module-registry';

describe('Module Registry & White-Label Architecture (TDD)', () => {
  it('should register the 14 Velupi platform and administration modules', () => {
    expect(MODULE_REGISTRY).toHaveLength(14);

    const moduleIds = MODULE_REGISTRY.map((m) => m.id);
    const expectedIds = [
      'dashboard',
      'hosting',
      'files',
      'databases',
      'emails',
      'dns',
      'ssl',
      'backups',
      'apps',
      'gateway',
      'studio',
      'billing',
      'account',
      'admin-customers',
    ];

    expectedIds.forEach((id) => {
      expect(moduleIds).toContain(id);
    });
  });

  it('should categorize modules into valid business categories', () => {
    const validCategories = Object.keys(MODULE_CATEGORIES);
    MODULE_REGISTRY.forEach((module: ModuleDefinition) => {
      expect(validCategories).toContain(module.category);
      expect(module.title).toBeDefined();
      expect(module.path).toBeDefined();
      expect(module.icon).toBeDefined();
    });
  });

  it('should enforce 100% white-label compliance with zero provider name leaks', () => {
    const whiteLabelResult = checkWhiteLabelIntegrity(MODULE_REGISTRY);
    expect(whiteLabelResult.compliant).toBe(true);
    expect(whiteLabelResult.violations).toEqual([]);
  });

  it('should catch any accidental leak of internal infrastructure provider names', () => {
    const leakingRegistry: ModuleDefinition[] = [
      {
        id: 'bad-module',
        title: 'HestiaCP Admin',
        description: 'Manage with Dokploy and Traefik on port 8083',
        path: '/hestia',
        icon: 'ErrorIcon',
        category: 'WEB_HOSTING',
      },
    ];

    const result = checkWhiteLabelIntegrity(leakingRegistry);
    expect(result.compliant).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations.some((v) => v.includes('HestiaCP'))).toBe(true);
    expect(result.violations.some((v) => v.includes('Dokploy'))).toBe(true);
    expect(result.violations.some((v) => v.includes('Traefik'))).toBe(true);
    expect(result.violations.some((v) => v.includes('8083'))).toBe(true);
  });

  it('should generate accurate breadcrumbs from pathnames', () => {
    // Root dashboard
    const rootCrumbs = getBreadcrumbs('/');
    expect(rootCrumbs).toEqual([
      { title: 'Velupi Cloud', path: '/' },
      { title: 'Dashboard', path: '/' },
    ]);

    // Hosting module
    const hostingCrumbs = getBreadcrumbs('/hosting');
    expect(hostingCrumbs).toEqual([
      { title: 'Velupi Cloud', path: '/' },
      { title: 'Hosting Web', path: '/hosting' },
    ]);

    // Sub-item in DNS Manager
    const dnsRecordsCrumbs = getBreadcrumbs('/dns/records');
    expect(dnsRecordsCrumbs).toEqual([
      { title: 'Velupi Cloud', path: '/' },
      { title: 'DNS Manager', path: '/dns' },
      { title: 'Registros DNS', path: '/dns/records' },
    ]);

    // Deep sub-item in Databases
    const dbCrumbs = getBreadcrumbs('/databases/users');
    expect(dbCrumbs).toEqual([
      { title: 'Velupi Cloud', path: '/' },
      { title: 'Databases', path: '/databases' },
      { title: 'Usuarios DB', path: '/databases/users' },
    ]);
  });

  it('should group modules by category correctly', () => {
    const hostingModules = getModulesByCategory('WEB_HOSTING');
    const hostingIds = hostingModules.map((m) => m.id);
    expect(hostingIds).toContain('hosting');
    expect(hostingIds).toContain('files');
    expect(hostingIds).toContain('databases');
    expect(hostingIds).toContain('emails');
    expect(hostingIds).toContain('ssl');
    expect(hostingIds).toContain('backups');

    const cloudModules = getModulesByCategory('CLOUD_SERVICES');
    const cloudIds = cloudModules.map((m) => m.id);
    expect(cloudIds).toContain('apps');
    expect(cloudIds).toContain('gateway');
    expect(cloudIds).toContain('studio');
  });

  it('should filter modules based on user RBAC role', () => {
    // VIEWER should have access to read modules, but not sensitive billing/account mutation
    const viewerModules = filterModulesByRole(MODULE_REGISTRY, 'VIEWER');
    const viewerIds = viewerModules.map((m) => m.id);
    expect(viewerIds).toContain('dashboard');
    expect(viewerIds).toContain('hosting');
    expect(viewerIds).not.toContain('billing');

    // OWNER has full access
    const ownerModules = filterModulesByRole(MODULE_REGISTRY, 'OWNER');
    expect(ownerModules).toHaveLength(13);
  });
});
