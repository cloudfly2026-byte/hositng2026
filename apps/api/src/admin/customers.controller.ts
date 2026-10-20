import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Inject,
  Optional,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  AuthenticationService,
  CustomerDeprovisioningService,
  HostingManagementService,
  SubscriptionService,
  IUnitOfWork,
} from '@cloudfly/domain';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlatformOperatorGuard } from '../auth/platform-operator.guard';

export interface CreateCustomerDto {
  email: string;
  fullName: string;
  organizationName: string;
  password?: string;
  planCode?: string;
}

export interface UpdateCustomerDto {
  fullName?: string;
  email?: string;
}

@Controller('admin/customers')
@UseGuards(JwtAuthGuard, PlatformOperatorGuard)
export class AdminCustomersController {
  constructor(
    private readonly authService: AuthenticationService,
    private readonly deprovisioningService: CustomerDeprovisioningService,
    @Optional() private readonly hostingService?: HostingManagementService,
    @Optional() @Inject('IUnitOfWork') private readonly uow?: IUnitOfWork,
    @Optional() private readonly subscriptionService?: SubscriptionService
  ) {}

  @Get()
  async listCustomers() {
    const customersMap = new Map<string, any>();

    // 1. Fetch from Database if available
    if (this.uow?.users?.listAll) {
      try {
        const dbUsers = await this.uow.users.listAll();
        for (const u of dbUsers) {
          customersMap.set(u.id, {
            id: u.id,
            email: u.email,
            fullName: u.fullName,
            emailVerified: u.emailVerified,
            createdAt: u.createdAt,
            organization: null,
            role: 'VIEWER',
            linkedHestiaUser: null,
            status: 'ACTIVE',
            planCode: 'web-pro',
            planName: 'Hosting Web Pro',
          });
        }
      } catch (err) {
        console.warn('[AdminCustomersController] Error querying users from DB:', err);
      }
    }

    // 2. Fetch from In-Memory AuthService
    if ((this.authService as any).users) {
      for (const [id, u] of (this.authService as any).users.entries()) {
        if (!customersMap.has(id)) {
          customersMap.set(id, {
            id: u.id,
            email: u.email,
            fullName: u.fullName,
            emailVerified: u.emailVerified,
            createdAt: u.createdAt,
            organization: null,
            role: 'VIEWER',
            linkedHestiaUser: null,
            status: 'ACTIVE',
            planCode: 'web-pro',
            planName: 'Hosting Web Pro',
          });
        }
      }
    }

    // 3. Enrich with Organization, Membership, and Subscription status
    const customerList = Array.from(customersMap.values());

    for (const c of customerList) {
      // Resolve organization
      let org = null;
      if (this.uow?.organizations?.listByUser) {
        try {
          const orgs = await this.uow.organizations.listByUser(c.id);
          if (orgs.length > 0) org = orgs[0];
        } catch {}
      }

      if (!org && (this.authService as any).organizations) {
        for (const o of (this.authService as any).organizations.values()) {
          if (o.ownerUserId === c.id) {
            org = o;
            break;
          }
        }
      }

      if (org) {
        c.organization = {
          id: org.id,
          name: org.name,
          slug: org.slug,
          isInternalPilot: org.isInternalPilot ?? false,
        };

        // Resolve membership for role and linkedHestiaUser
        let membership = null;
        if (this.uow?.memberships?.findByUserAndOrg) {
          try {
            membership = await this.uow.memberships.findByUserAndOrg(c.id, org.id);
          } catch {}
        }
        if (!membership && (this.authService as any).memberships) {
          for (const m of (this.authService as any).memberships.values()) {
            if (m.userId === c.id && m.organizationId === org.id) {
              membership = m;
              break;
            }
          }
        }

        if (membership) {
          c.role = membership.role;
          c.linkedHestiaUser = membership.linkedHestiaUser || null;
        }

        // Resolve subscription status
        if (this.subscriptionService) {
          const subs = this.subscriptionService.getSubscriptionsByOrganization(org.id);
          if (subs.length > 0) {
            const primarySub = subs[0];
            c.status = primarySub.status;
            c.planCode = primarySub.planVersionId || c.planCode;
          }
        }
      }
    }

    return {
      customers: customerList,
      total: customerList.length,
    };
  }

