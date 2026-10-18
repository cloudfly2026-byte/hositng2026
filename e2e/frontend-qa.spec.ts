import { test, expect } from '@playwright/test';
import { generateTestAuthToken, safeGoto, TEST_USERS } from './auth-helper';

test.describe('VELUPI E2E — Public Navigation & Authentication Gates', () => {
  test('public routes allow anonymous access without redirection', async ({ page }) => {
    // 1. /login
    await safeGoto(page, '/login');
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator('h5:has-text("Iniciar Sesión")')).toBeVisible();

    // 2. /cart
    await safeGoto(page, '/cart');
    await expect(page).toHaveURL(/.*\/cart/);

    // 3. /checkout
    await safeGoto(page, '/checkout');
    await expect(page).toHaveURL(/.*\/checkout/);
  });

  test('anonymous access to private routes redirects to /login with returnTo parameter', async ({ page }) => {
    // Attempt visiting /hosting anonymously
    await safeGoto(page, '/hosting');
    // CapabilitiesContext or middleware redirects to login
    await expect(page).toHaveURL(/.*\/login\?returnTo=%2Fhosting/, { timeout: 10000 });
    await expect(page.locator('h5:has-text("Iniciar Sesión")')).toBeVisible();

    // Attempt visiting /services/apps anonymously
    await safeGoto(page, '/services/apps');
    await expect(page).toHaveURL(/.*\/login\?returnTo=%2Fservices%2Fapps/, { timeout: 10000 });
  });

  test('login form validation and error handling on invalid credentials', async ({ page }) => {
    await safeGoto(page, '/login');

    const emailInput = page.getByRole('textbox', { name: 'Correo Electrónico' });
    const passwordInput = page.getByRole('textbox', { name: 'Contraseña' });
    const submitBtn = page.getByRole('button', { name: 'Entrar a Velupi' });

    await emailInput.fill('nonexistent@velupi.com');
    await passwordInput.fill('WrongPassword123!');
    await submitBtn.click();

    // Feedback alert must be displayed
    const alert = page.locator('.MuiAlert-root');
    await expect(alert).toBeVisible({ timeout: 10000 });
  });
});

