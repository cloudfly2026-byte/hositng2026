import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient, ApiClientError } from './api-client';

describe('ApiClient (apps/web)', () => {
  let client: ApiClient;
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = mockFetch;
    client = new ApiClient({ baseUrl: 'http://test-api:4000' });
  });

  it('sets and includes Bearer authentication token in request headers', async () => {
    client.setAuthToken('my-secret-jwt');
    expect(client.getAuthToken()).toBe('my-secret-jwt');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ subscriptions: [] }),
    });

    await client.getSubscriptions('org-123');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://test-api:4000/billing/subscriptions?orgId=org-123',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-secret-jwt',
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('sends POST /checkout/order with correct body and returns order & session', async () => {
    const mockResponse = {
      order: { id: 'ord-1', totalCents: 100000 },
      session: { sessionId: 'ses-1', checkoutUrl: 'https://checkout.wompi.co/p/123' },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await client.createCheckoutOrder({
      organizationId: 'org-abc',
      currency: 'COP',
      billingCycle: 'ANNUAL',
      items: [{ planVersionId: 'pv-1', quantity: 1 }],
      idempotencyKey: 'idem-123',
      customerEmail: 'customer@velupi.com',
      redirectUrl: 'https://app.velupi.com/billing',
    });

    expect(result).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://test-api:4000/checkout/order',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          organizationId: 'org-abc',
          currency: 'COP',
          billingCycle: 'ANNUAL',
          items: [{ planVersionId: 'pv-1', quantity: 1 }],
          idempotencyKey: 'idem-123',
          customerEmail: 'customer@velupi.com',
          redirectUrl: 'https://app.velupi.com/billing',
        }),
      })
    );
  });

  it('throws ApiClientError with server response status and message when request fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({ message: 'Cross-tenant access forbidden' }),
    });

    await expect(client.getSubscriptions('org-intruder')).rejects.toThrow(
      ApiClientError
    );
  });

  it('sends GET /dns/zones with x-tenant-id header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 'zn-1', domain: 'velupi.com' }],
    });

    const zones = await client.listDnsZones('org-velupi');
    expect(zones).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://test-api:4000/dns/zones?organizationId=org-velupi',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-tenant-id': 'org-velupi',
        }),
      })
    );
  });

  it('sends POST /apps/:id/restart with x-tenant-id header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: 'App restarted' }),
    });

    const res = await client.restartCloudApp('app-1', 'org-velupi');
    expect(res.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://test-api:4000/apps/app-1/restart',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-tenant-id': 'org-velupi',
        }),
      })
    );
  });

  it('sends POST /dns/zones/:id/records with tenant header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'rec-1', name: 'staging', type: 'A', value: '1.2.3.4' }),
    });

    const record = await client.addDnsRecord(
      'zn-10',
      { name: 'staging', type: 'A', value: '1.2.3.4', ttl: 300 },
      'org-pilot'
    );
    expect(record.name).toBe('staging');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://test-api:4000/dns/zones/zn-10/records',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-tenant-id': 'org-pilot' }),
        body: JSON.stringify({ name: 'staging', type: 'A', value: '1.2.3.4', ttl: 300 }),
      })
    );
  });

  it('sends DELETE /dns/zones/:id/records/:recId with tenant header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const res = await client.deleteDnsRecord('zn-10', 'rec-1', 'org-pilot');
    expect(res.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://test-api:4000/dns/zones/zn-10/records/rec-1',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({ 'x-tenant-id': 'org-pilot' }),
      })
    );
  });

  it('sends PATCH /hosting/sites/:domain/php with tenant header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'SUCCESS', message: 'PHP updated' }),
    });

    const res = await client.updateSitePhp('velupi.com', '8.3', 'org-pilot');
    expect(res.status).toBe('SUCCESS');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://test-api:4000/hosting/sites/velupi.com/php',
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({ 'x-tenant-id': 'org-pilot' }),
        body: JSON.stringify({ phpVersion: '8.3' }),
      })
    );
  });

  it('sends POST /hosting/sites/:domain/ssl with tenant header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'SUCCESS', message: 'SSL enabled' }),
    });

    const res = await client.enableSiteSsl('velupi.com', 'org-pilot');
    expect(res.status).toBe('SUCCESS');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://test-api:4000/hosting/sites/velupi.com/ssl',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-tenant-id': 'org-pilot' }),
      })
    );
  });

  it('sends GET /catalog/plans and returns plan listing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ code: 'wp-starter', name: 'WordPress Starter' }],
    });

    const plans = await client.getCatalogPlans();
    expect(plans).toHaveLength(1);
    expect(plans[0].code).toBe('wp-starter');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://test-api:4000/catalog/plans',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    );
  });

  it('sends POST /cart and returns created CartDraft', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'cart-123', status: 'ACTIVE', totalCents: 41650000 }),
    });

    const cart = await client.createCart({
      planCode: 'wp-starter',
      billingCycle: 'ANNUAL',
      currency: 'COP',
    });

    expect(cart.id).toBe('cart-123');
    expect(cart.status).toBe('ACTIVE');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://test-api:4000/cart',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          planCode: 'wp-starter',
          billingCycle: 'ANNUAL',
          currency: 'COP',
        }),
      })
    );
  });

  it('sends POST /auth/register and POST /auth/login correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: 'u-1', email: 'user@velupi.com' },
        tokens: { accessToken: 'at-1', refreshToken: 'rt-1' },
      }),
    });

    const reg = await client.register({
      email: 'user@velupi.com',
      password: 'Password123!',
      fullName: 'New User',
      organizationName: 'User Org',
    });
    expect(reg.user.email).toBe('user@velupi.com');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: 'u-1', email: 'user@velupi.com' },
        tokens: { accessToken: 'at-1', refreshToken: 'rt-1' },
      }),
    });

    const login = await client.login({
      email: 'user@velupi.com',
      password: 'Password123!',
    });
    expect(login.tokens.accessToken).toBe('at-1');
  });

  it('sends GET /orders/:orderId and GET /provisioning/jobs/:jobId correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'ord-123', status: 'PAID' }),
    });

    const order = await client.getOrder('ord-123');
    expect(order.id).toBe('ord-123');
    expect(order.status).toBe('PAID');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jobId: 'job-999', status: 'ACTIVE', progressPercentage: 100 }),
    });

    const job = await client.getProvisioningJob('job-999', 'org-123');
    expect(job.progressPercentage).toBe(100);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://test-api:4000/provisioning/jobs/job-999',
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-tenant-id': 'org-123' }),
      })
    );
  });

  it('sends GET /auth/oauth/:provider/start with returnTo query param', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth?...',
        state: 'st-123',
        provider: 'GOOGLE',
      }),
    });

    const oauth = await client.getOAuthStart('google', '/checkout?cartId=c-1');
    expect(oauth.state).toBe('st-123');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://test-api:4000/auth/oauth/google/start?returnTo=%2Fcheckout%3FcartId%3Dc-1',
      expect.anything()
    );
  });
});



