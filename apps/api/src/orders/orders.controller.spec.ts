import { describe, it, expect, beforeEach } from 'vitest';
import { OrdersController } from './orders.controller';
import {
  ProductCatalogService,
  ProductCategory,
  BillingCycle,
  OrderService,
  OrderStatus,
} from '@cloudfly/domain';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('OrdersController (GET /orders/:orderId)', () => {
  let catalog: ProductCatalogService;
  let orderService: OrderService;
  let controller: OrdersController;
  let testOrderId: string;
  let testOrderNumber: string;

  beforeEach(() => {
    catalog = new ProductCatalogService();
    const prod = catalog.createProduct({
      name: 'Cloud Apps',
      code: 'cloud-apps',
      category: ProductCategory.CLOUD_APPS,
    });
    const plan = catalog.createPlan({
      productId: prod.id,
      name: 'Pro App',
      code: 'app-pro',
      infrastructureMode: 'SHARED',
    });
    const ver = catalog.publishPlanVersion({
      planId: plan.id,
      version: 1,
      quotas: {
        cpuMilli: 1000,
        memoryMb: 1024,
        diskMb: 20480,
        bandwidthMb: 100000,
        maxApps: 5,
        maxDomains: 2,
        maxDatabases: 2,
        hermesAccess: false,
      },
      prices: [
        { currency: 'COP', billingCycle: BillingCycle.MONTHLY, priceCents: 5500000 },
      ],
      effectiveFrom: new Date('2026-01-01'),
    });

    orderService = new OrderService(catalog);
    controller = new OrdersController(orderService);

    const order = orderService.createOrder({
      organizationId: 'org-client-test',
      currency: 'COP',
      billingCycle: BillingCycle.MONTHLY,
      items: [{ planVersionId: ver.id, quantity: 1 }],
      idempotencyKey: 'idem-order-test-1',
    });

    testOrderId = order.id;
    testOrderNumber = order.orderNumber;
  });

  it('retrieves an existing order by ID', async () => {
    const order = await controller.getOrder(testOrderId);
    expect(order.id).toBe(testOrderId);
    expect(order.status).toBe(OrderStatus.PENDING_PAYMENT);
    expect(order.totalCents).toBe(6545000); // 5500000 + 19% VAT
  });

  it('retrieves an existing order by orderNumber', async () => {
    const order = await controller.getOrder(testOrderNumber);
    expect(order.id).toBe(testOrderId);
  });

  it('retrieves an existing order from secondary ordersStore if present', async () => {
    const secondaryMap = new Map<string, any>();
    const extraOrder = { id: 'ord-extra-999', orderNumber: 'VEL-999999', status: OrderStatus.PAID };
    secondaryMap.set('ord-extra-999', extraOrder);

    const controllerWithFallback = new OrdersController(orderService, secondaryMap as any);
    const found = await controllerWithFallback.getOrder('ord-extra-999');
    expect(found.id).toBe('ord-extra-999');
    expect(found.status).toBe(OrderStatus.PAID);

    const foundByNumber = await controllerWithFallback.getOrder('VEL-999999');
    expect(foundByNumber.id).toBe('ord-extra-999');
  });

  it('retrieves an existing order from uow database if present', async () => {
    const mockUow = {
      orders: {
        findById: async (id: string) =>
          id === 'ord-db-123' ? { id: 'ord-db-123', orderNumber: 'VEL-123456', status: OrderStatus.PAID } : null,
        findByOrderNumber: async (num: string) =>
          num === 'VEL-123456' ? { id: 'ord-db-123', orderNumber: 'VEL-123456', status: OrderStatus.PAID } : null,
      },
    };

    const controllerWithUow = new OrdersController(orderService, undefined, mockUow as any);
    const found = await controllerWithUow.getOrder('ord-db-123');
    expect(found.id).toBe('ord-db-123');

    const foundByNumber = await controllerWithUow.getOrder('VEL-123456');
    expect(foundByNumber.id).toBe('ord-db-123');
  });

  it('rejects accessing an order using raw Wompi transaction ID if no pre-existing payment links it', async () => {
    // Rule 2: Transaction ID does not substitute internal order ID
    await expect(controller.getOrder('1109555-1792243444-91875')).rejects.toThrow(NotFoundException);
  });

  it('allows access via transaction ID only if authoritative payment record links it to the order', async () => {
    const mockUow = {
      payments: {
        findByProviderTransactionId: async (trxId: string) =>
          trxId === 'trx-authorized-linked' ? { orderId: testOrderId } : null,
      },
      orders: {
        findById: async (id: string) => (id === testOrderId ? orderService.getOrderById(testOrderId) : null),
      },
    };

    const controllerWithPaymentLink = new OrdersController(orderService, undefined, mockUow as any);
    const found = await controllerWithPaymentLink.getOrder('trx-authorized-linked');
    expect(found.id).toBe(testOrderId);
  });

  it('strictly blocks cross-tenant access: throws ForbiddenException when requesting user belongs to another organization', async () => {
    const foreignUser = {
      userId: 'usr-attacker-007',
      organizationId: 'org-attacker-tenant',
      roles: ['ADMIN' as const],
      permissions: ['orders:read'],
    };

    await expect(
      controller.getOrder(testOrderId, { user: foreignUser as any })
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows access when user belongs to the owning organization or is a platform operator', async () => {
    const legitimateUser = {
      userId: 'usr-legit-001',
      organizationId: 'org-client-test', // Same as sampleOrder
      roles: ['ADMIN' as const],
      permissions: ['orders:read'],
    };

    const found = await controller.getOrder(testOrderId, { user: legitimateUser as any });
    expect(found.id).toBe(testOrderId);

    const operatorUser = {
      userId: 'usr-operator-001',
      organizationId: 'org-velupi-internal',
      isOperator: true,
      roles: ['OWNER' as const],
      permissions: ['*'],
    };

    const foundByOperator = await controller.getOrder(testOrderId, { user: operatorUser as any });
    expect(foundByOperator.id).toBe(testOrderId);
  });

  it('strictly blocks customer OWNER of another organization from accessing foreign order', async () => {
    // Security Rule 7 & 8: Customer OWNER is NOT an operator and cannot access other tenants' orders
    const foreignOwner = {
      userId: 'usr-foreign-owner',
      organizationId: 'org-foreign-corp',
      roles: ['OWNER' as const],
      isOperator: false,
      permissions: ['*'],
    };

    await expect(
      controller.getOrder(testOrderId, { user: foreignOwner as any })
    ).rejects.toThrow(ForbiddenException);
  });

  it('listOrders returns only orders belonging to requesting user organization', async () => {
    const legitimateUser = {
      userId: 'usr-legit-001',
      organizationId: 'org-client-test',
      roles: ['ADMIN' as const],
      isOperator: false,
    };

    const orders = await controller.listOrders({ user: legitimateUser as any });
    expect(orders.length).toBeGreaterThan(0);
    expect(orders.every((o) => o.organizationId === 'org-client-test')).toBe(true);
  });

  it('listOrders strictly blocks non-operator from querying another organization', async () => {
    const legitimateUser = {
      userId: 'usr-legit-001',
      organizationId: 'org-client-test',
      roles: ['OWNER' as const],
      isOperator: false,
    };

    await expect(
      controller.listOrders({ user: legitimateUser as any }, 'org-foreign-corp')
    ).rejects.toThrow(ForbiddenException);
  });

  it('listOrders allows platform operator to inspect all orders', async () => {
    const operatorUser = {
      userId: 'usr-operator-001',
      organizationId: 'org-velupi-internal',
      isOperator: true,
      roles: ['SUPER_ADMIN' as const],
    };

    const allOrders = await controller.listOrders({ user: operatorUser as any });
    expect(allOrders.length).toBeGreaterThanOrEqual(1);
  });

  it('throws NotFoundException for unknown order ID', async () => {
    await expect(controller.getOrder('non-existent-order')).rejects.toThrow(NotFoundException);
  });
});

