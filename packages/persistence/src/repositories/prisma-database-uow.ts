import {
  CustomerUser,
  CustomerOrganization,
  Membership,
  Product,
  Plan,
  PlanVersion,
  Order,
  CustomerEntitlement,
  Project,
  Service,
  IUserRepository,
  IOrganizationRepository,
  IMembershipRepository,
  IPlanVersionRepository,
  IOrderRepository,
  ICustomerEntitlementRepository,
  IProjectRepository,
  IServiceRepository,
  IUnitOfWork,
} from '@cloudfly/domain';

export class DatabaseUserRepository implements IUserRepository {
  constructor(private readonly prisma: any) {}

  async save(user: CustomerUser): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email.toLowerCase().trim(),
        fullName: user.fullName,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      update: {
        email: user.email.toLowerCase().trim(),
        fullName: user.fullName,
        emailVerified: user.emailVerified,
      },
    });
  }

  async findById(id: string): Promise<CustomerUser | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    if (!record) return null;
    return {
      id: record.id,
      email: record.email,
      fullName: record.fullName,
      emailVerified: record.emailVerified,
      createdAt: record.createdAt,
    };
  }

  async findByEmail(email: string): Promise<CustomerUser | null> {
    const record = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!record) return null;
    return {
      id: record.id,
      email: record.email,
      fullName: record.fullName,
      emailVerified: record.emailVerified,
      createdAt: record.createdAt,
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}

export class DatabaseOrganizationRepository implements IOrganizationRepository {
  constructor(private readonly prisma: any) {}

  async save(org: CustomerOrganization): Promise<void> {
    await this.prisma.organization.upsert({
      where: { id: org.id },
      create: {
        id: org.id,
        name: org.name,
        slug: org.slug.toLowerCase().trim(),
        ownerUserId: org.ownerUserId,
        isInternalPilot: org.isInternalPilot || false,
        createdAt: org.createdAt,
      },
      update: {
        name: org.name,
        slug: org.slug.toLowerCase().trim(),
        isInternalPilot: org.isInternalPilot || false,
      },
    });
  }

  async findById(id: string): Promise<CustomerOrganization | null> {
    const record = await this.prisma.organization.findUnique({ where: { id } });
    if (!record) return null;
    return {
      id: record.id,
      name: record.name,
      slug: record.slug,
      ownerUserId: record.ownerUserId,
      isInternalPilot: record.isInternalPilot,
      createdAt: record.createdAt,
    };
  }

  async findBySlug(slug: string): Promise<CustomerOrganization | null> {
    const record = await this.prisma.organization.findUnique({
      where: { slug: slug.toLowerCase().trim() },
    });
    if (!record) return null;
    return {
      id: record.id,
      name: record.name,
      slug: record.slug,
      ownerUserId: record.ownerUserId,
      isInternalPilot: record.isInternalPilot,
      createdAt: record.createdAt,
    };
  }

  async listByUser(userId: string): Promise<CustomerOrganization[]> {
    const records = await this.prisma.organization.findMany({
      where: {
        OR: [
          { ownerUserId: userId },
          { memberships: { some: { userId } } },
        ],
      },
    });
    return records.map((record: any) => ({
      id: record.id,
      name: record.name,
      slug: record.slug,
      ownerUserId: record.ownerUserId,
      isInternalPilot: record.isInternalPilot,
      createdAt: record.createdAt,
    }));
  }
}

export class DatabaseMembershipRepository implements IMembershipRepository {
  constructor(private readonly prisma: any) {}

  async save(membership: Membership): Promise<void> {
    await this.prisma.membership.upsert({
      where: { id: membership.id },
      create: {
        id: membership.id,
        userId: membership.userId,
        organizationId: membership.organizationId,
        role: membership.role,
        linkedHestiaUser: membership.linkedHestiaUser,
        createdAt: membership.createdAt,
      },
      update: {
        role: membership.role,
        linkedHestiaUser: membership.linkedHestiaUser,
      },
    });
  }

  async findById(id: string): Promise<Membership | null> {
    const record = await this.prisma.membership.findUnique({ where: { id } });
    if (!record) return null;
    return {
      id: record.id,
      userId: record.userId,
      organizationId: record.organizationId,
      role: record.role as any,
      linkedHestiaUser: record.linkedHestiaUser || undefined,
      createdAt: record.createdAt,
    };
  }

  async findByUserAndOrg(userId: string, organizationId: string): Promise<Membership | null> {
    const record = await this.prisma.membership.findFirst({
      where: { userId, organizationId },
    });
    if (!record) return null;
    return {
      id: record.id,
      userId: record.userId,
      organizationId: record.organizationId,
      role: record.role as any,
      linkedHestiaUser: record.linkedHestiaUser || undefined,
      createdAt: record.createdAt,
    };
  }

