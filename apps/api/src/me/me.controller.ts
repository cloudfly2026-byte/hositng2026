import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
  UnauthorizedException,
  Optional,
} from '@nestjs/common';
import {
  AccessPolicyService,
  SubscriptionService,
  AuthenticationService,
} from '@cloudfly/domain';
import { EffectiveCapabilities, Role } from '@cloudfly/contracts';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(
    private readonly accessPolicyService: AccessPolicyService,
    @Optional() private readonly subscriptionService?: SubscriptionService,
    @Optional() private readonly authService?: AuthenticationService
  ) {}

  @Get('capabilities')
  async getCapabilities(
    @Req() req: any,
    @Query('organizationId') queryOrgId?: string
  ): Promise<EffectiveCapabilities> {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('Unauthenticated: User session missing.');
    }

    // Platform operator check
    if (user.isOperator) {
      return this.accessPolicyService.getEffectiveCapabilities({
        userId: user.userId,
        organization: {
          id: queryOrgId || user.organizationId || 'org-velupi-internal',
          name: 'Velupi Platform Operator',
          slug: 'org-velupi-internal',
          isInternalPilot: true,
        },
        role: (user.roles?.[0] as Role) || 'SUPER_ADMIN',
        isOperator: true,
      });
    }

    // Tenant Organization Context
    const targetOrgId = queryOrgId || user.organizationId;
    if (!targetOrgId) {
      throw new ForbiddenException('Organization context could not be determined.');
    }

    // Verify user belongs to the requested organization and query authoritative membership
    let role: Role = (user.roles?.[0] as Role) || 'VIEWER';

    if (this.authService) {
      const membership = await this.authService.getMembership(user.userId, targetOrgId);
      if (membership) {
        role = membership.role;
      } else if (user.organizationId !== targetOrgId) {
        throw new ForbiddenException(
          `Cross-tenant violation: user '${user.userId}' has no active membership in organization '${targetOrgId}'.`
        );
      }
    } else {
      if (user.organizationId && user.organizationId !== targetOrgId) {
        throw new ForbiddenException(
          `Cross-tenant violation: user organization '${user.organizationId}' cannot query capabilities for '${targetOrgId}'.`
        );
      }
    }

    // Retrieve active subscriptions for the target organization
    const subscriptions = this.subscriptionService
      ? this.subscriptionService.getSubscriptionsByOrganization(targetOrgId).map((s) => ({
          status: s.status,
          planCode: s.planVersionId,
          planVersionId: s.planVersionId,
        }))
      : [];

    const organization = {
      id: targetOrgId,
      name: targetOrgId === 'org-velupi-internal' ? 'Velupi Cloud Pilot' : `Organization ${targetOrgId}`,
      slug: targetOrgId,
      isInternalPilot: targetOrgId === 'org-velupi-internal',
    };

    return this.accessPolicyService.getEffectiveCapabilities({
      userId: user.userId,
      organization,
      role,
      subscriptions,
      isOperator: false,
    });
  }

  @Get()
  async getProfile(@Req() req: any) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('User not authenticated.');
    }

    let fullUser = null;
    if (this.authService) {
      fullUser = this.authService.getUserById(user.userId);
    }

    return {
      userId: user.userId,
      email: user.email,
      fullName: fullUser?.fullName || user.email?.split('@')[0] || 'User',
      organizationId: user.organizationId,
      roles: user.roles,
      permissions: user.permissions,
      isOperator: user.isOperator ?? false,
    };
  }

  @Get('destination')
  async getPostLoginDestination(
    @Req() req: any,
    @Query('cartId') cartId?: string
  ): Promise<{ destination: string; reason: string }> {
    const user = req.user;
    if (!user) {
      return { destination: '/login', reason: 'UNAUTHENTICATED' };
    }

    // 1. Operators & platform admins
    if (user.isOperator || user.roles?.includes('SUPER_ADMIN') || user.roles?.includes('OPERATOR')) {
      return { destination: '/', reason: 'PLATFORM_OPERATOR' };
    }

    // 2. Explicit cart in progress
    if (cartId) {
      return { destination: `/checkout?cartId=${encodeURIComponent(cartId)}`, reason: 'CART_IN_PROGRESS' };
    }

    const orgId = user.organizationId;
    if (!orgId) {
      return { destination: '/cart', reason: 'NO_ORGANIZATION' };
    }

    // 3. Subscriptions check
    const subs = this.subscriptionService?.getSubscriptionsByOrganization(orgId) || [];
    const activeSub = subs.find((s) => s.status === 'ACTIVE' || s.status === 'TRIALING');
    if (activeSub) {
      return { destination: '/', reason: 'ACTIVE_SUBSCRIPTION' };
    }

    const suspendedOrGrace = subs.find(
      (s) => s.status === 'SUSPENDED' || s.status === 'GRACE_PERIOD' || s.status === 'PAST_DUE'
    );
    if (suspendedOrGrace) {
      return { destination: '/billing', reason: 'REGULARIZATION_REQUIRED' };
    }

    // 4. Default for customers without active services or orders
    return { destination: '/cart', reason: 'NEW_CYCLE_EXPLORATION' };
  }
}
