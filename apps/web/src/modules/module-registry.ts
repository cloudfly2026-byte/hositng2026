import { Role, EffectiveCapabilities, Permissions } from '@cloudfly/contracts';

export type ModuleCategory =
  | 'GENERAL'
  | 'WEB_HOSTING'
  | 'CLOUD_SERVICES'
  | 'NETWORK_DOMAINS'
  | 'ADMINISTRATION';

export interface ModuleCategoryMeta {
  id: ModuleCategory;
  label: string;
  order: number;
}

export const MODULE_CATEGORIES: Record<ModuleCategory, ModuleCategoryMeta> = {
  GENERAL: {
    id: 'GENERAL',
    label: 'General',
    order: 1,
  },
  WEB_HOSTING: {
    id: 'WEB_HOSTING',
    label: 'Hosting Web',
    order: 2,
  },
  CLOUD_SERVICES: {
    id: 'CLOUD_SERVICES',
    label: 'Servicios Cloud',
    order: 3,
  },
  NETWORK_DOMAINS: {
    id: 'NETWORK_DOMAINS',
    label: 'Red y Dominios',
    order: 4,
  },
  ADMINISTRATION: {
    id: 'ADMINISTRATION',
    label: 'Administración y Seguridad',
    order: 5,
  },
};

export interface ModuleSubItem {
  id: string;
  title: string;
  path: string;
  description?: string;
  requiredPermission?: string;
  requiredCapability?: string;
  requiredRoles?: Role[];
  visibilityRule?: (capabilities: EffectiveCapabilities) => boolean;
}

export interface ModuleDefinition {
  id: string;
  title: string;
  path: string;
  icon: string;
  description?: string;
  category: ModuleCategory;
  badge?: string;
  badgeColor?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  requiredPermission?: string;
  requiredCapability?: string;
  requiredRoles?: Role[];
  visibilityRule?: (capabilities: EffectiveCapabilities) => boolean;
  subItems?: ModuleSubItem[];
}

export interface BreadcrumbItem {
  title: string;
  path: string;
}

/**
 * Registro central y tipado de los 13 módulos de Velupi Cloud Platform.
 * Regla arquitectónica: 100% marca propia (White-Label), sin exposición de proveedores internos.
 */
