import { JwtSecurityService } from '@cloudfly/domain';

async function main() {
  const jwt = new JwtSecurityService('velupi_jwt_secure_key_2026_super_secret');
  
  // 1. Create token for org-wompi-val
  const token = jwt.sign({
    sub: 'usr-wompi-val',
    email: 'proeba1@cloudfly.com.co',
    organizationId: 'org-wompi-val',
    roles: ['OWNER'],
    permissions: ['*'],
  }, 3600);

  console.log('--- Step 1: Create Order for easysnotes.com ---');
  const orderRes = await fetch('https://api.velupi.com/checkout/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organizationId: 'org-wompi-val',
      currency: 'COP',
      billingCycle: 'ANNUAL',
      items: [{ planVersionId: 'ver-wp-starter-v1', quantity: 1 }],
      idempotencyKey: `idemp-live-easysnotes-${Date.now()}`,
      customerEmail: 'proeba1@cloudfly.com.co',
      redirectUrl: 'https://app.velupi.com/checkout/return',
      primaryDomain: 'easysnotes.com',
    }),
  });

  const orderData = await orderRes.json() as any;
  console.log('Order created:', orderData?.order?.orderNumber, 'Status:', orderData?.order?.status);
  const orderId = orderData.order.id;

  console.log('\n--- Step 2: Reconcile Order to PAID (triggers automatic Hestia provisioning) ---');
  const reconcileRes = await fetch(`https://api.velupi.com/orders/${orderId}/reconcile`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ transactionId: `trans-${Date.now()}` }),
  });

  const reconcileData = await reconcileRes.json();
  console.log('Reconcile response:', JSON.stringify(reconcileData, null, 2));

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
  console.log('Email creation response:', JSON.stringify(emailData, null, 2));

  console.log('\n--- Step 4: Verify Sites in Velupi API ---');
  const sitesRes = await fetch('https://api.velupi.com/hosting/sites', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const sites = await sitesRes.json();
  console.log('Sites found:', JSON.stringify(sites, null, 2));
}

main().catch(console.error);