  async listByOrganization(organizationId: string): Promise<Membership[]> {
    const records = await this.prisma.membership.findMany({
      where: { organizationId },
    });
    return records.map((r: any) => ({
      id: r.id,
      userId: r.userId,
      organizationId: r.organizationId,
      role: r.role as any,
      linkedHestiaUser: r.linkedHestiaUser || undefined,
      createdAt: r.createdAt,
    }));
  }

  async delete(id: string): Promise<void> {
    await this.prisma.membership.delete({ where: { id } });
  }
}

export class DatabasePlanVersionRepository implements IPlanVersionRepository {
  constructor(private readonly prisma: any) {}

  async saveProduct(product: Product): Promise<void> {
    await this.prisma.product.upsert({
      where: { id: product.id },
      create: {
        id: product.id,
        name: product.name,
        code: product.code,
        category: product.category,
        isActive: product.isActive,
      },
      update: {
        name: product.name,
        category: product.category,
        isActive: product.isActive,
      },
    });
  }

  async savePlan(plan: Plan): Promise<void> {
    await this.prisma.plan.upsert({
      where: { id: plan.id },
      create: {
        id: plan.id,
        productId: plan.productId,
        name: plan.name,
        code: plan.code,
        infrastructureMode: plan.infrastructureMode,
      },
      update: {
        name: plan.name,
        infrastructureMode: plan.infrastructureMode,
      },
    });
  }

  async savePlanVersion(planVersion: PlanVersion): Promise<void> {
    await this.prisma.planVersion.upsert({
      where: { id: planVersion.id },
      create: {
        id: planVersion.id,
        planId: planVersion.planId,
        version: planVersion.version,
        quotas: planVersion.quotas as any,
        prices: planVersion.prices as any,
      },
      update: {
        quotas: planVersion.quotas as any,
        prices: planVersion.prices as any,
      },
    });
  }

  async findPlanVersionById(id: string): Promise<PlanVersion | null> {
    const record = await this.prisma.planVersion.findUnique({ where: { id } });
    if (!record) return null;
    return {
      id: record.id,
      planId: record.planId,
      version: record.version,
      quotas: record.quotas,
      prices: record.prices,
      effectiveFrom: record.createdAt,
      createdAt: record.createdAt || new Date(),
    };
  }

  async findPlanById(id: string): Promise<Plan | null> {
    const record = await this.prisma.plan.findUnique({ where: { id } });
    if (!record) return null;
    return {
      id: record.id,
      productId: record.productId,
      name: record.name,
      code: record.code,
      infrastructureMode: record.infrastructureMode,
      createdAt: record.createdAt || new Date(),
    };
  }

  async findProductById(id: string): Promise<Product | null> {
    const record = await this.prisma.product.findUnique({ where: { id } });
    if (!record) return null;
    return {
      id: record.id,
      name: record.name,
      code: record.code,
      category: record.category,
      isActive: record.isActive,
      createdAt: record.createdAt || new Date(),
    };
  }

  async listActiveProducts(): Promise<Product[]> {
    const records = await this.prisma.product.findMany({ where: { isActive: true } });
    return records.map((r: any) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      category: r.category,
      isActive: r.isActive,
      createdAt: r.createdAt || new Date(),
    }));
  }
}

export class DatabaseOrderRepository implements IOrderRepository {
  constructor(private readonly prisma: any) {}

  async save(order: Order): Promise<void> {
    await this.prisma.order.upsert({
      where: { id: order.id },
      create: {
        id: order.id,
        organizationId: order.organizationId,
        orderNumber: order.orderNumber,
        status: order.status,
        currency: order.currency,
        subtotalCents: order.subtotalCents,
        taxCents: order.taxCents,
        totalCents: order.totalCents,
        idempotencyKey: order.idempotencyKey,
        createdAt: order.createdAt,
        items: {
          create: order.items.map((item) => ({
            id: item.id,
            planVersionId: item.planVersionId,
            billingCycle: item.billingCycle,
            unitPriceCents: item.unitPriceCents,
            quantity: item.quantity,
          })),
        },
      },
      update: {
        status: order.status,
      },
    });
  }

