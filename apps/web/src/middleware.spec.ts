import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { middleware } from './middleware';

function createMockRequest(
  urlPath: string,
  options?: {
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
  }
) {
  const url = `https://app.velupi.com${urlPath}`;
  const cookiesMap = new Map<string, string>(Object.entries(options?.cookies || {}));

  return {
    url,
    nextUrl: new URL(url),
    cookies: {
      get: (name: string) => (cookiesMap.has(name) ? { value: cookiesMap.get(name)! } : undefined),
      has: (name: string) => cookiesMap.has(name),
    },
    headers: {
      get: (name: string) => options?.headers?.[name.toLowerCase()] || null,
    },
  } as any;
}

const JWT_SECRET = process.env.JWT_SECRET || 'velupi_jwt_secure_key_2026_super_secret';

function createTestJwt(
  expSecondsFromNow: number = 3600,
  sub: string = 'usr-123',
  tamperSignature: boolean = false,
  secret: string = JWT_SECRET
) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + expSecondsFromNow;
  const payload = Buffer.from(
    JSON.stringify({
      sub,
      email: 'test@velupi.com',
      organizationId: 'org-1',
      roles: ['OWNER'],
      exp,
    })
  ).toString('base64url');

  let signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');

  if (tamperSignature) {
    signature = signature.substring(0, signature.length - 4) + 'zzzz';
  }

  return `${header}.${payload}.${signature}`;
}

describe('Next.js Middleware — Global Route Protection & Session Validation (TDD)', () => {
  it('allows public static assets without interception', async () => {
    const req = createMockRequest('/_next/static/chunks/main.js');
    const res = await middleware(req);
    expect(res.headers.get('location')).toBeNull();
  });

  it('allows public routes (/cart, /checkout, /login, /register) for anonymous visitors', async () => {
    const publicPaths = ['/cart', '/checkout', '/login', '/register', '/forgot-password', '/reset-password'];
    for (const path of publicPaths) {
      const req = createMockRequest(path);
      const res = await middleware(req);
      expect(res.headers.get('location')).toBeNull();
    }
  });

  it('redirects anonymous access to private route (/dashboard) to /login with returnTo', async () => {
    const req = createMockRequest('/dashboard');
    const res = await middleware(req);
    const location = res.headers.get('location');
    expect(location).toContain('/login?returnTo=%2Fdashboard');
  });

  it('redirects anonymous access to /orders and /orders/ord-123 to /login', async () => {
    const req = createMockRequest('/orders/ord-123');
    const res = await middleware(req);
    const location = res.headers.get('location');
    expect(location).toContain('/login?returnTo=%2Forders%2Ford-123');
  });

  it('strictly rejects bogus/malformed cookie and clears invalid cookie', async () => {
    const req = createMockRequest('/hosting', {
      cookies: {
        velupi_session: 'bogus-cookie-value-not-jwt',
      },
    });

    const res = await middleware(req);
    const location = res.headers.get('location');
    expect(location).toContain('/login?returnTo=%2Fhosting');
    // Cookie must be deleted in the response
    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toContain('velupi_session=');
  });

  it('strictly rejects expired JWT token and clears expired cookies', async () => {
    const expiredJwt = createTestJwt(-300); // Expired 5 minutes ago
    const req = createMockRequest('/billing', {
      cookies: {
        velupi_access_token: expiredJwt,
      },
    });

    const res = await middleware(req);
    const location = res.headers.get('location');
    expect(location).toContain('/login?returnTo=%2Fbilling');
    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toContain('velupi_access_token=');
  });

  it('strictly rejects JWT with modified/forged signature even if payload is valid', async () => {
    // Valid unexpired payload, but signature tampered
    const forgedJwt = createTestJwt(3600, 'usr-victim', true);
    const req = createMockRequest('/dashboard', {
      cookies: {
        velupi_session: forgedJwt,
      },
    });

    const res = await middleware(req);
    const location = res.headers.get('location');
    expect(location).toContain('/login?returnTo=%2Fdashboard');
    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toContain('velupi_session=');
  });

  it('strictly rejects fabricated JWT signed with untrusted secret', async () => {
    const rogueJwt = createTestJwt(3600, 'usr-hacker', false, 'rogue_attacker_secret_key');
    const req = createMockRequest('/apps', {
      cookies: {
        velupi_session: rogueJwt,
      },
    });

    const res = await middleware(req);
    const location = res.headers.get('location');
    expect(location).toContain('/login?returnTo=%2Fapps');
    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toContain('velupi_session=');
  });

  it('allows access to private routes when token is cryptographically valid and unexpired', async () => {
    const validJwt = createTestJwt(3600); // Valid for 1 hour
    const req = createMockRequest('/databases', {
      cookies: {
        velupi_session: validJwt,
      },
    });

    const res = await middleware(req);
    expect(res.headers.get('location')).toBeNull();
  });

  it('redirects authenticated user with valid token visiting /login to dashboard', async () => {
    const validJwt = createTestJwt(3600);
    const req = createMockRequest('/login', {
      cookies: {
        velupi_session: validJwt,
      },
    });

    const res = await middleware(req);
    const location = res.headers.get('location');
    expect(location).toBe('https://app.velupi.com/');
  });

  it('allows user with expired token to stay on /login so they can authenticate', async () => {
    const expiredJwt = createTestJwt(-100);
    const req = createMockRequest('/login', {
      cookies: {
        velupi_session: expiredJwt,
      },
    });

    const res = await middleware(req);
    expect(res.headers.get('location')).toBeNull();
  });
});