export const MODULE_REGISTRY: ModuleDefinition[] = [
  // 1. Dashboard
  {
    id: 'dashboard',
    title: 'Dashboard',
    path: '/',
    icon: 'DashboardRounded',
    description: 'Resumen ejecutivo de recursos, estado global de la infraestructura y accesos rápidos.',
    category: 'GENERAL',
  },

  // 2. Hosting Web
  {
    id: 'hosting',
    title: 'Hosting Web',
    path: '/hosting',
    icon: 'LanguageRounded',
    description: 'Administración de sitios web, WordPress, tiendas en línea y entornos PHP.',
    category: 'WEB_HOSTING',
    requiredPermission: Permissions.HOSTING_READ,
    requiredCapability: 'web_hosting',
    subItems: [
      { id: 'hosting-sites', title: 'Sitios Activos', path: '/hosting', requiredPermission: Permissions.HOSTING_READ },
      { id: 'hosting-new', title: 'Nuevo Sitio', path: '/hosting/new', requiredPermission: Permissions.HOSTING_MANAGE, requiredRoles: ['OWNER', 'ADMIN', 'DEVELOPER'] },
      { id: 'hosting-php', title: 'Versiones PHP', path: '/hosting/php', requiredPermission: Permissions.HOSTING_MANAGE },
    ],
  },

  // 3. File Manager
  {
    id: 'files',
    title: 'File Manager',
    path: '/files',
    icon: 'FolderSharedRounded',
    description: 'Explorador seguro de archivos web, editor integrado y gestor de permisos.',
    category: 'WEB_HOSTING',
    requiredPermission: Permissions.FILES_MANAGE,
    requiredCapability: 'web_hosting',
    requiredRoles: ['OWNER', 'ADMIN', 'DEVELOPER'],
  },

  // 4. Databases
  {
    id: 'databases',
    title: 'Databases',
    path: '/databases',
    icon: 'StorageRounded',
    description: 'Gestión de bases de datos relacionales, credenciales, usuarios y administración SQL.',
    category: 'WEB_HOSTING',
    requiredPermission: Permissions.DATABASES_MANAGE,
    requiredCapability: 'databases',
    subItems: [
      { id: 'db-list', title: 'Bases de Datos', path: '/databases' },
      { id: 'db-users', title: 'Usuarios DB', path: '/databases/users' },
      { id: 'db-admin', title: 'Consola SQL', path: '/databases/phpmyadmin' },
    ],
  },

  // 5. Email Manager
  {
    id: 'emails',
    title: 'Email Manager',
    path: '/emails',
    icon: 'AlternateEmailRounded',
    description: 'Cuentas de correo corporativo bajo tu propio dominio, alias, cuotas y acceso webmail.',
    category: 'WEB_HOSTING',
    requiredPermission: Permissions.EMAILS_MANAGE,
    requiredCapability: 'emails',
    subItems: [
      { id: 'email-accounts', title: 'Cuentas de Correo', path: '/emails' },
      { id: 'email-forwarders', title: 'Reenviadores', path: '/emails/forwarders' },
      { id: 'email-webmail', title: 'Webmail', path: '/emails/webmail' },
    ],
  },

  // 6. DNS Manager
  {
    id: 'dns',
    title: 'DNS Manager',
    path: '/dns',
    icon: 'DnsRounded',
    description: 'Administración de zonas DNS, propagación de nombres y registros autoritativos.',
    category: 'NETWORK_DOMAINS',
    badge: 'ns1/ns2',
    badgeColor: 'info',
    requiredPermission: Permissions.DNS_READ,
    requiredCapability: 'dns',
    subItems: [
      { id: 'dns-zones', title: 'Zonas DNS', path: '/dns', requiredPermission: Permissions.DNS_READ },
      { id: 'dns-records', title: 'Registros DNS', path: '/dns/records', requiredPermission: Permissions.DNS_MANAGE },
    ],
  },

  // 7. SSL Manager
  {
    id: 'ssl',
    title: 'SSL Manager',
    path: '/ssl',
    icon: 'HttpsRounded',
    description: 'Emisión automatizada de certificados TLS/SSL, renovación y certificados personalizados.',
    category: 'WEB_HOSTING',
    requiredPermission: Permissions.SSL_MANAGE,
    requiredCapability: 'ssl',
    subItems: [
      { id: 'ssl-letsencrypt', title: 'Let\'s Encrypt Automático', path: '/ssl' },
      { id: 'ssl-custom', title: 'Certificados Personalizados', path: '/ssl/custom' },
    ],
  },

  // 8. Backups
  {
    id: 'backups',
    title: 'Backups',
    path: '/backups',
    icon: 'BackupRounded',
    description: 'Copias de seguridad programadas, snapshots de aplicaciones y puntos de restauración instantáneos.',
    category: 'WEB_HOSTING',
    requiredPermission: Permissions.BACKUPS_MANAGE,
    requiredCapability: 'backups',
    subItems: [
      { id: 'backups-list', title: 'Copias de Seguridad', path: '/backups' },
      { id: 'backups-restore', title: 'Puntos de Restauración', path: '/backups/restore' },
    ],
  },

  // 9. Cloud Apps
  {
    id: 'apps',
    title: 'Cloud Apps',
    path: '/services/apps',
    icon: 'AppsRounded',
    description: 'Despliegue y ejecución de contenedores Docker, aplicaciones Node.js, Python, workers y staging.',
    category: 'CLOUD_SERVICES',
    requiredPermission: Permissions.APPS_READ,
    requiredCapability: 'cloud_apps',
    subItems: [
      { id: 'apps-list', title: 'Aplicaciones', path: '/services/apps', requiredPermission: Permissions.APPS_READ },
      { id: 'apps-deploy', title: 'Despliegues', path: '/services/apps#deployments', requiredPermission: Permissions.APPS_DEPLOY },
      { id: 'apps-logs', title: 'Logs en Vivo', path: '/services/apps#logs', requiredPermission: Permissions.APPS_READ },
    ],
  },

  // 10. Application Gateway
  {
    id: 'gateway',
    title: 'Application Gateway',
    path: '/gateway',
    icon: 'AltRouteRounded',
    description: 'Enrutamiento perimetral, balanceo de carga, proxy inverso y terminación TLS de microservicios.',
    category: 'CLOUD_SERVICES',
    requiredPermission: Permissions.GATEWAY_MANAGE,
    requiredCapability: 'gateway',
    subItems: [
      { id: 'gateway-routes', title: 'Rutas y Proxies', path: '/gateway' },
      { id: 'gateway-tls', title: 'Reglas TLS / SNI', path: '/gateway/tls' },
    ],
  },

  // 11. Microservices Studio
  {
    id: 'studio',
    title: 'Microservices Studio',
    path: '/studio',
    icon: 'AccountTreeRounded',
    description: 'Estudio gráfico interactivo para diseño, conexión y orquestación visual de stacks distribuidos.',
    category: 'CLOUD_SERVICES',
    badge: 'Pro',
    badgeColor: 'primary',
    requiredPermission: Permissions.STUDIO_ACCESS,
    requiredCapability: 'microservices_studio',
    subItems: [
      { id: 'studio-canvas', title: 'Canvas de Arquitectura', path: '/studio' },
      { id: 'studio-templates', title: 'Plantillas de Stacks', path: '/studio/templates' },
    ],
  },

  // 12. Billing
  {
    id: 'billing',
    title: 'Billing & Invoices',
    path: '/billing',
    icon: 'ReceiptLongRounded',
    description: 'Historial de órdenes, suscripciones activas, facturas descargables y gestión de planes.',
    category: 'ADMINISTRATION',
    requiredPermission: Permissions.BILLING_READ,
    requiredRoles: ['OWNER', 'ADMIN'],
    subItems: [
      { id: 'billing-overview', title: 'Suscripciones', path: '/billing' },
      { id: 'billing-invoices', title: 'Facturas', path: '/billing/invoices' },
      { id: 'billing-plans', title: 'Contratar Planes', path: '/checkout' },
    ],
  },

  // 13. Account & Security
  {
    id: 'account',
    title: 'Account & Security',
    path: '/account',
    icon: 'AdminPanelSettingsRounded',
    description: 'Gestión de organizaciones, miembros del equipo, roles RBAC, credenciales y registro de auditoría.',
    category: 'ADMINISTRATION',
    requiredRoles: ['OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'],
    subItems: [
      { id: 'account-profile', title: 'Perfil & Seguridad', path: '/account' },
      { id: 'account-members', title: 'Equipo & Roles', path: '/account/members', requiredPermission: Permissions.MEMBERS_MANAGE },
      { id: 'account-audit', title: 'Registro de Auditoría', path: '/account/audit', requiredPermission: Permissions.AUDIT_READ },
    ],
  },
];

