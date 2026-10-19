import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { AuthenticationService } from './auth-service';
import { AuthTokens } from '@cloudfly/contracts';
import { CustomerUser, CustomerOrganization } from '../commerce/onboarding-order';

export enum OAuthProviderType {
  GOOGLE = 'GOOGLE',
  GITHUB = 'GITHUB',
}

export interface OAuthIdentity {
  id: string;
  userId: string;
  provider: OAuthProviderType;
  providerSubject: string;
  email: string;
  createdAt: Date;
}

export interface OAuthStateRecord {
  state: string;
  provider: OAuthProviderType;
  returnTo: string;
  codeVerifier?: string;
  expiresAt: Date;
}

export interface OAuthInitiationResult {
  provider: OAuthProviderType;
  state: string;
  codeChallenge?: string;
  authorizationUrl: string;
}

export interface OAuthProfile {
  providerSubject: string;
  email: string;
  fullName: string;
}

export interface OAuthCallbackInput {
  provider: OAuthProviderType;
  code: string;
  state: string;
  profile: OAuthProfile;
}

export interface OAuthCallbackResult {
  user: CustomerUser;
  organization: CustomerOrganization;
  tokens: AuthTokens;
  returnTo: string;
}

export function validateReturnTo(url?: string): string {
  if (!url || typeof url !== 'string') {
    return '/';
  }

  // Must begin with single forward slash
  if (!url.startsWith('/')) {
    return '/';
  }

  // Prevent protocol-relative URLs (e.g. //evil.com) and backslash bypass (/ \evil.com)
  if (url.startsWith('//') || url.startsWith('/\\')) {
    return '/';
  }

  // Prevent redirect loop back to login or register
  if (
    url === '/login' ||
    url === '/register' ||
    url.startsWith('/login?') ||
    url.startsWith('/register?')
  ) {
    return '/';
  }

  return url;
}

export class OAuthService {
  private activeStates: Map<string, OAuthStateRecord> = new Map();
  private identities: Map<string, OAuthIdentity> = new Map();

  constructor(
    private readonly authService: AuthenticationService,
    private readonly config?: {
      googleClientId?: string;
      googleRedirectUri?: string;
      githubClientId?: string;
      githubRedirectUri?: string;
      stateTtlMs?: number;
    }
  ) {}

  initiateOAuthFlow(provider: OAuthProviderType, returnTo?: string): OAuthInitiationResult {
    const validatedReturnTo = validateReturnTo(returnTo);
    const state = randomBytes(24).toString('hex');
    const ttlMs = this.config?.stateTtlMs ?? 10 * 60 * 1000; // 10 minutes

    let codeVerifier: string | undefined;
    let codeChallenge: string | undefined;
    let authorizationUrl = '';

    if (provider === OAuthProviderType.GOOGLE) {
      // PKCE for Google OIDC
      codeVerifier = randomBytes(32).toString('base64url');
      codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

      const clientId = this.config?.googleClientId || 'velupi-google-client-id';
      const redirectUri = this.config?.googleRedirectUri || 'https://api.velupi.com/auth/oauth/google/callback';

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        access_type: 'online',
        prompt: 'select_account',
      });

      authorizationUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    } else if (provider === OAuthProviderType.GITHUB) {
      const clientId = this.config?.githubClientId || 'velupi-github-client-id';
      const redirectUri = this.config?.githubRedirectUri || 'https://api.velupi.com/auth/oauth/github/callback';

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'user:email',
        state,
      });

      authorizationUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    }

    this.activeStates.set(state, {
      state,
      provider,
      returnTo: validatedReturnTo,
      codeVerifier,
      expiresAt: new Date(Date.now() + ttlMs),
    });

    return {
      provider,
      state,
      codeChallenge,
      authorizationUrl,
    };
  }

  getStateRecord(state: string): OAuthStateRecord | undefined {
    return this.activeStates.get(state);
  }

  async handleOAuthCallback(input: OAuthCallbackInput): Promise<OAuthCallbackResult> {
    const stateRecord = this.activeStates.get(input.state);
    if (!stateRecord || stateRecord.expiresAt.getTime() < Date.now()) {
      throw new Error('Invalid or expired OAuth state parameter.');
    }

    if (stateRecord.provider !== input.provider) {
      throw new Error('OAuth provider mismatch with state token.');
    }

    // Clean up consumed state token
    this.activeStates.delete(input.state);

    const identityKey = `${input.provider}:${input.profile.providerSubject}`;
    const existingIdentity = this.identities.get(identityKey);

    if (existingIdentity) {
      // Returning user via existing linked OAuthIdentity
      const user = await this.findUserById(existingIdentity.userId);
      if (user) {
        const organization = await this.findFirstOrganizationForUser(user.id);
        const tokens = await this.generateSessionTokens(user, organization);

        return {
          user,
          organization,
          tokens,
          returnTo: stateRecord.returnTo,
        };
      }
      // If user was purged/deleted, drop the orphaned OAuthIdentity and proceed to fresh registration/link
      this.identities.delete(identityKey);
    }

    // Check if an account with this email already exists
    const existingUserWithEmail = await this.findUserByEmail(input.profile.email);
    if (existingUserWithEmail) {
      // Auto-link OAuth identity to existing user account and login
      const identity: OAuthIdentity = {
        id: randomUUID(),
        userId: existingUserWithEmail.id,
        provider: input.provider,
        providerSubject: input.profile.providerSubject,
        email: input.profile.email,
        createdAt: new Date(),
      };
      this.identities.set(identityKey, identity);

      const organization = await this.findFirstOrganizationForUser(existingUserWithEmail.id);
      const tokens = await this.generateSessionTokens(existingUserWithEmail, organization);

      return {
        user: existingUserWithEmail,
        organization,
        tokens,
        returnTo: stateRecord.returnTo,
      };
    }

    // First time social registration: create user, organization and link OAuthIdentity
    const randomPassword = randomBytes(24).toString('base64');
    const orgName = `${input.profile.fullName} Workspace`;

    const registerResult = await this.authService.register({
      email: input.profile.email,
      password: randomPassword,
      fullName: input.profile.fullName,
      organizationName: orgName,
    });

    // Mark email as verified since it was verified by Google / GitHub
    registerResult.user.emailVerified = true;

    // Link identity
    const identity: OAuthIdentity = {
      id: randomUUID(),
      userId: registerResult.user.id,
      provider: input.provider,
      providerSubject: input.profile.providerSubject,
      email: input.profile.email,
      createdAt: new Date(),
    };
    this.identities.set(identityKey, identity);

    return {
      user: registerResult.user,
      organization: registerResult.organization,
      tokens: registerResult.tokens,
      returnTo: stateRecord.returnTo,
    };
  }

  private async findUserByEmail(email: string): Promise<CustomerUser | undefined> {
    const anyAuth = this.authService as any;
    if (anyAuth.users && anyAuth.users instanceof Map) {
      return (Array.from(anyAuth.users.values()) as CustomerUser[]).find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );
    }
    if (anyAuth.uow) {
      const user = await anyAuth.uow.users.findByEmail(email);
      return user || undefined;
    }
    return undefined;
  }

  private async findUserById(userId: string): Promise<CustomerUser | undefined> {
    const anyAuth = this.authService as any;
    if (anyAuth.users && anyAuth.users instanceof Map) {
      return anyAuth.users.get(userId) as CustomerUser | undefined;
    }
    if (anyAuth.uow) {
      const user = await anyAuth.uow.users.findById(userId);
      return user || undefined;
    }
    return undefined;
  }

  private async findFirstOrganizationForUser(userId: string): Promise<CustomerOrganization> {
    const anyAuth = this.authService as any;
    if (anyAuth.memberships && anyAuth.organizations) {
      const mem = Array.from(anyAuth.memberships.values()).find((m: any) => m.userId === userId);
      if (mem) {
        const org = anyAuth.organizations.get((mem as any).organizationId);
        if (org) return org;
      }
    }
    if (anyAuth.uow) {
      const memberships = await anyAuth.uow.memberships.findByUserId(userId);
      if (memberships.length > 0) {
        const org = await anyAuth.uow.organizations.findById(memberships[0].organizationId);
        if (org) return org;
      }
    }
    return {
      id: `org-auto-${userId}`,
      name: 'Default Organization',
      slug: `org-${userId}`,
      ownerUserId: userId,
      createdAt: new Date(),
    };
  }

  private async generateSessionTokens(user: CustomerUser, organization: CustomerOrganization): Promise<AuthTokens> {
    const anyAuth = this.authService as any;
    if (anyAuth.jwtService) {
      const accessToken = anyAuth.jwtService.sign({
        sub: user.id,
        email: user.email,
        organizationId: organization.id,
        roles: ['OWNER'],
        permissions: ['*'],
        isOperator: false,
      });
      const refreshToken = randomBytes(40).toString('hex');
      return {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: 3600,
      };
    }
    throw new Error('JWT service not available.');
  }
}
