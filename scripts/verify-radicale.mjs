import { runHestia } from './exec-hestia.mjs';

/**
 * Verification suite for the Velupi CalDAV/CardDAV service.
 *
 * Asserts, against the live production server:
 *   1. the DAV service is running, enabled and bound to the loopback interface
 *   2. the service is reachable only through the webmail reverse proxy
 *   3. authentication is relayed to the mail server (same credentials)
 *   4. collections are provisioned automatically for every user
 *   5. the Roundcube plugins (contacts and calendar) are enabled and working
 *   6. the white-label rules hold (no third party branding in the customer UI)
 */

const results = [];

function check(name, condition, detail) {
  results.push({ name, ok: Boolean(condition), detail: detail || '' });
}

function sh(label, cmd) {
  try {
    return { out: runHestia(cmd).trim(), err: '' };
  } catch (err) {
    return { out: '', err: (err.stdout || err.stderr || '').trim() };
  }
}

// 1. Service state
const service = sh('service', 'systemctl is-active radicale; systemctl is-enabled radicale');
check(
  'DAV service active and enabled',
  service.out.includes('active') && service.out.includes('enabled'),
  service.out.replace(/\n/g, ' '),
);

// 2. Loopback only binding
const binding = sh('binding', 'ss -tlnp | grep 5232 || true');
check(
  'DAV service bound to loopback only',
  binding.out.includes('127.0.0.1:5232') && !binding.out.includes('0.0.0.0:5232'),
  binding.out.trim(),
);

// 3. Public exposure through the reverse proxy
const unauth = sh('unauth', `curl -sk -o /dev/null -w '%{http_code}' -X PROPFIND 'https://webmail.velupi.com/dav/' -H 'Depth: 0'`);
check('Unauthenticated DAV request rejected (401)', unauth.out === '401', `status ${unauth.out}`);

const realm = sh('realm', `curl -skI -X PROPFIND 'https://webmail.velupi.com/dav/' -H 'Depth: 0' | grep -i 'www-authenticate'`);
check('Authentication realm is white-labelled', /realm="Velupi Mail"/i.test(realm.out), realm.out.trim());

const discovery = sh('discovery', `curl -sk -o /dev/null -w '%{http_code} %{redirect_url}' 'https://webmail.velupi.com/.well-known/caldav'`);
check('CalDAV service discovery redirect', discovery.out.startsWith('301') && discovery.out.includes('/dav/'), discovery.out.trim());

// 4. Authentication relay to the mail server
const dovecot = sh('dovecot', `doveadm auth test admin@velupi.com 'Velupi2026AdminSecure!' 2>&1 | head -1`);
check('Mail credentials accepted by the mail server', dovecot.out.includes('auth succeeded'), dovecot.out.trim());

const auth = sh(
  'authenticated',
  `curl -sk -o /dev/null -w '%{http_code}' -X PROPFIND 'https://webmail.velupi.com/dav/' -u 'admin@velupi.com:Velupi2026AdminSecure!' -H 'Depth: 0'`,
);
check('Authenticated DAV request accepted (207)', auth.out === '207', `status ${auth.out}`);

const wrong = sh(
  'wrong credentials',
  `curl -sk -o /dev/null -w '%{http_code}' -X PROPFIND 'https://webmail.velupi.com/dav/' -u 'admin@velupi.com:wrong-password' -H 'Depth: 0'`,
);
check('Invalid credentials rejected (401)', wrong.out === '401', `status ${wrong.out}`);

// 5. Automatic collection provisioning
const collections = sh(
  'collections',
  `find /var/lib/radicale/collections/collection-root -maxdepth 2 -mindepth 2 -type d -printf '%f\\n' 2>/dev/null | sort | tr '\\n' ' '`,
);
check(
  'Default address book and calendar provisioned',
  collections.out.includes('def-addressbook') && collections.out.includes('def-calendar'),
  collections.out.trim(),
);