/**
 * Regla de Oro White-Label: Verifica que no se filtre ninguna marca, nombre, logo,
 * puerto o comando de proveedores internos (HestiaCP, Dokploy, Traefik).
 */
export function checkWhiteLabelIntegrity(registry: ModuleDefinition[]): {
  compliant: boolean;
  violations: string[];
} {
  const forbiddenPatterns = [
    /hestia/i,
    /dokploy/i,
    /traefik/i,
    /8083/,
    /v-[a-z-]+/,
    /\/usr\/local\/hestia/,
  ];

  const violations: string[] = [];

  for (const mod of registry) {
    const fieldsToInspect = [
      `id: ${mod.id}`,
      `title: ${mod.title}`,
      `path: ${mod.path}`,
      `description: ${mod.description || ''}`,
    ];

    if (mod.subItems) {
      for (const sub of mod.subItems) {
        fieldsToInspect.push(`subItem.title: ${sub.title}`);
        fieldsToInspect.push(`subItem.path: ${sub.path}`);
        if (sub.description) fieldsToInspect.push(`subItem.description: ${sub.description}`);
      }
    }

    for (const field of fieldsToInspect) {
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(field)) {
          violations.push(`Violation in module '${mod.id}': '${field}' matched forbidden pattern ${pattern}`);
        }
      }
    }
  }

  return {
    compliant: violations.length === 0,
    violations,
  };
}

/**
 * Genera la jerarquía tipada de breadcrumbs a partir de la ruta actual.
 */
