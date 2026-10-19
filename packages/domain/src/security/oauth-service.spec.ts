import { describe, it, expect, beforeEach } from 'vitest';
import {
  OAuthService,
  validateReturnTo,
  OAuthProviderType,
} from './oauth-service';
import { AuthenticationService } from './auth-service';
import { Argon2PasswordHasher, JwtSecurityService } from './password-hasher';

describe('OAuthService (Social Authentication & Security)', () => {
  let authService: AuthenticationService;
  let oauthService: OAuthService;
  let jwtService: JwtSecurityService;

  beforeEach(() => {
    const hasher = new Argon2PasswordHasher();
    jwtService = new JwtSecurityService('velupi_test_jwt_secret_super_secure_2026');
    authService = new AuthenticationService(hasher, jwtService);
    oauthService = new OAuthService(authService);
  });

  describe('Open Redirect Protection (validateReturnTo)', () => {
    it('allows valid internal relative paths', () => {
      expect(validateReturnTo('/checkout?cartId=123')).toBe('/checkout?cartId=123');
      expect(validateReturnTo('/cart?plan=wp-starter')).toBe('/cart?plan=wp-starter');
      expect(validateReturnTo('/dashboard')).toBe('/dashboard');
    });

    it('sanitizes and rejects external open redirect attempts, defaulting to /', () => {
      expect(validateReturnTo('https://malicious-site.com')).toBe('/');
      expect(validateReturnTo('http://evil.com/phishing')).toBe('/');
      expect(validateReturnTo('//attacker.com/steal')).toBe('/');
      expect(validateReturnTo('/\\evil.com')).toBe('/');
      expect(validateReturnTo('javascript:alert(1)')).toBe('/');
      expect(validateReturnTo('/login')).toBe('/');
      expect(validateReturnTo('/login?returnTo=%2F')).toBe('/');
      expect(validateReturnTo('/register')).toBe('/');
      expect(validateReturnTo(undefined)).toBe('/');
      expect(validateReturnTo('')).toBe('/');
    });
  });

  describe('OAuth Flow Initiation with PKCE & State', () => {
    it('generates PKCE code challenge and cryptographically secure state for Google', () => {
      const initiation = oauthService.initiateOAuthFlow(
        OAuthProviderType.GOOGLE,
        '/checkout?cartId=cart-abc'
      );

      expect(initiation.provider).toBe(OAuthProviderType.GOOGLE);
      expect(initiation.state).toBeDefined();
      expect(initiation.codeChallenge).toBeDefined();
      expect(initiation.authorizationUrl).toContain('accounts.google.com/o/oauth2/v2/auth');
      expect(initiation.authorizationUrl).toContain(encodeURIComponent(initiation.state));
      expect(initiation.authorizationUrl).toContain('code_challenge=');
    });

    it('generates state and authorization URL for GitHub', () => {
      const initiation = oauthService.initiateOAuthFlow(
        OAuthProviderType.GITHUB,
        '/cart'
      );

      expect(initiation.provider).toBe(OAuthProviderType.GITHUB);
      expect(initiation.state).toBeDefined();
      expect(initiation.authorizationUrl).toContain('github.com/login/oauth/authorize');
      expect(initiation.authorizationUrl).toContain('scope=user%3Aemail');
    });
  });

  describe('OAuth Callback & Identity Linkage Rules', () => {
    it('creates new user, organization and returns session tokens for first-time social login', async () => {
      const initiation = oauthService.initiateOAuthFlow(
        OAuthProviderType.GOOGLE,
        '/checkout?cartId=cart-1'
      );

      const callbackResult = await oauthService.handleOAuthCallback({
        provider: OAuthProviderType.GOOGLE,
        code: 'mock-google-auth-code',
        state: initiation.state,
        profile: {
          providerSubject: 'google-sub-1001',
          email: 'maria.torres@empresa.co',
          fullName: 'María Torres',
        },
      });

      expect(callbackResult.returnTo).toBe('/checkout?cartId=cart-1');
      expect(callbackResult.user.email).toBe('maria.torres@empresa.co');
      expect(callbackResult.tokens.accessToken).toBeDefined();
      expect(callbackResult.organization).toBeDefined();
    });

    it('authenticates returning user with existing OAuthIdentity without creating duplicate records', async () => {
      const initiation1 = oauthService.initiateOAuthFlow(OAuthProviderType.GOOGLE, '/');
      const first = await oauthService.handleOAuthCallback({
        provider: OAuthProviderType.GOOGLE,
        code: 'code-1',
        state: initiation1.state,
        profile: {
          providerSubject: 'google-sub-2002',
          email: 'dev@innovatech.co',
          fullName: 'Dev InnovaTech',
        },
      });

      const initiation2 = oauthService.initiateOAuthFlow(OAuthProviderType.GOOGLE, '/checkout');
      const second = await oauthService.handleOAuthCallback({
        provider: OAuthProviderType.GOOGLE,
        code: 'code-2',
        state: initiation2.state,
        profile: {
          providerSubject: 'google-sub-2002',
          email: 'dev@innovatech.co',
          fullName: 'Dev InnovaTech',
        },
      });

      expect(second.user.id).toBe(first.user.id);
      expect(second.organization.id).toBe(first.organization.id);
    });

    it('seamlessly logs in and links OAuth identity when verified email matches existing account', async () => {
      // 1. Existing user registered with password
      await authService.register({
        email: 'ceo@mycompany.com',
        password: 'PasswordOriginal123!',
        fullName: 'CEO Original',
        organizationName: 'My Company SAS',
      });

      // 2. User logs in with Google using their verified email
      const initiation = oauthService.initiateOAuthFlow(OAuthProviderType.GOOGLE, '/');

      const result = await oauthService.handleOAuthCallback({
        provider: OAuthProviderType.GOOGLE,
        code: 'google-code-123',
        state: initiation.state,
        profile: {
          providerSubject: 'google-sub-ceo-123',
          email: 'ceo@mycompany.com',
          fullName: 'CEO Original',
        },
      });

      expect(result.user.email).toBe('ceo@mycompany.com');
      expect(result.tokens.accessToken).toBeDefined();
    });

    it('rejects callback with invalid or expired state token (anti-CSRF protection)', async () => {
      await expect(
        oauthService.handleOAuthCallback({
          provider: OAuthProviderType.GOOGLE,
          code: 'some-code',
          state: 'tampered-or-expired-state',
          profile: {
            providerSubject: 'sub-1',
            email: 'test@example.com',
            fullName: 'Test User',
          },
        })
      ).rejects.toThrow('Invalid or expired OAuth state parameter.');
    });
  });
});