  async findById(id: string): Promise<Order | null> {
    const record = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!record) return null;
    return {
      id: record.id,
      organizationId: record.organizationId,
      orderNumber: record.orderNumber,
      status: record.status as any,
      currency: record.currency,
      subtotalCents: record.subtotalCents,
      taxCents: record.taxCents,
      totalCents: record.totalCents,
      idempotencyKey: record.idempotencyKey,
      items: record.items.map((i: any) => ({
        id: i.id,
        orderId: i.orderId,
        planVersionId: i.planVersionId,
        billingCycle: i.billingCycle,
        unitPriceCents: i.unitPriceCents,
        quantity: i.quantity,
      })),
      createdAt: record.createdAt,
    };
  }

  async findByIdempotencyKey(key: string): Promise<Order | null> {
    const record = await this.prisma.order.findFirst({
      where: { idempotencyKey: key },
      include: { items: true },
    });
    if (!record) return null;
    return {
      id: record.id,
      organizationId: record.organizationId,
      orderNumber: record.orderNumber,
      status: record.status as any,
      currency: record.currency,
      subtotalCents: record.subtotalCents,
      taxCents: record.taxCents,
      totalCents: record.totalCents,
      idempotencyKey: record.idempotencyKey,
      items: record.items.map((i: any) => ({
        id: i.id,
        orderId: i.orderId,
        planVersionId: i.planVersionId,
        billingCycle: i.billingCycle,
        unitPriceCents: i.unitPriceCents,
        quantity: i.quantity,
      })),
      createdAt: record.createdAt,
    };
  }

  async listByOrganization(organizationId: string): Promise<Order[]> {
    const records = await this.prisma.order.findMany({
      where: { organizationId },
      include: { items: true },
    });
    return records.map((record: any) => ({
      id: record.id,
      organizationId: record.organizationId,
      orderNumber: record.orderNumber,
      status: record.status as any,
      currency: record.currency,
      subtotalCents: record.subtotalCents,
      taxCents: record.taxCents,
      totalCents: record.totalCents,
      idempotencyKey: record.idempotencyKey,
      items: record.items.map((i: any) => ({
        id: i.id,
        orderId: i.orderId,
        planVersionId: i.planVersionId,
        billingCycle: i.billingCycle,
        unitPriceCents: i.unitPriceCents,
        quantity: i.quantity,
      })),
      createdAt: record.createdAt,
    }));
  }
}

export class DatabaseCustomerEntitlementRepository implements ICustomerEntitlementRepository {
  constructor(private readonly prisma: any) {}

  async save(entitlement: CustomerEntitlement): Promise<void> {
    await this.prisma.customerEntitlement.upsert({
      where: { id: entitlement.id },
      create: {
        id: entitlement.id,
        organizationId: entitlement.organizationId,
        orderId: entitlement.orderId,
        planVersionId: entitlement.planVersionId,
        status: entitlement.status,
        quotas: entitlement.quotas as any,
        validUntil: entitlement.validUntil,
        createdAt: entitlement.createdAt,
      },
      update: {
        status: entitlement.status,
        validUntil: entitlement.validUntil,
      },
    });
  }

  async findById(id: string): Promise<CustomerEntitlement | null> {
    const record = await this.prisma.customerEntitlement.findUnique({ where: { id } });
    if (!record) return null;
    return {
      id: record.id,
      organizationId: record.organizationId,
      orderId: record.orderId,
      planVersionId: record.planVersionId,
      status: record.status as any,
      quotas: record.quotas,
      validUntil: record.validUntil,
      createdAt: record.createdAt,
    };
  }

  async listByOrganization(organizationId: string): Promise<CustomerEntitlement[]> {
    const records = await this.prisma.customerEntitlement.findMany({
      where: { organizationId },
    });
    return records.map((r: any) => ({
      id: r.id,
      organizationId: r.organizationId,
      orderId: r.orderId,
      planVersionId: r.planVersionId,
      status: r.status as any,
      quotas: r.quotas,
      validUntil: r.validUntil,
      createdAt: r.createdAt,
    }));
  }
}

export class DatabaseProjectRepository implements IProjectRepository {
  constructor(private readonly prisma: any) {}

  async save(project: Project): Promise<void> {
    await this.prisma.project.upsert({
      where: { id: project.id },
      create: {
        id: project.id,
        organizationId: project.organizationId,
        name: project.name,
        slug: project.slug,
        infrastructureMode: project.infrastructureMode,
        createdAt: project.createdAt,
      },
      update: {
        name: project.name,
        slug: project.slug,
        infrastructureMode: project.infrastructureMode,
      },
    });
  }

  async findById(id: string): Promise<Project | null> {
    const record = await this.prisma.project.findUnique({ where: { id } });
    if (!record) return null;
    return {
      id: record.id,
      organizationId: record.organizationId,
      name: record.name,
      slug: record.slug,
      infrastructureMode: record.infrastructureMode,
      createdAt: record.createdAt,
    };
  }

