import crypto from 'node:crypto';

function signToken(payload, secret = 'velupi_jwt_secure_key_2026_super_secret') {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;
  const fullPayload = {
    ...payload,
    roles: payload.roles || ['OWNER'],
    permissions: payload.permissions || ['*'],
    isOperator: payload.isOperator ?? false,
    iat,
    exp,
  };

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${encodedPayload}`)
    .digest('base64url');

  return `${header}.${encodedPayload}.${signature}`;
}

async function run() {
  const orgId = 'org-1792414145232-lpw39';
  const userId = 'usr-1792414145232-aiwhl';
  const customerEmail = 'proeba1@cloudfly.com.co';

  const token = signToken({
    sub: userId,
    email: customerEmail,
    organizationId: orgId,
  });

  console.log('--- Step 1: Create Order for easysnotes.com ---');
  const orderRes = await fetch('https://api.velupi.com/checkout/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organizationId: orgId,
      currency: 'COP',
      billingCycle: 'ANNUAL',
      items: [{ planVersionId: 'ver-wp-starter-v1', quantity: 1 }],
      idempotencyKey: `idemp-live-easysnotes-${Date.now()}`,
      customerEmail: 'proeba1@cloudfly.com.co',
      redirectUrl: 'https://app.velupi.com/checkout/return',
      primaryDomain: 'easysnotes.com',
    }),
  });

  const orderData = await orderRes.json();
  console.log('Order:', orderData?.order?.orderNumber, 'Status:', orderData?.order?.status);
  const orderId = orderData.order.id;

  console.log('\n--- Step 2: Reconcile Order to PAID (triggers automatic Hestia provisioning) ---');
  const reconcileRes = await fetch(`https://api.velupi.com/orders/${orderId}/reconcile`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ transactionId: `trx-approved-${orderData.order.orderNumber}` }),
  });

  const reconcileData = await reconcileRes.json();
  console.log('Reconcile response status:', reconcileRes.status);
  console.log('Reconcile data:', JSON.stringify(reconcileData, null, 2));

  console.log('\n--- Step 3: Create corporate email contacto@easysnotes.com via Velupi API ---');
  const emailRes = await fetch('https://api.velupi.com/hosting/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      domain: 'easysnotes.com',
      account: 'contacto',
      password: 'EasyNotes2026Secure!',
      quotaMb: 1024,
    }),
  });

  const emailData = await emailRes.json();
  console.log('Email creation status:', emailRes.status);
  console.log('Email creation response:', JSON.stringify(emailData, null, 2));

  console.log('\n--- Step 4: Verify Sites in Velupi API ---');
  const sitesRes = await fetch('https://api.velupi.com/hosting/sites', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const sites = await sitesRes.json();
  console.log('Sites found in Velupi:', JSON.stringify(sites, null, 2));
}

run().catch(console.error);
