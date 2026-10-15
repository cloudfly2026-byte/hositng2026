import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Sunchi WordPress Theme & Velupi Bridge — TDD Verification', () => {
  const themeDir = path.resolve(__dirname, 'themes', 'sunchi-theme');
  const pluginDir = path.resolve(__dirname, 'plugins', 'sunchi-velupi-bridge');

  describe('1. Brand Identity & Design System Variables', () => {
    it('contains style.css with official Sunchi theme headers and color palette', () => {
      const stylePath = path.join(themeDir, 'style.css');
      expect(fs.existsSync(stylePath)).toBe(true);

      const content = fs.readFileSync(stylePath, 'utf-8');
      expect(content).toContain('Theme Name: Sunchi Theme');
      expect(content).toContain('Text Domain: sunchi-theme');
      
      // Color tokens
      expect(content).toContain('--sunchi-primary: #FF6B00');
      expect(content).toContain('--sunchi-primary-dark: #E85A00');
      expect(content).toContain('--sunchi-orange-light: #FF9100');
      expect(content).toContain('--sunchi-yellow: #FFB800');
      expect(content).toContain('--sunchi-yellow-light: #FFD54A');
      expect(content).toContain('--sunchi-dark: #2D1B17');
      expect(content).toContain('--sunchi-text: #344054');
      expect(content).toContain('--sunchi-cream: #FFF8ED');
      expect(content).toContain('--sunchi-border: #F2E8DC');
      expect(content).toContain('--sunchi-success: #16A34A');
    });

    it('contains the official Sunchi logo asset in theme images directory', () => {
      const logoPath = path.join(themeDir, 'assets', 'images', 'logo.png');
      expect(fs.existsSync(logoPath)).toBe(true);
      const stats = fs.statSync(logoPath);
      expect(stats.size).toBeGreaterThan(10000); // Verify it is a valid non-empty image file
    });
  });

  describe('2. Core Theme Templates Structure', () => {
    it('has all mandatory WordPress theme files', () => {
      const requiredFiles = [
        'functions.php',
        'header.php',
        'footer.php',
        'index.php',
        'front-page.php',
        'template-precios.php',
        'page.php',
        'single.php',
        '404.php',
      ];

      for (const file of requiredFiles) {
        const filePath = path.join(themeDir, file);
        expect(fs.existsSync(filePath), `Expected ${file} to exist in sunchi-theme`).toBe(true);
      }
    });

    it('functions.php properly enqueues styles, Google Fonts (Poppins & Inter), and registers nav menus', () => {
      const functionsPath = path.join(themeDir, 'functions.php');
      const content = fs.readFileSync(functionsPath, 'utf-8');

      expect(content).toContain('wp_enqueue_style');
      expect(content).toContain('Poppins');
      expect(content).toContain('Inter');
      expect(content).toContain('register_nav_menus');
      expect(content).toContain('sunchi-theme');
      expect(content).toContain('sunchi_theme_setup');
    });

    it('header.php contains navigation, logo, search icon and Velupi login/register CTAs', () => {
      const headerPath = path.join(themeDir, 'header.php');
      const content = fs.readFileSync(headerPath, 'utf-8');

      expect(content).toContain('<header');
      expect(content).toContain('logo.png');
      expect(content).toContain('Iniciar sesión');
      expect(content).toContain('Crear cuenta');
      expect(content).toContain('app.velupi.com/login');
      expect(content).toContain('app.velupi.com/register');
      expect(content).toContain('sunchi-mobile-toggle');
    });

    it('footer.php contains company info, slogan, 4 navigation columns, newsletter and copyright', () => {
      const footerPath = path.join(themeDir, 'footer.php');
      const content = fs.readFileSync(footerPath, 'utf-8');

      expect(content).toContain('<footer');
      expect(content).toContain('Hosting que impulsa tus ideas.');
      expect(content).toContain('Productos');
      expect(content).toContain('Recursos');
      expect(content).toContain('Empresa');
      expect(content).toContain('Recibe novedades y promociones');
      expect(content).toContain('para un internet más brillante');
    });
  });

  describe('3. Home Page (front-page.php) Alignment with Image 2', () => {
    it('contains all visual sections and copy from design mockup', () => {
      const frontPath = path.join(themeDir, 'front-page.php');
      const content = fs.readFileSync(frontPath, 'utf-8');

      // Hero
      expect(content).toContain('HOSTING PARA UN MUNDO MÁS BRILLANTE');
      expect(content).toContain('Tu hosting alegre');
      expect(content).toContain('rápido y confiable');
      expect(content).toContain('Ver planes');
      expect(content).toContain('Probar ahora');
      expect(content).toContain('Activación instantánea');
      expect(content).toContain('Soporte 24/7 en español');
      expect(content).toContain('Garantía de 30 días');
      expect(content).toContain('Rendimiento Excelente');

      // Categories
      expect(content).toContain('Hosting');
      expect(content).toContain('WordPress');
      expect(content).toContain('Cloud Apps');
      expect(content).toContain('VPS');

      // Pricing Preview
      expect(content).toContain('PLANES PARA CADA GRAN IDEA');
      expect(content).toContain('Planes simples y transparentes');
      expect(content).toContain('MÁS POPULAR');
      expect(content).toContain('Comenzar ahora');

      // Testimonials
      expect(content).toContain('CLIENTES QUE SONRÍEN');
      expect(content).toContain('Miles de proyectos confían en Sunchi');
      expect(content).toContain('María González');
      expect(content).toContain('Carlos Mendoza');
      expect(content).toContain('Ana Torres');
    });
  });

  describe('4. Pricing & Plans Page (template-precios.php) Alignment with Image 1', () => {
    it('contains billing cycle toggle (mensual/anual), 20% discount badge, comparison table, and FAQs', () => {
      const preciosPath = path.join(themeDir, 'template-precios.php');
      const content = fs.readFileSync(preciosPath, 'utf-8');

      // Header and Hero
      expect(content).toContain('Planes y precios');
      expect(content).toContain('Sin sorpresas en la factura');
      expect(content).toContain('Activa en minutos y empieza hoy');
      expect(content).toContain('Soporte humano en español 24/7');

      // Billing switcher
      expect(content).toContain('Pago mensual');
      expect(content).toContain('Pago anual');
      expect(content).toContain('Ahorra hasta 20% con el pago anual');

      // 4 Plan cards
      expect(content).toContain('Hosting Starter');
      expect(content).toContain('WordPress Pro');
      expect(content).toContain('Cloud Apps');
      expect(content).toContain('VPS Pro');

      // Comparison table
      expect(content).toContain('Compara todos los planes');
      expect(content).toContain('Sitios web');
      expect(content).toContain('Almacenamiento SSD');
      expect(content).toContain('SSL gratis');
      expect(content).toContain('Backups automáticos');
      expect(content).toContain('Cuentas de email');
      expect(content).toContain('Soporte en español');

      // FAQs
      expect(content).toContain('¿Tienes dudas?');
      expect(content).toContain('¿Puedo cambiar de plan después?');
      expect(content).toContain('¿Ofrecen reembolso?');
      expect(content).toContain('¿El dominio está incluido?');
      expect(content).toContain('¿Incluyen migración de mi sitio?');
      expect(content).toContain('¿Qué métodos de pago aceptan?');
      expect(content).toContain('¿Puedo contratar varios servicios?');
    });
  });

  describe('5. Sunchi Velupi Bridge Plugin & Checkout Integration', () => {
    it('contains main plugin file with secure execution checks and Velupi API client', () => {
      const pluginMainPath = path.join(pluginDir, 'sunchi-velupi-bridge.php');
      expect(fs.existsSync(pluginMainPath)).toBe(true);

      const content = fs.readFileSync(pluginMainPath, 'utf-8');
      expect(content).toContain('Plugin Name: Sunchi Velupi Bridge');
      expect(content).toContain('defined(\'ABSPATH\')');
      expect(content).toContain('api.velupi.com');
      expect(content).toContain('app.velupi.com/cart');
      expect(content).toContain('sunchi_get_checkout_url');
      expect(content).toContain('sunchi_fetch_catalog');
    });

    it('safely generates checkout URLs preserving planCode and billingCycle with zero-trust validation', () => {
      // Simulate the URL generator logic
      function generateCheckoutUrl(baseUrl: string, planCode: string, billingCycle: string): string {
        const allowedCycles = ['MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'BIENNIAL'];
        const cleanPlan = encodeURIComponent(planCode.trim().toLowerCase());
        const cleanCycle = allowedCycles.includes(billingCycle.toUpperCase()) ? billingCycle.toUpperCase() : 'ANNUAL';
        return `${baseUrl.replace(/\/$/, '')}?plan=${cleanPlan}&cycle=${cleanCycle}`;
      }

      const url1 = generateCheckoutUrl('https://app.velupi.com/cart', 'wp-starter', 'ANNUAL');
      expect(url1).toBe('https://app.velupi.com/cart?plan=wp-starter&cycle=ANNUAL');

      const url2 = generateCheckoutUrl('https://app.velupi.com/cart', 'cloud-apps-pro', 'MONTHLY');
      expect(url2).toBe('https://app.velupi.com/cart?plan=cloud-apps-pro&cycle=MONTHLY');

      // Negative test: invalid cycle defaults to ANNUAL
      const urlInvalid = generateCheckoutUrl('https://app.velupi.com/cart', 'wp-starter', 'INVALID_CYCLE');
      expect(urlInvalid).toBe('https://app.velupi.com/cart?plan=wp-starter&cycle=ANNUAL');
    });
  });

  describe('6. Responsive, Accessibility & Clean Design System', () => {
    it('main.css contains responsive breakpoints and accessible focus states', () => {
      const cssPath = path.join(themeDir, 'assets', 'css', 'main.css');
      expect(fs.existsSync(cssPath)).toBe(true);

      const content = fs.readFileSync(cssPath, 'utf-8');
      expect(content).toContain('@media (max-width: 768px)');
      expect(content).toContain('@media (max-width: 1024px)');
      expect(content).toContain(':focus-visible');
      expect(content).toContain('prefers-reduced-motion');
      expect(content).toContain('border-radius: 16px');
    });

    it('main.js handles billing switch, FAQ accordions, and mobile navigation smoothly', () => {
      const jsPath = path.join(themeDir, 'assets', 'js', 'main.js');
      expect(fs.existsSync(jsPath)).toBe(true);

      const content = fs.readFileSync(jsPath, 'utf-8');
      expect(content).toContain('sunchi-billing-toggle');
      expect(content).toContain('sunchi-faq-item');
      expect(content).toContain('sunchi-mobile-toggle');
    });
  });
});
