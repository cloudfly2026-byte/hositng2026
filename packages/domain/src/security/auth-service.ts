import { Role, AuthTokens } from '@cloudfly/contracts';
import { IPasswordHasher, JwtSecurityService } from './password-hasher';
import { CustomerUser, CustomerOrganization, DuplicateEmailError, InvalidVerificationTokenError } from '../commerce/onboarding-order';
import { Membership } from '../identity/rbac';
import { IUnitOfWork } from '../repositories/interfaces';

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password.');
    this.name = 'InvalidCredentialsError';
  }
}

export class SessionRevokedError extends Error {
  constructor() {
    super('The session is expired, revoked, or invalid.');
    this.name = 'SessionRevokedError';
  }
}

export class InvalidResetTokenError extends Error {
  constructor() {
    super('The password reset token is invalid or has expired.');
    this.name = 'InvalidResetTokenError';
  }
}

export interface StoredUser extends CustomerUser {
  passwordHash: string;
  isOperator: boolean;
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  organizationName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthSession {
  sessionId: string;
  userId: string;
  organizationId: string;
  refreshToken: string;
  roles: Role[];
  isOperator: boolean;
  createdAt: Date;
  expiresAt: Date;
}

export interface AuthResult {
  user: CustomerUser;
  organization: CustomerOrganization;
  verificationToken?: string;
  tokens: AuthTokens;
}

export class AuthenticationService {
  private users: Map<string, StoredUser> = new Map(); // userId -> StoredUser
  private organizations: Map<string, CustomerOrganization> = new Map(); // orgId -> CustomerOrganization
  private memberships: Map<string, Membership> = new Map(); // membershipId -> Membership
  private sessions: Map<string, AuthSession> = new Map(); // refreshToken -> AuthSession
  private verificationTokens: Map<string, string> = new Map(); // userId -> token
  private resetTokens: Map<string, { userId: string; expiresAt: Date }> = new Map(); // token -> { userId, expiresAt }

  constructor(
    private readonly passwordHasher: IPasswordHasher,
    private readonly jwtService: JwtSecurityService,
    private readonly uow?: IUnitOfWork
  ) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const normalizedEmail = input.email.toLowerCase().trim();

    // Check duplicate
    const existing = Array.from(this.users.values()).find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );
    if (existing) {
      throw new DuplicateEmailError(normalizedEmail);
    }

    if (!input.password || input.password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const user: StoredUser = {
      id: userId,
      email: normalizedEmail,
      fullName: input.fullName.trim(),
      emailVerified: false,
      isOperator: false,
      passwordHash,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);

    const orgId = `org-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const slug = input.organizationName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const organization: CustomerOrganization = {
      id: orgId,
      name: input.organizationName.trim(),
      slug,
      ownerUserId: user.id,
      createdAt: new Date(),
    };
    this.organizations.set(organization.id, organization);

    const membershipId = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const membership: Membership = {
      id: membershipId,
      userId: user.id,
      organizationId: organization.id,
      role: 'OWNER',
      createdAt: new Date(),
    };
    this.memberships.set(membership.id, membership);

    if (this.uow) {
      await this.uow.users.save({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        emailVerified: user.emailVerified,
        passwordHash: user.passwordHash,
        createdAt: user.createdAt,
      });
      await this.uow.organizations.save(organization);
      await this.uow.memberships.save(membership);
    }

    const verificationToken = `vt-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
    this.verificationTokens.set(user.id, verificationToken);

    const tokens = this.issueTokens(user, organization.id, ['OWNER']);

    return {
      user: this.sanitizeUser(user),
      organization,
      verificationToken,
      tokens,
    };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const normalizedEmail = input.email.toLowerCase().trim();
    let user = Array.from(this.users.values()).find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );

    if (!user && this.uow) {
      const persistedUser = await this.uow.users.findByEmail(normalizedEmail);
      if (persistedUser && persistedUser.passwordHash) {
        user = {
          ...persistedUser,
          passwordHash: persistedUser.passwordHash,
          isOperator: false,
        };
        this.users.set(user.id, user);

        const orgs = await this.uow.organizations.listByUser(user.id);
        for (const org of orgs) {
          this.organizations.set(org.id, org);
          const mem = await this.uow.memberships.findByUserAndOrg(user.id, org.id);
          if (mem) {
            this.memberships.set(mem.id, mem);
          }
        }
      }
    }

    if (!user) {
      throw new InvalidCredentialsError();
    }

    const validPassword = await this.passwordHasher.verify(input.password, user.passwordHash);
    if (!validPassword) {
      throw new InvalidCredentialsError();
    }

    // Find organization and memberships
    const userMemberships = Array.from(this.memberships.values()).filter(
      (m) => m.userId === user.id
    );

