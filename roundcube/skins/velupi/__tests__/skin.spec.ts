import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SKIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(SKIN_ROOT, rel), 'utf-8');
const asset = (rel: string) => resolve(SKIN_ROOT, rel);

describe('Velupi Mail skin — Roundcube Elastic child skin', () => {
  describe('meta.json (skin manifest)', () => {
    it('declares a valid manifest that extends Elastic', () => {
      const meta = JSON.parse(read('meta.json'));
      expect(meta.name).toBe('Velupi');
      expect(meta.extends).toBe('elastic');
      expect(meta.author).toMatch(/velupi/i);
      expect(meta.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('does not rely on unsupported meta.json asset keys (Roundcube ignores them)', () => {
      const meta = JSON.parse(read('meta.json'));
      expect(meta.styles).toBeUndefined();
      expect(meta.scripts).toBeUndefined();
    });
  });

  describe('template override (templates/includes/layout.html)', () => {
    const template = 'templates/includes/layout.html';

    it('exists so Roundcube resolves it before the Elastic layout', () => {
      expect(existsSync(asset(template))).toBe(true);
    });

    it('includes the parent Elastic layout with an explicit skinPath', () => {
      const html = read(template);
      expect(html).toContain('<roundcube:include file="includes/layout.html" skinPath="skins/elastic" />');
    });

    it('links the Velupi stylesheets after the parent layout (cascade wins)', () => {
      const html = read(template);
      const includeIdx = html.indexOf('skinPath="skins/elastic"');
      const linkIdx = html.indexOf('href="/css/variables.css"');
      expect(includeIdx).toBeGreaterThan(-1);
      expect(linkIdx).toBeGreaterThan(includeIdx);
    });

    it('loads the theme runtime script', () => {
      expect(read(template)).toContain('src="/js/theme.js"');
    });

    it('links every partial stylesheet directly (Roundcube appends ?s=mtime cache-busting)', () => {
      const html = read(template);
      const order = [
        '/css/variables.css',
        '/css/layout.css',
        '/css/login.css',
        '/css/mail.css',
        '/css/compose.css',
        '/css/responsive.css',
        '/css/dark.css',
      ];
      let lastIndex = html.indexOf('skinPath="skins/elastic"');
      expect(lastIndex).toBeGreaterThan(-1);
      for (const href of order) {
        const idx = html.indexOf(`href="${href}"`);
        expect(idx, `${href} must be linked`).toBeGreaterThan(-1);
        expect(idx, `${href} must follow the parent include`).toBeGreaterThan(lastIndex);
        lastIndex = idx;
      }
    });

    it('does not use @import chains, which Roundcube never cache-busts', () => {
      const html = read(template);
      expect(html).not.toContain('@import');
      for (const f of ['styles.css']) {
        if (existsSync(asset(f))) {
          expect(read(f), `${f} must not rely on @import`).not.toContain('@import');
        }
      }
    });

    it('never exposes infrastructure provider brands or internals', () => {
      const banned = /hestia|dokploy|traefik|portainer|bind9|docker|\/usr\/local\/hestia|v-add-|v-delete-/i;
      expect(banned.test(read(template))).toBe(false);
    });
  });

  describe('logo resolution template overrides (base_path follows the skin owning the template)', () => {
    it('ships templates/login.html so base_path becomes skins/velupi on the login page', () => {
      expect(existsSync(asset('templates/login.html'))).toBe(true);
    });

    it('ships templates/includes/menu.html so base_path becomes skins/velupi in the app frame', () => {
      expect(existsSync(asset('templates/includes/menu.html'))).toBe(true);
    });

    it('login.html renders the logo object with a skin-relative path', () => {
      const html = read('templates/login.html');
      expect(html).toMatch(/<roundcube:object name="logo"[^>]*src="\/images\/logo\.svg"/);
    });

    it('menu.html renders the logo object with a skin-relative path', () => {
      const html = read('templates/includes/menu.html');
      expect(html).toMatch(/<roundcube:object name="logo"[^>]*src="\/images\/logo\.svg"/);
    });

    it('never leaks infrastructure provider brands in the overridden templates', () => {
      const banned = /hestia|dokploy|traefik|portainer|bind9|docker|\/usr\/local\/hestia|v-add-|v-delete-/i;
      for (const f of ['templates/login.html', 'templates/includes/menu.html']) {
        expect(banned.test(read(f)), `${f} leaks provider internals`).toBe(false);
      }
    });
  });

  describe('login screen targets the real Elastic 1.6 markup', () => {
    const loginCss = read('css/login.css');

    it('styles body.task-login instead of the nonexistent #rcmLogin id', () => {
      expect(loginCss).toMatch(/body\.task-login|#layout-content/);
      expect(loginCss).not.toMatch(/#rcmLogin/);
    });

    it('applies the warm Velupi background to the login page', () => {
      expect(loginCss).toMatch(/body\.task-login[^{}]*\{[^}]*background:\s*var\(--background(-alt)?\)/);
    });

    it('styles the real login form (#login-form) as a surface card', () => {
      expect(loginCss).toMatch(/#login-form[^{}]*\{[^}]*background:\s*var\(--surface\)/);
    });

    it('styles the real submit button (#rcmloginsubmit)', () => {
      expect(loginCss).toMatch(/#rcmloginsubmit[^{}]*\{[^}]*background:\s*var\(--brand-primary\)/);
    });

    it('never references selectors that do not exist in Elastic 1.6 login markup', () => {
      expect(loginCss).not.toContain('#logo-form');
    });
  });

  describe('dark mode covers the login screen (real markup)', () => {
    const dark = read('css/dark.css');

    it('applies dark tokens to body.task-login, not only to #rcmLogin', () => {
      expect(dark).toMatch(/body\.task-login|#layout-content/);
      expect(dark).not.toMatch(/#rcmLogin/);
    });
  });

  describe('theme runtime targets the real login form', () => {
    const js = read('js/theme.js');

    it('finds the login form via #login-form instead of #rcmLogin', () => {
      expect(js).toContain("#login-form");
      expect(js).not.toContain('#rcmLogin');
    });
  });

  describe('structural CSS only targets ids that exist in Elastic 1.6 markup', () => {
    // Ids emitted by the Elastic 1.6 templates (templates/*.html + includes/*.html)
    // plus runtime-generated button ids (rcmbtn*, rcmloginsubmit).
    const KNOWN_IDS = new Set([
      'layout', 'layout-menu', 'layout-sidebar', 'layout-list', 'layout-content',
      'taskmenu', 'mailtoolbar', 'listcontrols', 'messagelist', 'messagelist-header',
      'messagelist-content', 'mailboxlist', 'folderlist-content', 'message-content',
      'message-header', 'messagebody', 'login-form', 'login-footer', 'logo',
      'compose-content', 'compose-headers', 'compose-toolbar', 'compose-options',
      'compose-attachments', 'attachment-list', 'composebody', 'compose-subject',
      'composestatusbar', 'mailsearchform', 'editor-selector', 'quotadisplay',
      'searchform', 'messagetoolbar',
      'composebodycontainer',
      'compose_from', 'compose_to', 'compose_cc', 'compose_bcc',
      'compose_replyto', 'compose_followupto', 'compose_subject',
      'addressbooktoolbar', 'settings-menu', 'preferences-frame', 'contact-frame',
      'rcmloginsubmit',
    ]);

    const files = ['css/layout.css', 'css/mail.css', 'css/compose.css', 'css/dark.css', 'css/responsive.css'];

    it('never styles ids that do not exist (dead selectors silently do nothing)', () => {
      for (const f of files) {
        const css = read(f);
        const ids = css.match(/#[a-zA-Z][a-zA-Z0-9_-]*/g) || [];
        for (const raw of ids) {
          const id = raw.slice(1);
          if (/^[0-9A-F]{3,8}$/.test(id)) continue; // hex color literal
          expect(KNOWN_IDS.has(id), `${f} references dead id #${id}`).toBe(true);
        }
      }
    });
  });

  describe('centralized design tokens (css/variables.css)', () => {
    const css = read('css/variables.css');

    it('defines the official Warm Solar Light brand palette', () => {
      expect(css).toContain('--brand-primary: #FF6B00');
      expect(css).toContain('--brand-primary-dark: #E85A00');
      expect(css).toContain('--brand-secondary: #FF9100');
      expect(css).toContain('--brand-accent: #FFB800');
      expect(css).toContain('--brand-accent-light: #FFD54A');
    });

    it('defines surfaces, backgrounds, borders and text colors', () => {
      expect(css).toContain('--background: #FFFDF9');
      expect(css).toContain('--background-alt: #FFF8ED');
      expect(css).toContain('--surface: #FFFFFF');
      expect(css).toContain('--border: #F2E8DC');
      expect(css).toContain('--text-primary: #2D1B17');
      expect(css).toContain('--text-muted: #667085');
    });

    it('defines semantic state colors', () => {
      expect(css).toContain('--success: #16A34A');
      expect(css).toContain('--warning: #D97706');
      expect(css).toContain('--error: #DC2626');
    });

    it('defines the official Velupi typography tokens', () => {
      expect(css).toContain('--font-display: "Poppins"');
      expect(css).toContain('--font-body: "Inter"');
    });
  });

  describe('partial load order (templates/includes/layout.html links each file)', () => {
    const html = read('templates/includes/layout.html');

    it('loads variables.css first so tokens precede every override', () => {
      const first = html.indexOf('href="/css/');
      expect(first).toBeGreaterThan(-1);
      expect(html.indexOf('href="/css/variables.css"')).toBe(first);
    });
  });

  describe('scoped overrides (no global clobbering)', () => {
    const partials = ['css/layout.css', 'css/login.css', 'css/mail.css', 'css/compose.css'];

    it('never uses a bare universal selector that would break plugins', () => {
      for (const f of partials) {
        expect(read(f), `${f} contains a bare universal selector`).not.toMatch(/^\s*\*\s*\{/m);
      }
    });
  });

  describe('dark mode (css/dark.css)', () => {
    const css = read('css/dark.css');

    it('supports prefers-color-scheme and an explicit persisted toggle', () => {
      expect(css).toContain('prefers-color-scheme: dark');
      expect(css).toContain("data-theme='dark'");
    });

    it('redefines background, surface and text tokens for dark mode', () => {
      expect(css).toMatch(/--background:\s*#/);
      expect(css).toMatch(/--surface:\s*#/);
      expect(css).toMatch(/--text-primary:\s*#/);
    });
  });

  describe('responsive layout (css/responsive.css)', () => {
    it('adapts the three-panel layout for tablet and mobile breakpoints', () => {
      const css = read('css/responsive.css');
      expect(css).toMatch(/@media[^{]+max-width/);
      expect(css).toMatch(/@media[^{]+min-width|max-width:\s*(1024|640)px/);
    });
  });

  describe('theme runtime (js/theme.js)', () => {
    const js = read('js/theme.js');

    it('exposes a VelupiTheme namespace with init and setMode', () => {
      expect(js).toContain('VelupiTheme');
      expect(js).toContain('init');
      expect(js).toContain('setMode');
    });

    it('persists preference and respects the storage key contract', () => {
      expect(js).toContain('velupi:mail-theme');
      expect(js).toContain('localStorage');
    });

    it('falls back to prefers-color-scheme when no stored preference', () => {
      expect(js).toContain('prefers-color-scheme');
    });

    it('contains no dangerous APIs', () => {
      expect(js).not.toMatch(/\beval\s*\(|new Function|document\.write/);
    });
  });

  describe('brand mark (images/logo.svg)', () => {
    const svg = read('images/logo.svg');

    it('exists and is a self-contained inline SVG (embeds the Velupi isotype)', () => {
      expect(svg.trimStart()).toMatch(/^<svg[\s>]/);
      expect(svg).toContain('data:image/png;base64,');
    });

    it('loads no external resources (works as an <img> source)', () => {
      expect(svg).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
      expect(svg).not.toMatch(/<image[^>]+href="(?!data:)/);
    });

    it('is labelled as Velupi for accessibility', () => {
      expect(svg).toMatch(/aria-label="Velupi"|<title>Velupi/);
    });

    it('replaces the Elastic cube mark (no Elastic palette)', () => {
      expect(svg).not.toContain('#37beff');
    });
  });

  describe('reading-pane watermark (watermark.html)', () => {
    it('exists so Roundcube resolves it before the Elastic watermark', () => {
      expect(existsSync(asset('watermark.html'))).toBe(true);
    });

    it('uses the skin-local Velupi mark', () => {
      expect(read('watermark.html')).toContain('url(images/logo.svg)');
    });

    it('uses the Velupi warm background token', () => {
      expect(read('watermark.html')).toContain('#FFFDF9');
    });
  });

  describe('compose editor colors (white in light AND dark, like the original skin)', () => {
    const compose = read('css/compose.css');
    const dark = read('css/dark.css');

    it('forces a white background on the compose body editor', () => {
      expect(compose).toMatch(/#composebody[^{}]*\{[^}]*background:\s*#FFFFFF/);
      expect(compose).toMatch(/\.editor[^{}]*\{[^}]*background:\s*#FFFFFF/);
    });

    it('keeps dark text on the white editor so content stays readable', () => {
      expect(compose).toMatch(/#composebody[^{}]*\{[^}]*color:\s*#2D1B17/);
    });

    it('never repaints the compose editor with dark tokens', () => {
      expect(dark).not.toMatch(/#composebody/);
      expect(dark).not.toMatch(/\.editor\s*[,{]/);
    });
  });

  describe('brand assets', () => {
    it('ships the official Velupi logo used by the dashboard', () => {
      expect(existsSync(asset('images/velupi-logo.png'))).toBe(true);
    });

    it('ships a thumbnail for the Roundcube preference screen', () => {
      expect(existsSync(asset('thumbnail.png'))).toBe(true);
    });

    it('references the logo only from the skin folder (no CDN)', () => {
      const all = ['templates/includes/layout.html', 'css/login.css', 'css/layout.css', 'css/mail.css'];
      for (const f of all) {
        const content = read(f);
        expect(content).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
      }
    });
  });

  describe('white-label integrity (AGENTS.md §19.1)', () => {
    const files = [
      'templates/includes/layout.html',
      'meta.json',
      'css/variables.css',
      'css/layout.css',
      'css/login.css',
      'css/mail.css',
      'css/compose.css',
      'css/responsive.css',
      'css/dark.css',
      'js/theme.js',
    ];

    it('never exposes infrastructure provider brands or internals to end users', () => {
      const banned = /hestia|dokploy|traefik|portainer|bind9|docker|\/usr\/local\/hestia|v-add-|v-delete-/i;
      for (const f of files) {
        expect(banned.test(read(f)), `${f} leaks provider internals`).toBe(false);
      }
    });
  });

  describe('security constraints', () => {
    it('loads no third-party scripts or stylesheets (CSP-safe, no CDN)', () => {
      const files = ['templates/includes/layout.html', 'js/theme.js', 'css/login.css', 'css/mail.css', 'css/layout.css', 'css/compose.css', 'css/responsive.css', 'css/dark.css', 'css/variables.css'];
      for (const f of files) {
        expect(read(f)).not.toMatch(/https?:\/\/[^\s"')]+\.(js|css|woff2?|ttf)/i);
      }
    });

    it('theme.js does not manipulate authentication or mail transport', () => {
      const js = read('js/theme.js');
      expect(js).not.toMatch(/_pass|_task\s*=\s*['"]login['"]|smtp|imap/i);
    });
  });
});
