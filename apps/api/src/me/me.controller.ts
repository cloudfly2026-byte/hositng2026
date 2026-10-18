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
}