    let orgId = '';
    let roles: Role[] = ['VIEWER'];

    if (userMemberships.length > 0) {
      const primaryMembership = userMemberships[0];
      orgId = primaryMembership.organizationId;
      roles = [primaryMembership.role];
    }

    const organization = this.organizations.get(orgId) || {
      id: orgId || 'org-none',
      name: 'Default Org',
      slug: 'default-org',
      ownerUserId: user.id,
      createdAt: new Date(),
    };

    const tokens = this.issueTokens(user, orgId, roles);

    return {
      user: this.sanitizeUser(user),
      organization,
      tokens,
    };
  }

  async verifyEmail(userId: string, token: string): Promise<CustomerUser> {
    const expectedToken = this.verificationTokens.get(userId);
    if (!expectedToken || expectedToken !== token) {
      throw new InvalidVerificationTokenError();
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User '${userId}' not found.`);
    }

    user.emailVerified = true;
    this.verificationTokens.delete(userId);
    return this.sanitizeUser(user);
  }

  async refreshToken(oldRefreshToken: string): Promise<AuthTokens> {
    const session = this.sessions.get(oldRefreshToken);
    if (!session || new Date() > session.expiresAt) {
      if (session) this.sessions.delete(oldRefreshToken);
      throw new SessionRevokedError();
    }

    const user = this.users.get(session.userId);
    if (!user) {
      this.sessions.delete(oldRefreshToken);
      throw new SessionRevokedError();
    }

    // Invalidate old refresh token (Token Rotation)
    this.sessions.delete(oldRefreshToken);

    // Issue new pair
    return this.issueTokens(user, session.organizationId, session.roles);
  }

  async revokeSession(refreshToken: string): Promise<{ success: boolean }> {
    this.sessions.delete(refreshToken);
    return { success: true };
  }

  async forgotPassword(email: string): Promise<{ resetToken: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = Array.from(this.users.values()).find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );

    // Security practice: Return token if user exists, without throwing to avoid email enumeration
    const resetToken = `prt-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
    if (user) {
      const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour
      this.resetTokens.set(resetToken, { userId: user.id, expiresAt });
    }

    return { resetToken };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
    const entry = this.resetTokens.get(token);
    if (!entry || new Date() > entry.expiresAt) {
      if (entry) this.resetTokens.delete(token);
      throw new InvalidResetTokenError();
    }

    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    const user = this.users.get(entry.userId);
    if (!user) {
      this.resetTokens.delete(token);
      throw new InvalidResetTokenError();
    }

    user.passwordHash = await this.passwordHasher.hash(newPassword);
    this.resetTokens.delete(token);

    // Invalidate all active sessions for this user on password reset
    for (const [rToken, sess] of this.sessions.entries()) {
      if (sess.userId === user.id) {
        this.sessions.delete(rToken);
      }
    }

    return { success: true };
  }

  async createOperator(input: { email: string; password: string; fullName: string }): Promise<AuthResult> {
    const normalizedEmail = input.email.toLowerCase().trim();
    const passwordHash = await this.passwordHasher.hash(input.password);
    const userId = `usr-op-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const user: StoredUser = {
      id: userId,
      email: normalizedEmail,
      fullName: input.fullName.trim(),
      emailVerified: true,
      isOperator: true,
      passwordHash,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);

    const operatorOrg: CustomerOrganization = {
      id: 'org-velupi-internal',
      name: 'Velupi Platform Operator',
      slug: 'org-velupi-internal',
      ownerUserId: user.id,
      createdAt: new Date(),
    };
    this.organizations.set(operatorOrg.id, operatorOrg);

    const tokens = this.issueTokens(user, operatorOrg.id, ['OWNER']);

    return {
      user: this.sanitizeUser(user),
      organization: operatorOrg,
      tokens,
    };
  }

  getUserById(userId: string): CustomerUser | undefined {
    const user = this.users.get(userId);
    return user ? this.sanitizeUser(user) : undefined;
  }

  private issueTokens(user: StoredUser, organizationId: string, roles: Role[]): AuthTokens {
    const expiresIn = 900; // 15 mins
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        organizationId,
        roles,
        isOperator: user.isOperator,
      },
      expiresIn
    );

    const refreshToken = `rft-${Date.now()}-${Math.random().toString(36).substring(2, 18)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7 days

    this.sessions.set(refreshToken, {
      sessionId: `sess-${Date.now()}`,
      userId: user.id,
      organizationId,
      refreshToken,
      roles,
      isOperator: user.isOperator,
      createdAt: new Date(),
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn,
      tokenType: 'Bearer',
    };
  }

  private sanitizeUser(user: StoredUser): CustomerUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  }
}
