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
  CartDraft,
  PaymentRecord,
  Subscription,
  Invoice,
  AuditRecord,
  ICartDraftRepository,
  IPaymentRepository,
  ISubscriptionRepository,
  IInvoiceRepository,
  IAuditEventRepository,
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

export class PersistenceDuplicateKeyError extends Error {
  constructor(field: string, value: string) {
    super(`Unique constraint violation: Entity with ${field} '${value}' already exists.`);
    this.name = 'PersistenceDuplicateKeyError';
  }
}

export interface SharedStorageState {
  users: Map<string, CustomerUser>;
  userEmails: Map<string, string>; // email -> id
  organizations: Map<string, CustomerOrganization>;
  organizationSlugs: Map<string, string>; // slug -> id
  memberships: Map<string, Membership>;
  membershipCompound: Map<string, string>; // `${userId}:${orgId}` -> id
  products: Map<string, Product>;
  productCodes: Map<string, string>; // code -> id
  plans: Map<string, Plan>;
  planCodes: Map<string, string>; // code -> id
  planVersions: Map<string, PlanVersion>;
  planVersionCompound: Map<string, string>; // `${planId}:${version}` -> id
  orders: Map<string, Order>;
  orderIdempotency: Map<string, string>; // idempotencyKey -> id
  entitlements: Map<string, CustomerEntitlement>;
  projects: Map<string, Project>;
  projectCompound: Map<string, string>; // `${orgId}:${slug}` -> id
  services: Map<string, Service>;
  serviceCompound: Map<string, string>; // `${projectId}:${slug}` -> id
  cartDrafts: Map<string, CartDraft>;
  cartTokenHash: Map<string, string>; // hash -> id
  payments: Map<string, PaymentRecord>;
  subscriptions: Map<string, Subscription>;
  invoices: Map<string, Invoice>;
  invoiceNumbers: Map<string, string>; // invoiceNumber -> id
  auditEvents: Map<string, AuditRecord>;
}

export function createInitialStorage(): SharedStorageState {
  return {
    users: new Map(),
    userEmails: new Map(),
    organizations: new Map(),
    organizationSlugs: new Map(),
    memberships: new Map(),
    membershipCompound: new Map(),
    products: new Map(),
    productCodes: new Map(),
    plans: new Map(),
    planCodes: new Map(),
    planVersions: new Map(),
    planVersionCompound: new Map(),
    orders: new Map(),
    orderIdempotency: new Map(),
    entitlements: new Map(),
    projects: new Map(),
    projectCompound: new Map(),
    services: new Map(),
    serviceCompound: new Map(),
    cartDrafts: new Map(),
    cartTokenHash: new Map(),
    payments: new Map(),
    subscriptions: new Map(),
    invoices: new Map(),
    invoiceNumbers: new Map(),
    auditEvents: new Map(),
  };
}

export function cloneStorage(storage: SharedStorageState): SharedStorageState {
  return {
    users: new Map(storage.users),
    userEmails: new Map(storage.userEmails),
    organizations: new Map(storage.organizations),
    organizationSlugs: new Map(storage.organizationSlugs),
    memberships: new Map(storage.memberships),
    membershipCompound: new Map(storage.membershipCompound),
    products: new Map(storage.products),
    productCodes: new Map(storage.productCodes),
    plans: new Map(storage.plans),
    planCodes: new Map(storage.planCodes),
    planVersions: new Map(storage.planVersions),
    planVersionCompound: new Map(storage.planVersionCompound),
    orders: new Map(storage.orders),
    orderIdempotency: new Map(storage.orderIdempotency),
    entitlements: new Map(storage.entitlements),
    projects: new Map(storage.projects),
    projectCompound: new Map(storage.projectCompound),
    services: new Map(storage.services),
    serviceCompound: new Map(storage.serviceCompound),
    cartDrafts: new Map(storage.cartDrafts),
    cartTokenHash: new Map(storage.cartTokenHash),
    payments: new Map(storage.payments),
    subscriptions: new Map(storage.subscriptions),
    invoices: new Map(storage.invoices),
    invoiceNumbers: new Map(storage.invoiceNumbers),
    auditEvents: new Map(storage.auditEvents),
  };
}

