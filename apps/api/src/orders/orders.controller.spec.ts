import { describe, it, expect, beforeEach } from 'vitest';
import { OrdersController } from './orders.controller';
import {
  ProductCatalogService,
  ProductCategory,
  BillingCycle,
  OrderService,
  OrderStatus,
} from '@cloudfly/domain';
import { NotFoundException } from '@nestjs/common';

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

  it('throws NotFoundException for unknown order ID', async () => {
    await expect(controller.getOrder('non-existent-order')).rejects.toThrow(NotFoundException);
  });
});
