import { JwtSecurityService } from '@cloudfly/domain';
import { Role } from '@cloudfly/contracts';

const JWT_SECRET = process.env.JWT_SECRET || 'velupi_jwt_secure_key_2026_super_secret';
const jwtService = new JwtSecurityService(JWT_SECRET);

export interface MockUserContext {
  userId: string;
  email: string;
  organizationId: string;
  role: Role;
  isOperator?: boolean;
}

export function generateTestAuthToken(context: MockUserContext, expiresInSeconds = 3600): string {
  return jwtService.sign(
    {
      sub: context.userId,
      email: context.email,
      organizationId: context.organizationId,
      roles: [context.role],
      isOperator: context.isOperator ?? false,
    },
    expiresInSeconds
  );
}

export async function safeGoto(page: any, url: string, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      return;
    } catch (err: any) {
      if (attempt === retries || !err?.message?.includes('ERR_NETWORK_CHANGED')) {
        throw err;
      }
      await page.waitForTimeout(500);
    }
  }
}

export const TEST_USERS: Record<Role | 'SUPER_ADMIN' | 'OPERATOR' | 'SUPPORT', MockUserContext> = {
  SUPER_ADMIN: {
    userId: 'usr-superadmin-01',
    email: 'superadmin@velupi.com',
    organizationId: 'org-platform',
    role: 'OWNER',
    isOperator: true,
  },
  OPERATOR: {
    userId: 'usr-operator-01',
    email: 'operator@velupi.com',
    organizationId: 'org-platform',
    role: 'ADMIN',
    isOperator: true,
  },
  SUPPORT: {
    userId: 'usr-support-01',
    email: 'support@velupi.com',
    organizationId: 'org-platform',
    role: 'VIEWER',
    isOperator: true,
  },
  OWNER: {
    userId: 'usr-owner-01',
    email: 'owner@tenant-alpha.com',
    organizationId: 'org-tenant-alpha',
    role: 'OWNER',
    isOperator: false,
  },
  ADMIN: {
    userId: 'usr-admin-01',
    email: 'admin@tenant-alpha.com',
    organizationId: 'org-tenant-alpha',
    role: 'ADMIN',
    isOperator: false,
  },
  DEVELOPER: {
    userId: 'usr-dev-01',
    email: 'dev@tenant-alpha.com',
    organizationId: 'org-tenant-alpha',
    role: 'DEVELOPER',
    isOperator: false,
  },
  VIEWER: {
    userId: 'usr-viewer-01',
    email: 'viewer@tenant-alpha.com',
    organizationId: 'org-tenant-alpha',
    role: 'VIEWER',
    isOperator: false,
  },
};