export class PrismaUserRepository implements IUserRepository {
  constructor(private storage: SharedStorageState) {}

  async save(user: CustomerUser): Promise<void> {
    const emailKey = user.email.toLowerCase();
    const existingId = this.storage.userEmails.get(emailKey);
    if (existingId && existingId !== user.id) {
      throw new PersistenceDuplicateKeyError('email', user.email);
    }

    this.storage.users.set(user.id, { ...user });
    this.storage.userEmails.set(emailKey, user.id);
  }

  async findById(id: string): Promise<CustomerUser | null> {
    const user = this.storage.users.get(id);
    return user ? { ...user } : null;
  }

  async findByEmail(email: string): Promise<CustomerUser | null> {
    const id = this.storage.userEmails.get(email.toLowerCase());
    if (!id) return null;
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const user = this.storage.users.get(id);
    if (user) {
      this.storage.userEmails.delete(user.email.toLowerCase());
      this.storage.users.delete(id);
    }
  }
}

export class PrismaOrganizationRepository implements IOrganizationRepository {
  constructor(private storage: SharedStorageState) {}

  async save(org: CustomerOrganization): Promise<void> {
    const slugKey = org.slug.toLowerCase();
    const existingId = this.storage.organizationSlugs.get(slugKey);
    if (existingId && existingId !== org.id) {
      throw new PersistenceDuplicateKeyError('slug', org.slug);
    }

    this.storage.organizations.set(org.id, { ...org });
    this.storage.organizationSlugs.set(slugKey, org.id);
  }

  async findById(id: string): Promise<CustomerOrganization | null> {
    const org = this.storage.organizations.get(id);
    return org ? { ...org } : null;
  }

  async findBySlug(slug: string): Promise<CustomerOrganization | null> {
    const id = this.storage.organizationSlugs.get(slug.toLowerCase());
    if (!id) return null;
    return this.findById(id);
  }

  async listByUser(userId: string): Promise<CustomerOrganization[]> {
    return Array.from(this.storage.organizations.values())
      .filter((org) => org.ownerUserId === userId)
      .map((org) => ({ ...org }));
  }
}

export class PrismaMembershipRepository implements IMembershipRepository {
  constructor(private storage: SharedStorageState) {}

  async save(membership: Membership): Promise<void> {
    const compound = `${membership.userId}:${membership.organizationId}`;
    const existingId = this.storage.membershipCompound.get(compound);
    if (existingId && existingId !== membership.id) {
      throw new PersistenceDuplicateKeyError('userId+organizationId', compound);
    }

    this.storage.memberships.set(membership.id, { ...membership });
    this.storage.membershipCompound.set(compound, membership.id);
  }

  async findById(id: string): Promise<Membership | null> {
    const m = this.storage.memberships.get(id);
    return m ? { ...m } : null;
  }

  async findByUserAndOrg(userId: string, organizationId: string): Promise<Membership | null> {
    const id = this.storage.membershipCompound.get(`${userId}:${organizationId}`);
    if (!id) return null;
    return this.findById(id);
  }

  async listByOrganization(organizationId: string): Promise<Membership[]> {
    return Array.from(this.storage.memberships.values())
      .filter((m) => m.organizationId === organizationId)
      .map((m) => ({ ...m }));
  }

  async delete(id: string): Promise<void> {
    const m = this.storage.memberships.get(id);
    if (m) {
      this.storage.membershipCompound.delete(`${m.userId}:${m.organizationId}`);
      this.storage.memberships.delete(id);
    }
  }
}

export class PrismaPlanVersionRepository implements IPlanVersionRepository {
  constructor(private storage: SharedStorageState) {}

  async saveProduct(product: Product): Promise<void> {
    const existing = this.storage.productCodes.get(product.code);
    if (existing && existing !== product.id) {
      throw new PersistenceDuplicateKeyError('product.code', product.code);
    }
    this.storage.products.set(product.id, { ...product });
    this.storage.productCodes.set(product.code, product.id);
  }