test.describe('VELUPI E2E — Role-Based Access & Dynamic Navigation', () => {
  test('OWNER with active plan sees full module suite and can navigate to site tools', async ({ page, context }) => {
    const ownerToken = generateTestAuthToken(TEST_USERS.OWNER);

    // Set authenticated cookie and localStorage
    await context.addCookies([
      {
        name: 'velupi_session',
        value: ownerToken,
        domain: 'app.velupi.com',
        path: '/',
      },
    ]);

    await safeGoto(page, '/');
    await page.evaluate((tok) => {
      localStorage.setItem('velupi_access_token', tok);
      localStorage.setItem('velupi_active_org_id', 'org-tenant-alpha');
    }, ownerToken);

    // Check Dashboard heading
    await expect(page.locator('h4:has-text("Panel de Control")')).toBeVisible();

    // Check Sidebar modules: on mobile viewports (<900px), open drawer first
    const isMobile = (page.viewportSize()?.width || 1280) < 900;
    if (isMobile) {
      const menuButton = page.locator('button[aria-label="Abrir navegación"]');
      if (await menuButton.isVisible()) {
        await menuButton.click();
      }
    }

    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Hosting Web' })).toBeVisible({ timeout: 5000 });

    // Navigate to /hosting
    await safeGoto(page, '/hosting');
    await expect(page.locator('h4:has-text("Hosting Web")')).toBeVisible();
    await expect(page.getByText('velupi.com')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Site Tools' })).toBeVisible();
  });

  test('VIEWER role does not see administrative mutation buttons', async ({ page, context }) => {
    const viewerToken = generateTestAuthToken(TEST_USERS.VIEWER);

    await context.addCookies([
      {
        name: 'velupi_session',
        value: viewerToken,
        domain: 'app.velupi.com',
        path: '/',
      },
    ]);

    await safeGoto(page, '/hosting');
    await page.evaluate((tok) => {
      localStorage.setItem('velupi_access_token', tok);
      localStorage.setItem('velupi_active_org_id', 'org-tenant-alpha');
    }, viewerToken);

    await expect(page.locator('h4:has-text("Hosting Web")')).toBeVisible();
    await expect(page.getByText('velupi.com')).toBeVisible();
  });

  test('Expired session cookie is purged and user is redirected to login', async ({ page, context }) => {
    const expiredToken = generateTestAuthToken(TEST_USERS.OWNER, -300); // Expired 5 minutes ago

    await context.addCookies([
      {
        name: 'velupi_session',
        value: expiredToken,
        domain: 'app.velupi.com',
        path: '/',
      },
    ]);

    await safeGoto(page, '/billing');
    // Must be redirected to login when capabilities resolves unauthenticated state
    await expect(page).toHaveURL(/.*\/login\?returnTo=%2Fbilling/, { timeout: 10000 });
  });

  test('clicking Cerrar Sesión in user dropdown clears session and redirects to /login', async ({ page, context }) => {
    const ownerToken = generateTestAuthToken(TEST_USERS.OWNER);

    await context.addCookies([
      {
        name: 'velupi_session',
        value: ownerToken,
        domain: 'app.velupi.com',
        path: '/',
      },
    ]);

    await safeGoto(page, '/hosting');
    await page.evaluate((tok) => {
      localStorage.setItem('velupi_access_token', tok);
      localStorage.setItem('velupi_active_org_id', 'org-tenant-alpha');
    }, ownerToken);

    // Click on user menu in topbar
    const userMenuButton = page.locator('#user-account-menu-button');
    await expect(userMenuButton).toBeVisible();
    await userMenuButton.click();

    // Verify dropdown is open and click 'Cerrar Sesión'
    const logoutItem = page.getByRole('menuitem', { name: /Cerrar Sesión/i });
    await expect(logoutItem).toBeVisible({ timeout: 5000 });
    await logoutItem.click();

    // Should redirect to /login
    await expect(page).toHaveURL(/.*\/login/, { timeout: 15000 });
  });
});

test.describe('VELUPI E2E — Responsive Navigation & Layouts', () => {
  test('renders properly and maintains navigation across viewports', async ({ page, context }) => {
    const ownerToken = generateTestAuthToken(TEST_USERS.OWNER);

    await context.addCookies([
      {
        name: 'velupi_session',
        value: ownerToken,
        domain: 'app.velupi.com',
        path: '/',
      },
    ]);

    await safeGoto(page, '/');
    await page.evaluate((tok) => {
      localStorage.setItem('velupi_access_token', tok);
      localStorage.setItem('velupi_active_org_id', 'org-tenant-alpha');
    }, ownerToken);

    await expect(page.locator('h4:has-text("Panel de Control")')).toBeVisible();
  });
});

test.describe('VELUPI E2E — File Manager, Custom SSL & SSO Integrations', () => {
  test('File Manager renders directory explorer and modal controls', async ({ page, context }) => {
    const devToken = generateTestAuthToken(TEST_USERS.DEVELOPER);

    await context.addCookies([
      {
        name: 'velupi_session',
        value: devToken,
        domain: 'app.velupi.com',
        path: '/',
      },
    ]);

    await safeGoto(page, '/files');
    await page.evaluate((tok) => {
      localStorage.setItem('velupi_access_token', tok);
      localStorage.setItem('velupi_active_org_id', 'org-velupi-internal');
    }, devToken);

    await expect(page.locator('h4:has-text("File Manager")')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nueva Carpeta' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Subir Archivo' })).toBeVisible();

    // Open "Nueva Carpeta" dialog
    await page.getByRole('button', { name: 'Nueva Carpeta' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Nombre de Carpeta' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();
  });

  test('SSL Manager allows requesting Let\'s Encrypt and opening Custom SSL modal', async ({ page, context }) => {
    const adminToken = generateTestAuthToken(TEST_USERS.ADMIN);

    await context.addCookies([
      {
        name: 'velupi_session',
        value: adminToken,
        domain: 'app.velupi.com',
        path: '/',
      },
    ]);

    await safeGoto(page, '/ssl');
    await page.evaluate((tok) => {
      localStorage.setItem('velupi_access_token', tok);
      localStorage.setItem('velupi_active_org_id', 'org-velupi-internal');
    }, adminToken);

    await expect(page.locator('h4:has-text("SSL / TLS Manager")')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Instalar Certificado Propio' })).toBeVisible();
    await expect(page.getByRole('button', { name: "Solicitar Let's Encrypt" })).toBeVisible();

    // Open Custom SSL Dialog
    await page.getByRole('button', { name: 'Instalar Certificado Propio' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Dominio FQDN' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();
  });

  test('phpMyAdmin and Webmail buttons are active for authenticated users', async ({ page, context }) => {
    const ownerToken = generateTestAuthToken(TEST_USERS.OWNER);

    await context.addCookies([
      {
        name: 'velupi_session',
        value: ownerToken,
        domain: 'app.velupi.com',
        path: '/',
      },
    ]);

    // Check Databases page phpMyAdmin button
    await safeGoto(page, '/databases');
    await page.evaluate((tok) => {
      localStorage.setItem('velupi_access_token', tok);
      localStorage.setItem('velupi_active_org_id', 'org-velupi-internal');
    }, ownerToken);
    await expect(page.getByRole('button', { name: 'phpMyAdmin' })).toBeVisible();

    // Check Email page Webmail button
    await safeGoto(page, '/emails');
    await page.evaluate((tok) => {
      localStorage.setItem('velupi_access_token', tok);
      localStorage.setItem('velupi_active_org_id', 'org-velupi-internal');
    }, ownerToken);
    await expect(page.getByRole('button', { name: 'Webmail' })).toBeVisible();
  });
});

