import { describe, it, expect, beforeEach } from 'vitest';
import { BillingController } from './billing.controller';
import {
  SubscriptionService,
  OrderService,
  ProductCatalogService,
  ProductCategory,
  BillingCycle,
  OrderStatus,
} from '@cloudfly/domain';
import { AuthorizedContext } from '@cloudfly/contracts';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('BillingController (API Subscriptions & Invoicing)', () => {
  let catalog: ProductCatalogService;
  let orderService: OrderService;
  let subscriptionService: SubscriptionService;
  let controller: BillingController;
  let planVersionId: string;

  const tenantAContext: AuthorizedContext = {
    userId: 'usr-1',
    organizationId: 'org-tenant-a',
    roles: ['OWNER'],
    permissions: ['*'],
  };

  const tenantBContext: AuthorizedContext = {
    userId: 'usr-2',
    organizationId: 'org-tenant-b',
    roles: ['DEVELOPER'],
    permissions: ['services:read'],
  };

  beforeEach(() => {
    catalog = new ProductCatalogService();
    const prod = catalog.createProduct({
      name: 'Velupi VPS',
      code: 'velupi-vps',
      category: ProductCategory.VPS,
    });
    const plan = catalog.createPlan({
      productId: prod.id,
      name: 'VPS Pro',
      code: 'vps-pro',
      infrastructureMode: 'DEDICATED',
    });
    const pv = catalog.publishPlanVersion({
      planId: plan.id,
      version: 1,
      quotas: {
        cpuMilli: 4000,
        memoryMb: 8192,
        diskMb: 102400,
        bandwidthMb: 500000,
        maxApps: 20,
        maxDomains: 20,
        maxDatabases: 20,
        hermesAccess: true,
      },
      prices: [
        { currency: 'COP', billingCycle: BillingCycle.MONTHLY, priceCents: 15000000 },
      ],
      effectiveFrom: new Date('2026-01-01'),
    });
    planVersionId = pv.id;

    orderService = new OrderService(catalog);
    subscriptionService = new SubscriptionService();
    controller = new BillingController(subscriptionService);
  });

  it('lists subscriptions strictly scoped to the requesting tenant', async () => {
    // Seed order & subscription for Tenant A
    const orderA = orderService.createOrder({
      organizationId: 'org-tenant-a',
      currency: 'COP',
      billingCycle: BillingCycle.MONTHLY,
      items: [{ planVersionId, quantity: 1 }],
      idempotencyKey: 'idem-sub-a',
    });
    orderA.status = OrderStatus.PAID;
    subscriptionService.createSubscriptionFromPaidOrder(orderA);

    // Seed order & subscription for Tenant B
    const orderB = orderService.createOrder({
      organizationId: 'org-tenant-b',
      currency: 'COP',
      billingCycle: BillingCycle.MONTHLY,
      items: [{ planVersionId, quantity: 1 }],
      idempotencyKey: 'idem-sub-b',
    });
    orderB.status = OrderStatus.PAID;
    subscriptionService.createSubscriptionFromPaidOrder(orderB);

    const subsA = await controller.getSubscriptions(tenantAContext);
    expect(subsA.length).toBe(1);
    expect(subsA[0].organizationId).toBe('org-tenant-a');

    const subsB = await controller.getSubscriptions(tenantBContext);
    expect(subsB.length).toBe(1);
    expect(subsB[0].organizationId).toBe('org-tenant-b');
  });

  it('lists invoices strictly scoped to the requesting tenant', async () => {
    const orderA = orderService.createOrder({
      organizationId: 'org-tenant-a',
      currency: 'COP',
      billingCycle: BillingCycle.MONTHLY,
      items: [{ planVersionId, quantity: 1 }],
      idempotencyKey: 'idem-inv-a',
    });
    orderA.status = OrderStatus.PAID;
    subscriptionService.generateInvoiceForOrder(orderA);

    const invoicesA = await controller.getInvoices(tenantAContext);
    expect(invoicesA.length).toBe(1);
    expect(invoicesA[0].organizationId).toBe('org-tenant-a');

    const invoicesB = await controller.getInvoices(tenantBContext);
    expect(invoicesB.length).toBe(0);
  });

  it('retrieves an invoice detail by ID when owned by the tenant', async () => {
    const orderA = orderService.createOrder({
      organizationId: 'org-tenant-a',
      currency: 'COP',
      billingCycle: BillingCycle.MONTHLY,
      items: [{ planVersionId, quantity: 1 }],
      idempotencyKey: 'idem-inv-detail',
    });
    orderA.status = OrderStatus.PAID;
    const inv = subscriptionService.generateInvoiceForOrder(orderA);

    const result = await controller.getInvoiceById(inv.id, tenantAContext);
    expect(result.id).toBe(inv.id);
    expect(result.invoiceNumber).toBe(inv.invoiceNumber);
  });

  it('throws ForbiddenException when accessing an invoice of another tenant (cross-tenant security)', async () => {
    const orderA = orderService.createOrder({
      organizationId: 'org-tenant-a',
      currency: 'COP',
      billingCycle: BillingCycle.MONTHLY,
      items: [{ planVersionId, quantity: 1 }],
      idempotencyKey: 'idem-cross-inv',
    });
    orderA.status = OrderStatus.PAID;
    const inv = subscriptionService.generateInvoiceForOrder(orderA);

    // Tenant B attempts to access Tenant A's invoice
    await expect(controller.getInvoiceById(inv.id, tenantBContext)).rejects.toThrow(
      ForbiddenException
    );
  });

  it('throws NotFoundException when invoice does not exist', async () => {
    await expect(controller.getInvoiceById('non-existent-inv', tenantAContext)).rejects.toThrow(
      NotFoundException
    );
  });

  it('cancels subscription and prevents cross-tenant cancellation', async () => {
    const orderA = orderService.createOrder({
      organizationId: 'org-tenant-a',
      currency: 'COP',
      billingCycle: BillingCycle.MONTHLY,
      items: [{ planVersionId, quantity: 1 }],
      idempotencyKey: 'idem-cancel-sub',
    });
    orderA.status = OrderStatus.PAID;
    const subA = subscriptionService.createSubscriptionFromPaidOrder(orderA);

    // Tenant B cannot cancel Tenant A's subscription
    await expect(controller.cancelSubscription(subA.id, tenantBContext)).rejects.toThrow(
      ForbiddenException
    );

    // Tenant A cancels successfully
    const cancelled = await controller.cancelSubscription(subA.id, tenantAContext);
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.cancelledAt).toBeDefined();
  });
});