export function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const rootCrumb: BreadcrumbItem = { title: 'Velupi Cloud', path: '/' };

  if (pathname === '/') {
    return [rootCrumb, { title: 'Dashboard', path: '/' }];
  }

  // Find matching module or subitem
  for (const mod of MODULE_REGISTRY) {
    if (mod.path === pathname) {
      return [rootCrumb, { title: mod.title, path: mod.path }];
    }

    if (mod.subItems) {
      for (const sub of mod.subItems) {
        if (sub.path === pathname) {
          return [rootCrumb, { title: mod.title, path: mod.path }, { title: sub.title, path: sub.path }];
        }
      }
    }
  }

  // Check prefix match for nested paths
  const matchingModule = MODULE_REGISTRY.find(
    (m) => m.path !== '/' && (pathname === m.path || pathname.startsWith(`${m.path}/`))
  );

  if (matchingModule) {
    const matchingSub = matchingModule.subItems?.find(
      (s) => s.path === pathname || pathname.startsWith(`${s.path}/`)
    );

    if (matchingSub) {
      return [
        rootCrumb,
        { title: matchingModule.title, path: matchingModule.path },
        { title: matchingSub.title, path: matchingSub.path },
      ];
    }

    return [rootCrumb, { title: matchingModule.title, path: matchingModule.path }];
  }

  // Fallback for custom or unrecognized routes
  const cleanSegments = pathname.split('/').filter(Boolean);
  const crumbs: BreadcrumbItem[] = [rootCrumb];
  let accumulatedPath = '';

  cleanSegments.forEach((segment) => {
    accumulatedPath += `/${segment}`;
    const capitalized = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    crumbs.push({ title: capitalized, path: accumulatedPath });
  });

  return crumbs;
}

/**
 * Obtiene los módulos pertenecientes a una categoría específica ordenados por su orden natural.
 */
export function getModulesByCategory(category: ModuleCategory): ModuleDefinition[] {
  return MODULE_REGISTRY.filter((mod) => mod.category === category);
}

/**
 * Filtra los módulos visibles según el rol RBAC del usuario.
 */
export function filterModulesByRole(registry: ModuleDefinition[], role: Role): ModuleDefinition[] {
  return registry.filter((mod) => {
    if (!mod.requiredRoles || mod.requiredRoles.length === 0) {
      return true;
    }
    return mod.requiredRoles.includes(role);
  });
}

/**
 * Filtra los módulos y sub-items de navegación según las capacidades efectivas devueltas por el backend.
 */
export function filterNavigationByCapabilities(
  registry: ModuleDefinition[],
  capabilities?: EffectiveCapabilities,
  fallbackRole?: Role
): ModuleDefinition[] {
  if (!capabilities) {
    return filterModulesByRole(registry, fallbackRole || 'OWNER');
  }

  return registry
    .filter((mod) => {
      // 1. Backend visibleModules whitelist check
      if (capabilities.visibleModules && capabilities.visibleModules.length > 0) {
        if (!capabilities.visibleModules.includes(mod.id)) {
          return false;
        }
      }

      // 2. Custom visibility rule
      if (mod.visibilityRule && !mod.visibilityRule(capabilities)) {
        return false;
      }

      // 3. Required capability
      if (
        mod.requiredCapability &&
        !capabilities.contractedCapabilities?.includes(mod.requiredCapability)
      ) {
        return false;
      }

      // 4. Required permission
      if (
        mod.requiredPermission &&
        !capabilities.permissions?.includes(mod.requiredPermission)
      ) {
        return false;
      }

      // 5. Role restrictions
      if (mod.requiredRoles && !mod.requiredRoles.includes(capabilities.role)) {
        return false;
      }

      return true;
    })
    .map((mod) => {
      if (!mod.subItems) return mod;
      const filteredSubs = mod.subItems.filter((sub) => {
        if (sub.visibilityRule && !sub.visibilityRule(capabilities)) {
          return false;
        }
        if (
          sub.requiredCapability &&
          !capabilities.contractedCapabilities?.includes(sub.requiredCapability)
        ) {
          return false;
        }
        if (
          sub.requiredPermission &&
          !capabilities.permissions?.includes(sub.requiredPermission)
        ) {
          return false;
        }
        if (sub.requiredRoles && !sub.requiredRoles.includes(capabilities.role)) {
          return false;
        }
        return true;
      });

      return {
        ...mod,
        subItems: filteredSubs,
      };
    });
}