  async savePlan(plan: Plan): Promise<void> {
    const existing = this.storage.planCodes.get(plan.code);
    if (existing && existing !== plan.id) {
      throw new PersistenceDuplicateKeyError('plan.code', plan.code);
    }
    this.storage.plans.set(plan.id, { ...plan });
    this.storage.planCodes.set(plan.code, plan.id);
  }

  async savePlanVersion(planVersion: PlanVersion): Promise<void> {
    const compound = `${planVersion.planId}:${planVersion.version}`;
    const existing = this.storage.planVersionCompound.get(compound);
    if (existing && existing !== planVersion.id) {
      throw new PersistenceDuplicateKeyError('planVersion.version', compound);
    }
    this.storage.planVersions.set(planVersion.id, { ...planVersion });
    this.storage.planVersionCompound.set(compound, planVersion.id);
  }

  async findPlanVersionById(id: string): Promise<PlanVersion | null> {
    const pv = this.storage.planVersions.get(id);
    return pv ? { ...pv } : null;
  }

  async findPlanById(id: string): Promise<Plan | null> {
    const p = this.storage.plans.get(id);
    return p ? { ...p } : null;
  }

  async findProductById(id: string): Promise<Product | null> {
    const prod = this.storage.products.get(id);
    return prod ? { ...prod } : null;
  }

  async listActiveProducts(): Promise<Product[]> {
    return Array.from(this.storage.products.values())
      .filter((p) => p.isActive)
      .map((p) => ({ ...p }));
  }
}

export class PrismaOrderRepository implements IOrderRepository {
  constructor(private storage: SharedStorageState) {}

  async save(order: Order): Promise<void> {
    const existingId = this.storage.orderIdempotency.get(order.idempotencyKey);
    if (existingId && existingId !== order.id) {
      throw new PersistenceDuplicateKeyError('idempotencyKey', order.idempotencyKey);
    }

    this.storage.orders.set(order.id, { ...order, items: order.items.map((i) => ({ ...i })) });
    this.storage.orderIdempotency.set(order.idempotencyKey, order.id);
  }

  async findById(id: string): Promise<Order | null> {
    const ord = this.storage.orders.get(id);
    return ord ? { ...ord, items: ord.items.map((i) => ({ ...i })) } : null;
  }

  async findByIdempotencyKey(key: string): Promise<Order | null> {
    const id = this.storage.orderIdempotency.get(key);
    if (!id) return null;
    return this.findById(id);
  }

  async listByOrganization(organizationId: string): Promise<Order[]> {
    return Array.from(this.storage.orders.values())
      .filter((ord) => ord.organizationId === organizationId)
      .map((ord) => ({ ...ord, items: ord.items.map((i) => ({ ...i })) }));
  }
}

export class PrismaCustomerEntitlementRepository implements ICustomerEntitlementRepository {
  constructor(private storage: SharedStorageState) {}

  async save(entitlement: CustomerEntitlement): Promise<void> {
    this.storage.entitlements.set(entitlement.id, { ...entitlement });
  }

  async findById(id: string): Promise<CustomerEntitlement | null> {
    const e = this.storage.entitlements.get(id);
    return e ? { ...e } : null;
  }

  async listByOrganization(organizationId: string): Promise<CustomerEntitlement[]> {
    return Array.from(this.storage.entitlements.values())
      .filter((e) => e.organizationId === organizationId)
      .map((e) => ({ ...e }));
  }
}

export class PrismaProjectRepository implements IProjectRepository {
  constructor(private storage: SharedStorageState) {}

  async save(project: Project): Promise<void> {
    const compound = `${project.organizationId}:${project.slug.toLowerCase()}`;
    const existingId = this.storage.projectCompound.get(compound);
    if (existingId && existingId !== project.id) {
      throw new PersistenceDuplicateKeyError('organizationId+slug', compound);
    }

    this.storage.projects.set(project.id, { ...project });
    this.storage.projectCompound.set(compound, project.id);
  }

