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
  primaryDomain?: string;
}

export class ApiClient {
  private baseUrl: string;
  private token?: string;

  constructor(config?: ApiClientConfig) {
    this.baseUrl =
      config?.baseUrl ||
      (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ||
      'https://api.velupi.com';
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

  async logout(): Promise<void> {
    const refreshToken =
      typeof window !== 'undefined'
        ? window.localStorage?.getItem('velupi_refresh_token') || undefined
        : undefined;

    // Immediately remove credentials from memory and local storage
    this.setAuthToken(undefined);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage?.removeItem('velupi_access_token');
        window.localStorage?.removeItem('velupi_auth_token');
        window.localStorage?.removeItem('velupi_refresh_token');
        window.localStorage?.removeItem('velupi_active_org_id');
        window.sessionStorage?.clear();
      } catch {
        // Ignore storage access errors
      }

      // Purge session cookies across root and possible subdomains (.velupi.com, app.velupi.com, etc.)
      const cookieNames = ['velupi_session', 'velupi_access_token', 'velupi_refresh_token'];
      const domains = ['', '; domain=velupi.com', '; domain=.velupi.com', '; domain=app.velupi.com'];
      for (const name of cookieNames) {
        for (const dom of domains) {
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0${dom}`;
        }
      }
    }

    // Call backend revocation in background/best-effort
    try {
      await this.request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Non-blocking fallback
    }
  }

  async requestAccessCode(email: string, fullName?: string): Promise<{
    status: string;
    isNewUser: boolean;
    cooldownSeconds: number;
    email: string;
  }> {
    return this.request('/auth/request-code', {
      method: 'POST',
      body: JSON.stringify({ email, fullName }),
    });
  }

  async getDestination(cartId?: string): Promise<{ destination: string; reason: string }> {
    const q = cartId ? `?cartId=${encodeURIComponent(cartId)}` : '';
    return this.request<{ destination: string; reason: string }>(`/me/destination${q}`);
  }

  async verifyAccessCode(email: string, code: string): Promise<any> {
    return this.request('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  }

  async listOrders(organizationId?: string): Promise<any[]> {
    const query = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : '';
    return this.request<any[]>(`/orders${query}`);
  }

  async createCheckoutOrder(payload: CreateOrderPayload): Promise<any> {
    return this.request<any>('/checkout/order', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async checkDomainAvailability(domain: string): Promise<{ available: boolean; reason?: string }> {
    return this.request<{ available: boolean; reason?: string }>(
      `/catalog/check-domain?domain=${encodeURIComponent(domain)}`
    );
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

  async reconcileOrder(orderId: string, transactionId?: string): Promise<any> {
    if (transactionId) {
      return this.request<any>(`/orders/${encodeURIComponent(orderId)}/reconcile`, {
        method: 'POST',
        body: JSON.stringify({ transactionId }),
      });
    }
    return this.request<any>('/billing/reconcile', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    });
  }

  async cancelOrder(orderId: string): Promise<any> {
    return this.request<any>(`/orders/${encodeURIComponent(orderId)}/cancel`, {
      method: 'POST',
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

  async verifyHostingDns(domain: string, organizationId?: string): Promise<any> {
    const headers: Record<string, string> = {};
    if (organizationId) {
      headers['x-tenant-id'] = organizationId;
    }
    return this.request<any>('/hosting/verify-dns', {
      method: 'POST',
      headers,
      body: JSON.stringify({ domain }),
    });
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

  async addDnsRecord(
    zoneId: string,
    record: { name: string; type: string; value: string; ttl?: number; priority?: number },
    organizationId: string
  ): Promise<any> {
    return this.request<any>(`/dns/zones/${encodeURIComponent(zoneId)}/records`, {
      method: 'POST',
      headers: {
        'x-tenant-id': organizationId,
      },
      body: JSON.stringify(record),
    });
  }

  async deleteDnsRecord(
    zoneId: string,
    recordId: string,
    organizationId: string
  ): Promise<any> {
    return this.request<any>(
      `/dns/zones/${encodeURIComponent(zoneId)}/records/${encodeURIComponent(recordId)}`,
      {
        method: 'DELETE',
        headers: {
          'x-tenant-id': organizationId,
        },
      }
    );
  }

  async updateSitePhp(
    domain: string,
    phpVersion: string,
    organizationId?: string
  ): Promise<any> {
    const headers: Record<string, string> = {};
    if (organizationId) {
      headers['x-tenant-id'] = organizationId;
    }
    return this.request<any>(`/hosting/sites/${encodeURIComponent(domain)}/php`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ phpVersion }),
    });
  }

  async enableSiteSsl(domain: string, organizationId?: string): Promise<any> {
    const headers: Record<string, string> = {};
    if (organizationId) {
      headers['x-tenant-id'] = organizationId;
    }
    return this.request<any>(`/hosting/sites/${encodeURIComponent(domain)}/ssl`, {
      method: 'POST',
      headers,
    });
  }

  async installCustomSsl(
    payload: { domain: string; sslCertificate: string; sslKey: string; sslBundle?: string },
    organizationId?: string
  ): Promise<any> {
    const headers: Record<string, string> = {};
    if (organizationId) {
      headers['x-tenant-id'] = organizationId;
    }
    return this.request<any>('/hosting/ssl/custom', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  }

  async listFiles(path?: string, organizationId?: string): Promise<any[]> {
    const headers: Record<string, string> = {};
    if (organizationId) {
      headers['x-tenant-id'] = organizationId;
    }
    const q = path ? `?path=${encodeURIComponent(path)}` : '';
    return this.request<any[]>(`/hosting/files${q}`, { headers });
  }

  async createDirectory(path: string, organizationId?: string): Promise<any> {
    const headers: Record<string, string> = {};
    if (organizationId) {
      headers['x-tenant-id'] = organizationId;
    }
    return this.request<any>('/hosting/files/directories', {
      method: 'POST',
      headers,
      body: JSON.stringify({ path }),
    });
  }

  async uploadFile(
    payload: { path: string; contentBase64: string; mimeType?: string },
    organizationId?: string
  ): Promise<any> {
    const headers: Record<string, string> = {};
    if (organizationId) {
      headers['x-tenant-id'] = organizationId;
    }
    return this.request<any>('/hosting/files/upload', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  }

  async getPhpMyAdminSso(organizationId?: string): Promise<{ ssoUrl: string; username: string; expiresIn: number }> {
    const headers: Record<string, string> = {};
    if (organizationId) {
      headers['x-tenant-id'] = organizationId;
    }
    return this.request<any>('/hosting/sso/phpmyadmin', { headers });
  }

  async getWebmailSso(organizationId?: string): Promise<{ ssoUrl: string; expiresIn: number }> {
    const headers: Record<string, string> = {};
    if (organizationId) {
      headers['x-tenant-id'] = organizationId;
    }
    return this.request<any>('/hosting/sso/webmail', { headers });
  }

  async importSite(
    payload: { domain: string; type?: string; phpVersion?: string },
    organizationId?: string
  ): Promise<any> {
    const headers: Record<string, string> = {};
    if (organizationId) {
      headers['x-tenant-id'] = organizationId;
    }
    return this.request<any>('/hosting/sites/import', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  }

  async getCatalogPlans(): Promise<any[]> {
    return this.request<any[]>('/catalog/plans');
  }

  async getCatalogPlan(code: string): Promise<any> {
    return this.request<any>(`/catalog/plans/${encodeURIComponent(code)}`);
  }

  async createCart(payload: {
    planCode: string;
    billingCycle: string;
    currency: string;
    extras?: Record<string, any>;
  }): Promise<any> {
    return this.request<any>('/cart', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getCart(cartId: string): Promise<any> {
    return this.request<any>(`/cart/${encodeURIComponent(cartId)}`);
  }

  async updateCart(
    cartId: string,
    payload: { billingCycle?: string; quantity?: number; extras?: Record<string, any> }
  ): Promise<any> {
    return this.request<any>(`/cart/${encodeURIComponent(cartId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async claimCart(
    cartId: string,
    payload?: { userId?: string; organizationId?: string }
  ): Promise<any> {
    return this.request<any>(`/cart/${encodeURIComponent(cartId)}/claim`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  }

  async register(payload: {
    email: string;
    password: string;
    fullName: string;
    organizationName: string;
  }): Promise<any> {
    return this.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async login(payload: { email: string; password: string }): Promise<any> {
    return this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getMe(): Promise<any> {
    return this.request<any>('/auth/me');
  }

  async getOrder(orderId: string): Promise<any> {
    return this.request<any>(`/orders/${encodeURIComponent(orderId)}`);
  }

  async getProvisioningJob(jobId: string, organizationId?: string): Promise<any> {
    const headers: Record<string, string> = {};
    if (organizationId) {
      headers['x-tenant-id'] = organizationId;
    }
    return this.request<any>(`/provisioning/jobs/${encodeURIComponent(jobId)}`, {
      headers,
    });
  }

  async getOAuthStart(
    provider: 'google' | 'github',
    returnTo?: string
  ): Promise<{ authorizationUrl: string; state: string; provider: string }> {
    const q = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : '';
    return this.request<any>(`/auth/oauth/${provider}/start${q}`);
  }
}

export const defaultApiClient = new ApiClient();

