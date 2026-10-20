import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminCustomersController } from './customers.controller';
import {
  AuthenticationService,
  CustomerDeprovisioningService,
  HostingManagementService,
  SubscriptionService,
  Argon2PasswordHasher,
  JwtSecurityService,
} from '@cloudfly/domain';
import { PrismaUnitOfWork } from '@cloudfly/persistence';

describe('AdminCustomersController (TDD - Platform Operator Customers Module)', () => {
  let controller: AdminCustomersController;
  let authService: AuthenticationService;
  let deprovisioningService: CustomerDeprovisioningService;
  let hostingService: HostingManagementService;
  let subscriptionService: SubscriptionService;
  let uow: PrismaUnitOfWork;

  const mockTransport = {
    executeCommand: vi.fn().mockResolvedValue({ returnCode: 0, output: 'OK' }),
  };

  beforeEach(async () => {
    uow = new PrismaUnitOfWork();
    const passwordHasher = new Argon2PasswordHasher();
    const jwtService = new JwtSecurityService('test_jwt_secret_admin_suite_2026');

    authService = new AuthenticationService(passwordHasher, jwtService, uow);
    hostingService = new HostingManagementService(mockTransport as any);
    subscriptionService = new SubscriptionService(uow);
    deprovisioningService = new CustomerDeprovisioningService(
      authService,
      hostingService,
      uow,
      mockTransport as any
    );

    controller = new AdminCustomersController(
      authService,
      deprovisioningService,
      hostingService,
      uow,
      subscriptionService
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should list all customers registered in the platform', async () => {
    // Register 2 customers
    await authService.register({
      email: 'customer1@test.com',
      fullName: 'Cliente Uno',
      organizationName: 'Org Uno',
      password: 'Password123!',
    });

    await authService.register({
      email: 'customer2@test.com',
      fullName: 'Cliente Dos',
      organizationName: 'Org Dos',
      password: 'Password123!',
    });

    const result = await controller.listCustomers();
    expect(result.total).toBe(2);
    expect(result.customers).toHaveLength(2);

    const c1 = result.customers.find((c: any) => c.email === 'customer1@test.com');
    expect(c1).toBeDefined();
    expect(c1.fullName).toBe('Cliente Uno');
    expect(c1.organization.name).toBe('Org Uno');
    expect(c1.role).toBe('OWNER');
    expect(c1.status).toBe('ACTIVE');
  });

  it('should create a new customer and verify their email automatically', async () => {
    const created = await controller.createCustomer({
      email: 'newuser@empresa.com',
      fullName: 'Carlos Sanchez',
      organizationName: 'Sanchez Corp',
    });

    expect(created.success).toBe(true);
    expect(created.customer.email).toBe('newuser@empresa.com');
    expect(created.customer.emailVerified).toBe(true);

    const list = await controller.listCustomers();
    expect(list.customers.some((c: any) => c.email === 'newuser@empresa.com')).toBe(true);
  });

  it('should update customer profile details', async () => {
    const created = await controller.createCustomer({
      email: 'pedro@update.com',
      fullName: 'Pedro Original',
      organizationName: 'Pedro Org',
    });

    const updated = await controller.updateCustomer(created.customer.id, {
      fullName: 'Pedro Modificado',
    });

    expect(updated.success).toBe(true);
    expect(updated.customer.fullName).toBe('Pedro Modificado');
  });

  it('should suspend and reactivate a customer', async () => {
    const created = await controller.createCustomer({
      email: 'suspendme@test.com',
      fullName: 'Suspended User',
      organizationName: 'Suspended Org',
    });

    // Create a subscription for their organization
    subscriptionService.createSubscriptionFromPaidOrder({
      id: `ord-test-${Date.now()}`,
      organizationId: created.customer.organization.id,
      orderNumber: 'ORD-1001',
      status: 'PAID' as any,
      currency: 'COP',
      subtotalCents: 10000,
      taxCents: 1900,
      totalCents: 11900,
      items: [
        {
          id: 'item-1',
          planVersionId: 'web-pro',
          billingCycle: 'MONTHLY' as any,
          unitPriceCents: 10000,
          quantity: 1,
        },
      ],
      idempotencyKey: `idem-${Date.now()}`,
      createdAt: new Date(),
    });

    // Suspend
    const suspendResult = await controller.suspendCustomer(created.customer.id);
    expect(suspendResult.success).toBe(true);
    expect(suspendResult.status).toBe('SUSPENDED');

    // Verify status in detail
    const detailAfterSuspend = await controller.getCustomer(created.customer.id);
    expect(detailAfterSuspend.status).toBe('SUSPENDED');

    // Reactivate
    const reactivateResult = await controller.reactivateCustomer(created.customer.id);
    expect(reactivateResult.success).toBe(true);
    expect(reactivateResult.status).toBe('ACTIVE');

    const detailAfterReactivate = await controller.getCustomer(created.customer.id);
    expect(detailAfterReactivate.status).toBe('ACTIVE');
  });

  it('should deprovision (dar de baja) a customer and delete their infrastructure and DB records', async () => {
    const created = await controller.createCustomer({
      email: 'deleteclient@test.com',
      fullName: 'Delete Client',
      organizationName: 'Delete Org',
    });

    const delResult = await controller.deprovisionCustomer(created.customer.id);
    expect(delResult.success).toBe(true);
    expect(delResult.result.purgedUserIds).toContain(created.customer.id);

    // Verify user is gone
    await expect(controller.getCustomer(created.customer.id)).rejects.toThrow();
  });
});