  async findById(id: string): Promise<Project | null> {
    const p = this.storage.projects.get(id);
    return p ? { ...p } : null;
  }

  async findByOrgAndSlug(organizationId: string, slug: string): Promise<Project | null> {
    const id = this.storage.projectCompound.get(`${organizationId}:${slug.toLowerCase()}`);
    if (!id) return null;
    return this.findById(id);
  }

  async listByOrganization(organizationId: string): Promise<Project[]> {
    return Array.from(this.storage.projects.values())
      .filter((p) => p.organizationId === organizationId)
      .map((p) => ({ ...p }));
  }
}

export class PrismaServiceRepository implements IServiceRepository {
  constructor(private storage: SharedStorageState) {}

  async save(service: Service): Promise<void> {
    const compound = `${service.projectId}:${service.slug.toLowerCase()}`;
    const existingId = this.storage.serviceCompound.get(compound);
    if (existingId && existingId !== service.id) {
      throw new PersistenceDuplicateKeyError('projectId+slug', compound);
    }

    this.storage.services.set(service.id, {
      ...service,
      desiredState: JSON.parse(JSON.stringify(service.desiredState)),
      observedState: JSON.parse(JSON.stringify(service.observedState)),
    });
    this.storage.serviceCompound.set(compound, service.id);
  }

  async findById(id: string): Promise<Service | null> {
    const s = this.storage.services.get(id);
    return s ? { ...s } : null;
  }

  async findByProjectAndSlug(projectId: string, slug: string): Promise<Service | null> {
    const id = this.storage.serviceCompound.get(`${projectId}:${slug.toLowerCase()}`);
    if (!id) return null;
    return this.findById(id);
  }

  async listByProject(projectId: string): Promise<Service[]> {
    return Array.from(this.storage.services.values())
      .filter((s) => s.projectId === projectId)
      .map((s) => ({ ...s }));
  }

  async listByOrganization(organizationId: string): Promise<Service[]> {
    return Array.from(this.storage.services.values())
      .filter((s) => s.organizationId === organizationId)
      .map((s) => ({ ...s }));
  }
}

export class PrismaCartDraftRepository implements ICartDraftRepository {
  constructor(private storage: SharedStorageState) {}

  async save(draft: CartDraft): Promise<void> {
    this.storage.cartDrafts.set(draft.id, { ...draft });
    this.storage.cartTokenHash.set(draft.anonymousTokenHash, draft.id);
  }

  async findById(id: string): Promise<CartDraft | null> {
    const d = this.storage.cartDrafts.get(id);
    return d ? { ...d } : null;
  }

  async findByAnonymousTokenHash(hash: string): Promise<CartDraft | null> {
    const id = this.storage.cartTokenHash.get(hash);
    if (!id) return null;
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const d = this.storage.cartDrafts.get(id);
    if (d) {
      this.storage.cartTokenHash.delete(d.anonymousTokenHash);
      this.storage.cartDrafts.delete(id);
    }
  }
}

export class PrismaPaymentRepository implements IPaymentRepository {
  constructor(private storage: SharedStorageState) {}

  async save(payment: PaymentRecord): Promise<void> {
    this.storage.payments.set(payment.id, { ...payment });
  }

  async findById(id: string): Promise<PaymentRecord | null> {
    const p = this.storage.payments.get(id);
    return p ? { ...p } : null;
  }

  async findByOrderId(orderId: string): Promise<PaymentRecord[]> {
    return Array.from(this.storage.payments.values())
      .filter((p) => p.orderId === orderId)
      .map((p) => ({ ...p }));
  }
}

export class PrismaSubscriptionRepository implements ISubscriptionRepository {
  constructor(private storage: SharedStorageState) {}

  async save(sub: Subscription): Promise<void> {
    this.storage.subscriptions.set(sub.id, { ...sub });
  }

  async findById(id: string): Promise<Subscription | null> {
    const s = this.storage.subscriptions.get(id);
    return s ? { ...s } : null;
  }

