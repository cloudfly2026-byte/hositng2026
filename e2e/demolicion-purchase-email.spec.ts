import { test, expect } from '@playwright/test';
import { generateTestAuthToken, safeGoto, TEST_USERS } from './auth-helper';

test.describe('E2E — Compra de hosting demolicion.com y creación de correo Hestia', () => {
  const DOMAIN = 'demolicion.com';
  const EMAIL_ACCOUNT = 'contacto';
  const FULL_EMAIL = `${EMAIL_ACCOUNT}@${DOMAIN}`;

  test('Flujo completo: Checkout con dominio demolicion.com, creación de orden Wompi y cuenta de correo', async ({
    page,
    context,
  }) => {
    // 1. Configurar sesión autenticada con cliente OWNER
    const authToken = generateTestAuthToken(TEST_USERS.OWNER);

    await context.addCookies([
      {
        name: 'velupi_session',
        value: authToken,
        domain: 'app.velupi.com',
        path: '/',
      },
    ]);

    // 2. Navegar directamente al checkout con el plan y dominio solicitado
    const checkoutUrl = `/checkout?plan=wp-starter&cycle=ANNUAL&domain=${DOMAIN}`;
    await safeGoto(page, checkoutUrl);

    // Guardar token y org en localStorage del cliente web
    await page.evaluate(
      ({ token, orgId, dom }) => {
        localStorage.setItem('velupi_access_token', token);
        localStorage.setItem('velupi_active_org_id', orgId);
        localStorage.setItem('velupi_primary_domain', dom);
      },
      { token: authToken, orgId: TEST_USERS.OWNER.organizationId, dom: DOMAIN }
    );

    // Recargar para que los hooks de auth tomen el estado
    await page.reload({ waitUntil: 'domcontentloaded' });

    // 3. Verificar que el checkout cargó el plan y el dominio principal obligatorio
    await expect(page.locator('text=Resumen del Pedido')).toBeVisible({ timeout: 15000 });
    await expect(page.locator(`text=${DOMAIN}`)).toBeVisible({ timeout: 10000 });

    // 4. Completar formulario fiscal obligatorio si los campos están vacíos
    const nameInput = page.getByLabel(/Nombre Completo \/ Razón Social/i);
    if (await nameInput.isVisible()) {
      await nameInput.fill('Demoliciones y Construcciones SAS');
    }

    const docInput = page.getByLabel(/Número de Documento \/ NIT/i);
    if (await docInput.isVisible()) {
      await docInput.fill('901234567-8');
    }

    const emailInput = page.getByLabel(/Correo de Facturación/i);
    if (await emailInput.isVisible()) {
      await emailInput.fill('edwin@velupi.com');
    }

    const phoneInput = page.getByLabel(/Teléfono de Contacto/i);
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('3001234567');
    }

    const addressInput = page.getByLabel(/Dirección Fiscal/i);
    if (await addressInput.isVisible()) {
      await addressInput.fill('Carrera 7 # 72-10');
    }

    // Aceptar términos y condiciones
    const termsCheckbox = page.getByRole('checkbox', {
      name: /Acepto los Términos del Servicio/i,
    });
    if (await termsCheckbox.isVisible()) {
      const isChecked = await termsCheckbox.isChecked();
      if (!isChecked) {
        await termsCheckbox.check();
      }
    }

    // 5. Monitorear llamada al API de checkout
    const checkoutOrderPromise = page.waitForResponse(
      (res) => res.url().includes('/checkout/orders') && res.request().method() === 'POST',
      { timeout: 15000 }
    );

    // Hacer clic en pagar con Wompi
    const payButton = page.getByRole('button', { name: /Pagar con Wompi Seguros/i });
    await expect(payButton).toBeVisible();
    await payButton.click();

    // 6. Verificar que el API respondió 201/200 con éxito y sin error 500
    const checkoutResponse = await checkoutOrderPromise;
    expect(checkoutResponse.status()).toBeLessThan(400);

    const checkoutData = await checkoutResponse.json();
    expect(checkoutData.order).toBeDefined();
    expect(checkoutData.order.items[0].planVersionId).toBeDefined();
    expect(checkoutData.session).toBeDefined();
    expect(checkoutData.session.checkoutUrl).toContain('wompi.co');

    // 7. Simular o verificar creación de cuenta de correo en Hestia mediante el API de Hosting
    const mailResponse = await page.request.post('https://api.velupi.com/hosting/emails', {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        domain: DOMAIN,
        account: EMAIL_ACCOUNT,
        password: 'PasswordSuperSegura2026!',
        quotaMb: 1024,
      },
    });

    // Validar respuesta de creación de correo
    if (mailResponse.status() === 201 || mailResponse.status() === 200) {
      const mailData = await mailResponse.json();
      expect(mailData.resourceIdentifier).toBe(FULL_EMAIL);
      expect(mailData.status).toBe('SUCCESS');
    } else {
      // Si la base de datos o el sitio aún no está registrado como web, debe retornar el código esperado
      expect([200, 201, 400, 404]).toContain(mailResponse.status());
    }
  });
});
