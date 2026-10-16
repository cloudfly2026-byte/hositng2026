import { CustomerUser, CustomerOrganization, Order } from '../commerce/onboarding-order';
import { Product, Plan, PlanVersion } from '../commerce/catalog';
import { CustomerEntitlement } from '../commerce/provisioning-orchestrator';
import { Project, Service } from '../projects/project-service';
import { Membership } from '../identity/rbac';
import { CartDraft } from '../commerce/cart';
import { Subscription, Invoice } from '../commerce/subscription-service';

export interface PaymentRecord {
  id: string;
  orderId: string;
  provider: string;
  providerTransactionId?: string;
  status: string;
  amountCents: number;
  currency: string;
  signatureVerified: boolean;
  rawPayload?: Record<string, any>;
  createdAt: Date;
}

export interface AuditRecord {
  id: string;
  organizationId?: string;
  actorUserId?: string;
  action: string;
  resource: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ICartDraftRepository {
  save(draft: CartDraft): Promise<void>;
  findById(id: string): Promise<CartDraft | null>;
  findByAnonymousTokenHash(hash: string): Promise<CartDraft | null>;
  delete(id: string): Promise<void>;
}

export interface IPaymentRepository {
  save(payment: PaymentRecord): Promise<void>;
  findById(id: string): Promise<PaymentRecord | null>;
  findByOrderId(orderId: string): Promise<PaymentRecord[]>;
}

export interface ISubscriptionRepository {
  save(subscription: Subscription): Promise<void>;
  findById(id: string): Promise<Subscription | null>;
  listByOrganization(organizationId: string): Promise<Subscription[]>;
  findByOrderId(orderId: string): Promise<Subscription | null>;
}

export interface IInvoiceRepository {
  save(invoice: Invoice): Promise<void>;
  findById(id: string): Promise<Invoice | null>;
  findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null>;
  listByOrganization(organizationId: string): Promise<Invoice[]>;
}

export interface IAuditEventRepository {
  save(event: AuditRecord): Promise<void>;
  listByOrganization(organizationId: string, limit?: number): Promise<AuditRecord[]>;
}

export interface IUserRepository {
  save(user: CustomerUser): Promise<void>;
  findById(id: string): Promise<CustomerUser | null>;
  findByEmail(email: string): Promise<CustomerUser | null>;
  delete(id: string): Promise<void>;
}

export interface IOrganizationRepository {
  save(org: CustomerOrganization): Promise<void>;
  findById(id: string): Promise<CustomerOrganization | null>;
  findBySlug(slug: string): Promise<CustomerOrganization | null>;
  listByUser(userId: string): Promise<CustomerOrganization[]>;
}

export interface IMembershipRepository {
  save(membership: Membership): Promise<void>;
  findById(id: string): Promise<Membership | null>;
  findByUserAndOrg(userId: string, organizationId: string): Promise<Membership | null>;
  listByOrganization(organizationId: string): Promise<Membership[]>;
  delete(id: string): Promise<void>;
}

export interface IPlanVersionRepository {
  saveProduct(product: Product): Promise<void>;
  savePlan(plan: Plan): Promise<void>;
  savePlanVersion(planVersion: PlanVersion): Promise<void>;
  findPlanVersionById(id: string): Promise<PlanVersion | null>;
  findPlanById(id: string): Promise<Plan | null>;
  findProductById(id: string): Promise<Product | null>;
  listActiveProducts(): Promise<Product[]>;
}

export interface IOrderRepository {
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
  findByIdempotencyKey(key: string): Promise<Order | null>;
  listByOrganization(organizationId: string): Promise<Order[]>;
}

export interface ICustomerEntitlementRepository {
  save(entitlement: CustomerEntitlement): Promise<void>;
  findById(id: string): Promise<CustomerEntitlement | null>;
  listByOrganization(organizationId: string): Promise<CustomerEntitlement[]>;
}

export interface IProjectRepository {
  save(project: Project): Promise<void>;
  findById(id: string): Promise<Project | null>;
  findByOrgAndSlug(organizationId: string, slug: string): Promise<Project | null>;
  listByOrganization(organizationId: string): Promise<Project[]>;
}

export interface IServiceRepository {
  save(service: Service): Promise<void>;
  findById(id: string): Promise<Service | null>;
  findByProjectAndSlug(projectId: string, slug: string): Promise<Service | null>;
  listByProject(projectId: string): Promise<Service[]>;
  listByOrganization(organizationId: string): Promise<Service[]>;
}

export interface IUnitOfWork {
  users: IUserRepository;
  organizations: IOrganizationRepository;
  memberships: IMembershipRepository;
  orders: IOrderRepository;
  entitlements: ICustomerEntitlementRepository;
  projects: IProjectRepository;
  services: IServiceRepository;
  plans: IPlanVersionRepository;
  cartDrafts?: ICartDraftRepository;
  payments?: IPaymentRepository;
  subscriptions?: ISubscriptionRepository;
  invoices?: IInvoiceRepository;
  auditEvents?: IAuditEventRepository;
  transaction<T>(work: (uow: IUnitOfWork) => Promise<T>): Promise<T>;
}

