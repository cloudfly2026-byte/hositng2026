export interface ApiClientConfig {
  baseUrl?: string;
  token?: string;
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly responseBody: any
  ) {
    const detail =
      typeof responseBody === 'object' && responseBody?.message
        ? responseBody.message
        : statusText;
    super(`API Error ${status}: ${detail}`);
    this.name = 'ApiClientError';
  }
}

export interface CreateOrderPayload {
  organizationId: string;
  currency: string;
  billingCycle: string;
  items: Array<{
    planVersionId: string;
    quantity: number;
    claimedUnitPriceCents?: number;
  }>;
  idempotencyKey: string;
  customerEmail: string;
  redirectUrl: string;
}

export class ApiClient {
  private baseUrl: string;
  private token?: string;

  constructor(config?: ApiClientConfig) {
    this.baseUrl =
      config?.baseUrl ||
      (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ||
      'http://169.58.220.244:4000';
    this.token = config?.token;
  }

  setAuthToken(token: string | undefined): void {
    this.token = token;
    if (typeof window !== 'undefined' && window.localStorage) {
      if (token) {
        window.localStorage.setItem('velupi_auth_token', token);
      } else {
        window.localStorage.removeItem('velupi_auth_token');
      }
    }
  }

  getAuthToken(): string | undefined {
    if (!this.token && typeof window !== 'undefined' && window.localStorage) {
      this.token = window.localStorage.getItem('velupi_auth_token') || undefined;
    }
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let body: any = null;
      try {
        body = await response.json();
      } catch {
        body = await response.text();
      }
      throw new ApiClientError(response.status, response.statusText, body);
    }

    return response.json() as Promise<T>;
  }

  async createCheckoutOrder(payload: CreateOrderPayload): Promise<any> {
    return this.request<any>('/checkout/order', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getSubscriptions(orgId: string): Promise<any> {
    return this.request<any>(`/billing/subscriptions?orgId=${encodeURIComponent(orgId)}`);
  }

  async getInvoices(orgId: string): Promise<any> {
    return this.request<any>(`/billing/invoices?orgId=${encodeURIComponent(orgId)}`);
  }

  async evaluateSubscription(subscriptionId: string): Promise<any> {
    return this.request<any>(`/billing/subscriptions/${encodeURIComponent(subscriptionId)}/evaluate`, {
      method: 'POST',
    });
  }

  async reactivateSubscription(subscriptionId: string, orderId: string): Promise<any> {
    return this.request<any>(`/billing/subscriptions/${encodeURIComponent(subscriptionId)}/reactivate`, {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    });
  }

  async reconcileOrder(orderId: string): Promise<any> {
    return this.request<any>('/billing/reconcile', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    });
  }

  async listDnsZones(organizationId: string): Promise<any> {
    return this.request<any>(`/dns/zones?organizationId=${encodeURIComponent(organizationId)}`, {
      headers: {
        'x-tenant-id': organizationId,
      },
    });
  }

  async reconcileDnsZone(zoneId: string, organizationId: string): Promise<any> {
    return this.request<any>(`/dns/zones/${encodeURIComponent(zoneId)}/reconcile`, {
      method: 'POST',
      headers: {
        'x-tenant-id': organizationId,
      },
    });
  }

  async listHostingSites(organizationId?: string): Promise<any> {
    const headers: Record<string, string> = {};
    if (organizationId) {
      headers['x-tenant-id'] = organizationId;
    }
    return this.request<any>('/hosting/sites', { headers });
  }

  async listCloudApps(organizationId: string): Promise<any> {
    return this.request<any>(`/apps?organizationId=${encodeURIComponent(organizationId)}`, {
      headers: {
        'x-tenant-id': organizationId,
      },
    });
  }

  async restartCloudApp(appId: string, organizationId: string): Promise<any> {
    return this.request<any>(`/apps/${encodeURIComponent(appId)}/restart`, {
      method: 'POST',
      headers: {
        'x-tenant-id': organizationId,
      },
    });
  }

  async stopCloudApp(appId: string, organizationId: string): Promise<any> {
    return this.request<any>(`/apps/${encodeURIComponent(appId)}/stop`, {
      method: 'POST',
      headers: {
        'x-tenant-id': organizationId,
      },
    });
  }

  async getCloudAppLogs(appId: string, organizationId: string): Promise<any> {
    return this.request<any>(`/apps/${encodeURIComponent(appId)}/logs`, {
      headers: {
        'x-tenant-id': organizationId,
      },
    });
  }
}

export const defaultApiClient = new ApiClient();