  @Post()
  async createCustomer(@Body() body: CreateCustomerDto) {
    if (!body.email || !body.fullName || !body.organizationName) {
      throw new BadRequestException('email, fullName y organizationName son obligatorios.');
    }

    const password = body.password || `Velupi_${Date.now()}!Aa`;
    const regResult = await this.authService.register({
      email: body.email,
      fullName: body.fullName,
      organizationName: body.organizationName,
      password,
    });

    // Mark verified
    const userInMem = (this.authService as any).users?.get(regResult.user.id);
    if (userInMem) userInMem.emailVerified = true;
    regResult.user.emailVerified = true;

    if (this.uow?.users) {
      try {
        await this.uow.users.save({
          id: regResult.user.id,
          email: regResult.user.email,
          fullName: regResult.user.fullName,
          emailVerified: true,
          passwordHash: userInMem?.passwordHash,
          createdAt: regResult.user.createdAt,
        });
      } catch {}
    }

    return {
      success: true,
      customer: {
        id: regResult.user.id,
        email: regResult.user.email,
        fullName: regResult.user.fullName,
        emailVerified: true,
        organization: regResult.organization,
        temporaryPassword: password,
      },
      message: 'Cliente creado exitosamente.',
    };
  }

  @Get(':id')
  async getCustomer(@Param('id') id: string) {
    let user: any = this.authService.getUserById(id);
    if (!user && this.uow?.users) {
      user = await this.uow.users.findById(id);
    }
    if (!user) {
      throw new NotFoundException(`Cliente con ID '${id}' no encontrado.`);
    }

    let org = null;
    if (this.uow?.organizations?.listByUser) {
      try {
        const orgs = await this.uow.organizations.listByUser(id);
        if (orgs.length > 0) org = orgs[0];
      } catch {}
    }
    if (!org && (this.authService as any).organizations) {
      for (const o of (this.authService as any).organizations.values()) {
        if (o.ownerUserId === id) {
          org = o;
          break;
        }
      }
    }

    let membership = null;
    if (org && this.uow?.memberships?.findByUserAndOrg) {
      try {
        membership = await this.uow.memberships.findByUserAndOrg(id, org.id);
      } catch {}
    }
    if (!membership && org && (this.authService as any).memberships) {
      for (const m of (this.authService as any).memberships.values()) {
        if (m.userId === id && m.organizationId === org.id) {
          membership = m;
          break;
        }
      }
    }

    let websites: any[] = [];
    if (this.hostingService && org) {
      try {
        websites = await this.hostingService.listWebSites(org.id, membership?.linkedHestiaUser);
      } catch {}
    }

    let subscriptions: any[] = [];
    if (this.subscriptionService && org) {
      subscriptions = this.subscriptionService.getSubscriptionsByOrganization(org.id);
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      organization: org,
      role: membership?.role || 'OWNER',
      linkedHestiaUser: membership?.linkedHestiaUser || null,
      status: subscriptions.length > 0 ? subscriptions[0].status : 'ACTIVE',
      websites,
      subscriptions,
    };
  }