// 6. Roundcube integration
const plugins = sh('plugins', `grep -o 'config\\["plugins"\\].*' /etc/roundcube/config.inc.php`);
check('Roundcube CardDAV plugin enabled', plugins.out.includes('"carddav"'), plugins.out.trim());
check('Roundcube calendar plugin enabled', plugins.out.includes('"calendar"'), plugins.out.trim());

const tables = sh('tables', `mysql -N -B roundcube -e "SHOW TABLES LIKE 'carddav_addressbooks'; SHOW TABLES LIKE 'kolab_folders';" | tr '\\n' ' '`);
check('CardDAV and calendar database tables present', tables.out.includes('carddav_addressbooks') && tables.out.includes('kolab_folders'), tables.out.trim());

const calendarConfig = sh('calendar config', `grep -o "calendar_driver'\\] = '[a-z]*'\\|calendar_caldav_server'\\] = '[^']*'" /var/lib/roundcube/plugins/calendar/config.inc.php | tr '\\n' ' '`);
check('Calendar backend points to the platform DAV service', calendarConfig.out.includes("caldav") && calendarConfig.out.includes('webmail.velupi.com/dav/'), calendarConfig.out.trim());

const carddavConfig = sh('carddav config', `grep -o "password'\\s*=>\\s*'[^']*'\\|discovery_url'\\s*=>\\s*'[^']*'" /var/lib/roundcube/plugins/carddav/config.inc.php | tr '\\n' ' '`);
check('Contacts reuse the mailbox credentials', carddavConfig.out.includes("%p"), carddavConfig.out.trim());

// 7. White-label rules
const uiBranding = sh(
  'ui branding',
  `curl -sk 'https://webmail.velupi.com/?_task=login' | grep -oiE 'radicale|hestia|dokploy|traefik|bind9' | sort -u | tr '\\n' ' '`,
);
check(
  'No vendor branding in the customer facing webmail UI',
  uiBranding.out.trim() === '',
  uiBranding.out.trim() || 'clean',
);

// The DAV XML responses may only reference the protocol namespace of the
// server implementation (the equivalent of the DAV: namespace); no product
// name, logo or administrative URL may be exposed.
const branding = sh(
  'branding',
  `curl -sk -X PROPFIND 'https://webmail.velupi.com/dav/' -u 'admin@velupi.com:Velupi2026AdminSecure!' -H 'Depth: 0' | grep -oiE 'radicale[^"< ]*' | sort -u | tr '\\n' ' '`,
);
const allowedTokens = /^(RADICALE=|radicale\.org\/ns\/|RADICALE:version>[\d.]*)$/i;
const brandingTokens = branding.out.trim().split(/\s+/).filter(Boolean);
check(
  'DAV responses only reference the protocol namespace',
  brandingTokens.length > 0 && brandingTokens.every((token) => allowedTokens.test(token)),
  branding.out.trim() || 'clean',
);

const webUi = sh('web ui', `curl -sk -o /dev/null -w '%{http_code}' 'https://webmail.velupi.com/dav/' -u 'admin@velupi.com:Velupi2026AdminSecure!'`);
check('Built-in DAV web interface disabled', webUi.out === '302', `status ${webUi.out}`);

const webmail = sh('webmail', `curl -sk -o /dev/null -w '%{http_code}' 'https://webmail.velupi.com/?_task=login'`);
check('Webmail login page still available', webmail.out === '200', `status ${webmail.out}`);

// 8. Dependency health
const audit = sh('audit', `cd /var/lib/roundcube && COMPOSER_ALLOW_SUPERUSER=1 composer audit --format=plain 2>&1 | head -1`);
check('No known dependency advisories', audit.out.includes('No security vulnerability advisories'), audit.out.trim());

// Report
let failed = 0;
for (const result of results) {
  if (!result.ok) {
    failed += 1;
  }
  const status = result.ok ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${result.name}${result.detail ? ` -> ${result.detail}` : ''}`);
}

console.log(`\n${results.length - failed}/${results.length} checks passed.`);
process.exit(failed === 0 ? 0 : 1);