  async listByOrganization(organizationId: string): Promise<Subscription[]> {
    return Array.from(this.storage.subscriptions.values())
      .filter((s) => s.organizationId === organizationId)
      .map((s) => ({ ...s }));
  }

  async findByOrderId(orderId: string): Promise<Subscription | null> {
    const s = Array.from(this.storage.subscriptions.values()).find((sub) => sub.orderId === orderId);
    return s ? { ...s } : null;
  }
}

export class PrismaInvoiceRepository implements IInvoiceRepository {
  constructor(private storage: SharedStorageState) {}

  async save(inv: Invoice): Promise<void> {
    this.storage.invoices.set(inv.id, { ...inv });
    this.storage.invoiceNumbers.set(inv.invoiceNumber, inv.id);
  }

  async findById(id: string): Promise<Invoice | null> {
    const i = this.storage.invoices.get(id);
    return i ? { ...i } : null;
  }

  async findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null> {
    const id = this.storage.invoiceNumbers.get(invoiceNumber);
    if (!id) return null;
    return this.findById(id);
  }

  async listByOrganization(organizationId: string): Promise<Invoice[]> {
    return Array.from(this.storage.invoices.values())
      .filter((i) => i.organizationId === organizationId)
      .map((i) => ({ ...i }));
  }
}

export class PrismaAuditEventRepository implements IAuditEventRepository {
  constructor(private storage: SharedStorageState) {}

  async save(event: AuditRecord): Promise<void> {
    this.storage.auditEvents.set(event.id, { ...event });
  }

  async listByOrganization(organizationId: string, limit: number = 50): Promise<AuditRecord[]> {
    return Array.from(this.storage.auditEvents.values())
      .filter((e) => e.organizationId === organizationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map((e) => ({ ...e }));
  }
}

export class PrismaUnitOfWork implements IUnitOfWork {
  public users: IUserRepository;
  public organizations: IOrganizationRepository;
  public memberships: IMembershipRepository;
  public plans: IPlanVersionRepository;
  public orders: IOrderRepository;
  public entitlements: ICustomerEntitlementRepository;
  public projects: IProjectRepository;
  public services: IServiceRepository;
  public cartDrafts: ICartDraftRepository;
  public payments: IPaymentRepository;
  public subscriptions: ISubscriptionRepository;
  public invoices: IInvoiceRepository;
  public auditEvents: IAuditEventRepository;

  constructor(private storage: SharedStorageState = createInitialStorage()) {
    this.users = new PrismaUserRepository(this.storage);
    this.organizations = new PrismaOrganizationRepository(this.storage);
    this.memberships = new PrismaMembershipRepository(this.storage);
    this.plans = new PrismaPlanVersionRepository(this.storage);
    this.orders = new PrismaOrderRepository(this.storage);
    this.entitlements = new PrismaCustomerEntitlementRepository(this.storage);
    this.projects = new PrismaProjectRepository(this.storage);
    this.services = new PrismaServiceRepository(this.storage);
    this.cartDrafts = new PrismaCartDraftRepository(this.storage);
    this.payments = new PrismaPaymentRepository(this.storage);
    this.subscriptions = new PrismaSubscriptionRepository(this.storage);
    this.invoices = new PrismaInvoiceRepository(this.storage);
    this.auditEvents = new PrismaAuditEventRepository(this.storage);
  }

  cloneForNewProcess(): PrismaUnitOfWork {
    // Simulates a fresh process reboot pointing to the exact same persistent state
    return new PrismaUnitOfWork(this.storage);
  }

  async transaction<T>(work: (uow: IUnitOfWork) => Promise<T>): Promise<T> {
    const snapshot = cloneStorage(this.storage);
    const transactionalStorage = cloneStorage(this.storage);
    const txUow = new PrismaUnitOfWork(transactionalStorage);

    try {
      const result = await work(txUow);
      // On success, commit state
      Object.assign(this.storage, transactionalStorage);
      return result;
    } catch (error) {
      // Rollback to pre-transaction snapshot
      Object.assign(this.storage, snapshot);
      throw error;
    }
  }
}