  @Patch(':id')
  async updateCustomer(@Param('id') id: string, @Body() body: UpdateCustomerDto) {
    let user: any = (this.authService as any).users?.get(id);
    if (!user && this.uow?.users) {
      user = await this.uow.users.findById(id);
    }
    if (!user) {
      throw new NotFoundException(`Cliente con ID '${id}' no encontrado.`);
    }

    if (body.fullName) user.fullName = body.fullName.trim();
    if (body.email) user.email = body.email.toLowerCase().trim();

    if ((this.authService as any).users) {
      (this.authService as any).users.set(id, user);
    }
    if (this.uow?.users) {
      await this.uow.users.save({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        emailVerified: user.emailVerified,
        passwordHash: user.passwordHash,
        createdAt: user.createdAt,
      });
    }

    return {
      success: true,
      customer: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        emailVerified: user.emailVerified,
      },
      message: 'Cliente actualizado exitosamente.',
    };
  }

  @Post(':id/suspend')
  async suspendCustomer(@Param('id') id: string) {
    const detail = await this.getCustomer(id);

    // 1. Suspend Hestia User if provisioned
    if (detail.linkedHestiaUser && this.hostingService) {
      await this.hostingService.suspendUser(detail.linkedHestiaUser);
    }

    // 2. Suspend subscriptions in subscriptionService / database
    if (detail.organization?.id && this.subscriptionService) {
      const subs = this.subscriptionService.getSubscriptionsByOrganization(detail.organization.id);
      for (const s of subs) {
        s.status = 'SUSPENDED';
        if (this.uow?.subscriptions) {
          try {
            await this.uow.subscriptions.save(s);
          } catch {}
        }
      }
    }

    return {
      success: true,
      status: 'SUSPENDED',
      message: `El cliente ${detail.email} y sus servicios fueron suspendidos correctamente.`,
    };
  }

  @Post(':id/reactivate')
  async reactivateCustomer(@Param('id') id: string) {
    const detail = await this.getCustomer(id);

    // 1. Unsuspend Hestia User if provisioned
    if (detail.linkedHestiaUser && this.hostingService) {
      await this.hostingService.unsuspendUser(detail.linkedHestiaUser);
    }

    // 2. Reactivate subscriptions
    if (detail.organization?.id && this.subscriptionService) {
      const subs = this.subscriptionService.getSubscriptionsByOrganization(detail.organization.id);
      for (const s of subs) {
        s.status = 'ACTIVE';
        if (this.uow?.subscriptions) {
          try {
            await this.uow.subscriptions.save(s);
          } catch {}
        }
      }
    }

    return {
      success: true,
      status: 'ACTIVE',
      message: `El cliente ${detail.email} y sus servicios fueron reactivados correctamente.`,
    };
  }

  @Delete(':id')
  async deprovisionCustomer(@Param('id') id: string) {
    let user: any = this.authService.getUserById(id);
    if (!user && this.uow?.users) {
      user = await this.uow.users.findById(id);
    }
    if (!user) {
      throw new NotFoundException(`Cliente con ID '${id}' no encontrado.`);
    }

    let orgId: string | undefined;
    if (this.uow?.organizations?.listByUser) {
      try {
        const orgs = await this.uow.organizations.listByUser(id);
        if (orgs.length > 0) orgId = orgs[0].id;
      } catch {}
    }
    if (!orgId && (this.authService as any).organizations) {
      for (const o of (this.authService as any).organizations.values()) {
        if (o.ownerUserId === id) {
          orgId = o.id;
          break;
        }
      }
    }

    let hestiaUser: string | undefined;
    if (orgId && this.uow?.memberships) {
      try {
        const mems = await this.uow.memberships.listByOrganization(orgId);
        hestiaUser = mems.find((m: any) => m.linkedHestiaUser)?.linkedHestiaUser;
      } catch {}
    }
    if (!hestiaUser && (this.authService as any).memberships) {
      for (const m of (this.authService as any).memberships.values()) {
        if (m.userId === id && m.linkedHestiaUser) {
          hestiaUser = m.linkedHestiaUser;
          break;
        }
      }
    }

    const result = await this.deprovisioningService.deprovision({
      email: user.email,
      organizationId: orgId,
      hestiaUser,
    });

    return {
      success: true,
      result,
      message: `Cliente ${user.email} y toda su infraestructura han sido dados de baja exitosamente.`,
    };
  }
}
