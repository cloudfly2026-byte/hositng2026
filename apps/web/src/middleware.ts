import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/cart',
  '/checkout',
];

const JWT_SECRET = process.env.JWT_SECRET || 'velupi_jwt_secure_key_2026_super_secret';

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Validates JWT structure, cryptographic HMAC SHA-256 signature, and expiration in Edge runtime.
 * Never considers a session authenticated simply because a JWT can be decoded.
 */
export async function isTokenValid(token: string | null | undefined): Promise<boolean> {
  if (!token || typeof token !== 'string') return false;

  const cleanToken = token.startsWith('Bearer ') ? token.substring(7).trim() : token.trim();
  const parts = cleanToken.split('.');
  if (parts.length !== 3) return false;

  const [headerB64, payloadB64, signatureB64] = parts;

  try {
    // 1. Decode & validate payload structure and expiration
    const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const payload = JSON.parse(raw);

    if (!payload || typeof payload !== 'object') return false;

    const nowSec = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
      return false; // Token expired
    }

    if (!payload.sub && !payload.userId) {
      return false; // Missing subject identity
    }

    // 2. Cryptographic signature verification using Web Crypto API (SubtleCrypto)
    const encoder = new TextEncoder();
    const dataToVerify = encoder.encode(`${headerB64}.${payloadB64}`);
    const signatureBytes = base64UrlToUint8Array(signatureB64);
    const keyData = encoder.encode(JWT_SECRET);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const isSignatureLegit = await crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      signatureBytes as unknown as BufferSource,
      dataToVerify as unknown as BufferSource
    );

    return isSignatureLegit;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public static assets and callbacks
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/images') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // 2. Read session from secure cookies or authorization header
  const rawToken =
    request.cookies.get('velupi_session')?.value ||
    request.cookies.get('velupi_access_token')?.value ||
    request.headers.get('authorization');

  const hasValidSession = await isTokenValid(rawToken);

  // 3. Unauthenticated access to private route -> redirect to login with safe returnTo and clear invalid cookies
  if (!hasValidSession && !isPublicRoute) {
    const returnTo =
      pathname.startsWith('/') && !pathname.startsWith('//') ? pathname : '/';
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnTo', returnTo);

    const response = NextResponse.redirect(loginUrl);
    if (request.cookies.has('velupi_session')) {
      response.cookies.delete('velupi_session');
    }
    if (request.cookies.has('velupi_access_token')) {
      response.cookies.delete('velupi_access_token');
    }
    return response;
  }

  // 4. Authenticated user with valid session visiting login/register -> redirect to destination or dashboard
  if (hasValidSession && (pathname === '/login' || pathname === '/register')) {
    const returnTo = request.nextUrl.searchParams.get('returnTo') || '/';
    const safeReturnTo =
      returnTo.startsWith('/') &&
      !returnTo.startsWith('//') &&
      returnTo !== '/login' &&
      returnTo !== '/register' &&
      !returnTo.startsWith('/login?') &&
      !returnTo.startsWith('/register?')
        ? returnTo
        : '/';
    return NextResponse.redirect(new URL(safeReturnTo, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
