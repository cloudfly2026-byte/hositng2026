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
});