  async findByOrgAndSlug(organizationId: string, slug: string): Promise<Project | null> {
    const record = await this.prisma.project.findFirst({
      where: { organizationId, slug },
    });
    if (!record) return null;
    return {
      id: record.id,
      organizationId: record.organizationId,
      name: record.name,
      slug: record.slug,
      infrastructureMode: record.infrastructureMode,
      createdAt: record.createdAt,
    };
  }

  async listByOrganization(organizationId: string): Promise<Project[]> {
    const records = await this.prisma.project.findMany({
      where: { organizationId },
    });
    return records.map((r: any) => ({
      id: r.id,
      organizationId: r.organizationId,
      name: r.name,
      slug: r.slug,
      infrastructureMode: r.infrastructureMode,
      createdAt: r.createdAt,
    }));
  }
}

export class DatabaseServiceRepository implements IServiceRepository {
  constructor(private readonly prisma: any) {}

  async save(service: Service): Promise<void> {
    await this.prisma.service.upsert({
      where: { id: service.id },
      create: {
        id: service.id,
        projectId: service.projectId,
        organizationId: service.organizationId,
        name: service.name,
        slug: service.slug,
        runtimeTemplateId: service.runtimeTemplateId,
        desiredState: service.desiredState as any,
        observedState: service.observedState as any,
        createdAt: service.createdAt,
      },
      update: {
        desiredState: service.desiredState as any,
        observedState: service.observedState as any,
      },
    });
  }

  async findById(id: string): Promise<Service | null> {
    const record = await this.prisma.service.findUnique({ where: { id } });
    if (!record) return null;
    return {
      id: record.id,
      projectId: record.projectId,
      organizationId: record.organizationId,
      name: record.name,
      slug: record.slug,
      runtimeTemplateId: record.runtimeTemplateId,
      desiredState: record.desiredState,
      observedState: record.observedState,
      createdAt: record.createdAt,
    };
  }

  async findByProjectAndSlug(projectId: string, slug: string): Promise<Service | null> {
    const record = await this.prisma.service.findFirst({
      where: { projectId, slug },
    });
    if (!record) return null;
    return {
      id: record.id,
      projectId: record.projectId,
      organizationId: record.organizationId,
      name: record.name,
      slug: record.slug,
      runtimeTemplateId: record.runtimeTemplateId,
      desiredState: record.desiredState,
      observedState: record.observedState,
      createdAt: record.createdAt,
    };
  }

  async listByProject(projectId: string): Promise<Service[]> {
    const records = await this.prisma.service.findMany({
      where: { projectId },
    });
    return records.map((r: any) => ({
      id: r.id,
      projectId: r.projectId,
      organizationId: r.organizationId,
      name: r.name,
      slug: r.slug,
      runtimeTemplateId: r.runtimeTemplateId,
      desiredState: r.desiredState,
      observedState: r.observedState,
      createdAt: r.createdAt,
    }));
  }

  async listByOrganization(organizationId: string): Promise<Service[]> {
    const records = await this.prisma.service.findMany({
      where: { organizationId },
    });
    return records.map((r: any) => ({
      id: r.id,
      projectId: r.projectId,
      organizationId: r.organizationId,
      name: r.name,
      slug: r.slug,
      runtimeTemplateId: r.runtimeTemplateId,
      desiredState: r.desiredState,
      observedState: r.observedState,
      createdAt: r.createdAt,
    }));
  }
}

export class PrismaDatabaseUnitOfWork implements IUnitOfWork {
  public users: IUserRepository;
  public organizations: IOrganizationRepository;
  public memberships: IMembershipRepository;
  public plans: IPlanVersionRepository;
  public orders: IOrderRepository;
  public entitlements: ICustomerEntitlementRepository;
  public projects: IProjectRepository;
  public services: IServiceRepository;

  constructor(private readonly prisma: any) {
    this.users = new DatabaseUserRepository(this.prisma);
    this.organizations = new DatabaseOrganizationRepository(this.prisma);
    this.memberships = new DatabaseMembershipRepository(this.prisma);
    this.plans = new DatabasePlanVersionRepository(this.prisma);
    this.orders = new DatabaseOrderRepository(this.prisma);
    this.entitlements = new DatabaseCustomerEntitlementRepository(this.prisma);
    this.projects = new DatabaseProjectRepository(this.prisma);
    this.services = new DatabaseServiceRepository(this.prisma);
  }

  async transaction<T>(work: (uow: IUnitOfWork) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (txPrisma: any) => {
      const txUow = new PrismaDatabaseUnitOfWork(txPrisma);
      return work(txUow);
    });
  }
}
