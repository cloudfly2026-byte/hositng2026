# Velupi Mail — Test Report (TDD Evidence)

**Date:** 2026-10-20
**Suite:** `roundcube/skins/velupi/__tests__/skin.spec.ts`
**Runner:** Vitest 3.2.7 (root `vitest.config.ts`, `roundcube/**` included)
**Result:** **51/51 passed — 100% GREEN**

## RED → GREEN cycle

### RED

The suite was written first and executed against a non-existent skin, failing as expected:

```text
FAIL roundcube/skins/velupi/__tests__/skin.spec.ts
Error: ENOENT: no such file or directory, open '...\roundcube\skins\velupi\css\variables.css'
Test Files  1 failed (1)
```

The failure was the correct RED reason: the contract (manifest, tokens, partials, dark mode, responsive, runtime, assets, white-label, CSP) had no implementation yet.

### GREEN

The skin was implemented (manifest, centralized tokens, six partials, theme runtime, logo, thumbnail). Result:

```text
✓ roundcube/skins/velupi/__tests__/skin.spec.ts (49 tests) 23ms
Test Files  1 passed (1)
     Tests  49 passed (49)
```

### Second RED → GREEN cycle (live QA findings)

Browser QA against the deployed skin exposed two defects the first suite could not catch:

1. **Stale CSS delivery.** `styles.css` loaded its partials with `@import`, which Roundcube never versions — the server had the new `login.css` but the browser kept serving a cached copy. **RED:** tests required `templates/includes/layout.html` to link every partial directly (Roundcube appends `?s=filemtime` per file) and forbade `@import` chains. **GREEN:** `styles.css` removed; seven `<link>` tags added in dependency order; the obsolete file was also deleted on the server.
2. **Dead selectors.** `layout.css`/`mail.css`/`compose.css`/`dark.css`/`responsive.css` targeted ids that do not exist in Elastic 1.6 (`#rcmbody`, `#header`, `#sidebar`, `#preview`, `#compose-form`, `#compose-table`, `#messagelist-options`, `#rcmbtn-compose`, `#rcmloginsubmit`… in non-login contexts). **RED:** an allowlist test maps every `#id` in the structural CSS to ids actually emitted by the Elastic 1.6 templates. **GREEN:** selectors remapped to the real markup (`body`, `#layout-menu`, `#taskmenu`, `#layout-sidebar`, `#mailboxlist`, `#messagelist-header`, `#message-header`, `#message-content`, `#compose-content`, `#compose-headers`, `#composebodycontainer`, `.pagenav`).

```text
✓ roundcube/skins/velupi/__tests__/skin.spec.ts (51 tests) 23ms
```

Dark-mode regression found during QA: `dark.css` painted `body` with `--surface`, hiding the login card (same color). Fixed with `body:not(.task-login)` on both activation paths.

## Regression run (full monorepo)

```text
Test Files  57 passed (57)
     Tests  512 passed (512)
```

`pnpm typecheck` (`tsc -b --force` across all projects): **0 errors**.

## Coverage of the acceptance contract

| Requirement | Verified by |
|---|---|
| Child skin of Elastic (no core modification) | `meta.json` extends `elastic` |
| Centralized branding tokens | `css/variables.css` token assertions |
| Official Warm Solar Light palette | token value assertions (source: `VELUPI_TOKENS`) |
| Typography (Poppins/Inter) | font token assertions |
| Light + dark modes (`prefers-color-scheme` + persisted toggle) | `css/dark.css` + `js/theme.js` assertions |
| Responsive three-panel layout | `css/responsive.css` breakpoints |
| Logo from the portal dashboard asset | `images/velupi-logo.png` exists; referenced only from skin folder |
| No third-party CDNs (CSP-safe) | no external `http(s)` asset URLs in CSS/JS |
| No dangerous JS (`eval`, `document.write`) | runtime assertions |
| No auth/transport manipulation by skin JS | runtime assertions |
| White-label integrity | banned-token scan over all skin files |

## Live verification (executed 2026-10-20)

Executed against the deployed skin on `http://webmail.cloudfly.com.co/?_task=login` (same instance as `https://webmail.velupi.com/`):

| Check | Evidence | Result |
|---|---|---|
| Skin active | `rcmail.set_env` reports `"skin":"velupi"` | PASS |
| Logo resolves to the Velupi skin | `#logo` src = `skins/velupi/images/logo.svg?s=1792477634` → HTTP 200 | PASS |
| Partials cache-busted | Network: `css/{variables,layout,login,mail,compose,responsive,dark}.css?s=<mtime>` (no `@import`) | PASS |
| Dead selectors | Computed stylesheet scan: 0 rules matching `#rcmLogin|#rcmbody|#preview|#sidebar` | PASS |
| Light theme | `roundcube/qa-login-light.png` — warm `#FFF8ED` page, white card, 1px `--border`, orange `#FF6B00` CTA | PASS |
| Dark theme | `roundcube/qa-login-dark.png` — `#221917` page, `#241B18` card, borders `#3A2B26`, CTA keeps brand orange | PASS |
| White-label (server-side) | `grep -riE 'hestia\|dokploy\|traefik\|bind9\|docker\|v-add-'` over deployed skin → CLEAN | PASS |

Pending (needs a real mailbox): read, compose/send, attachments, contacts and mobile QA of the authenticated app frame.

---

# Velupi DAV — Test Report (TDD Evidence)

**Date:** 2026-10-20
**Suite:** `scripts/verify-radicale.mjs` (19 live checks against production)
**Subject:** CalDAV/CardDAV service (Radicale 3.8.3) + Roundcube integration (contacts and calendar)
**Result:** **19/19 passed - 100% GREEN**

## RED -> GREEN cycles

Each defect below was reproduced (RED) before the fix and re-verified (GREEN) against the live server.

### 1. Missing HTTP client for the calendar DAV client

**RED:** `GET /?_task=calendar` returned `500`; `errors.log` showed
`PHP Fatal error: Uncaught Error: Failed opening required 'HTTP/Request2.php'`
(`plugins/libkolab/lib/kolab_dav_client.php:1228`). Roundcube 1.6 dropped the PEAR `HTTP_Request2`
dependency that the Kolab DAV client requires.

**GREEN:** `composer require pear/http_request2` (resolved to 2.8.0, the release that fixes
CVE-2025-43717) inside the Roundcube installation; `class_exists('HTTP_Request2')` is now resolved
through the composer autoloader.

### 2. PHP 8 type error on the iTip control

**RED:** `PHP Fatal error: Uncaught TypeError: Unsupported operand types: string & int`
(`plugins/libcalendaring/lib/libcalendaring_itip.php:892`), caused by
`$config['calendar_itip_send_option'] = 'prompt'` (the plugin expects an integer mask).

**GREEN:** the string override was removed; the upstream default (3) applies.

### 3. PHP 8 warnings on the alarm defaults

**RED:** `PHP Warning: Trying to access array offset on int` (`libcalendaring.php:512`) and
`... on false` (`:424`, `:425`), caused by `calendar_default_alarm_offset = 15` (integer) instead of
the iCal style string.

**GREEN:** `calendar_default_alarm_type = ''` and `calendar_default_alarm_offset = '-15M'`.

### 4. Invalid client side view id

**RED:** browser console showed `Uncaught Error: View type "day" is not valid (0 args)`; the calendar
frame stayed in the loading state.

**GREEN:** `calendar_default_view = 'agendaDay'` (the FullCalendar view id used by the plugin).

### 5. Dependency advisories in the mail server

**RED:** `composer audit` reported 14 advisories in `guzzlehttp/guzzle` (< 7.15.1) and 1 in
`pear/http_request2` (< 2.7.0).

**GREEN:** `guzzle` upgraded to 7.16.0, `psr7` 2.13.2, `promises` 2.6.0, `http_request2` 2.8.0 ->
`composer audit` reports **no security vulnerability advisories**.

## Live verification (executed 2026-10-20, production)

| Check | Evidence | Result |
|---|---|---|
| Service state | `systemctl is-active radicale` -> active, `is-enabled` -> enabled | PASS |
| Network exposure | `ss -tlnp` -> `127.0.0.1:5232` only, no public listener | PASS |
| Unauthenticated request | `PROPFIND https://webmail.velupi.com/dav/` -> `401` | PASS |
| White-label realm | `www-authenticate: Basic realm="Velupi Mail"` | PASS |
| Service discovery | `/.well-known/caldav` -> `301 https://webmail.velupi.com/dav/` | PASS |
| Credential relay | `doveadm auth test` -> `auth succeeded`; DAV `PROPFIND` -> `207` | PASS |
| Invalid credentials | `PROPFIND` with a wrong password -> `401` | PASS |
| Auto provisioning | `collection-root/<user>/def-addressbook` + `def-calendar` created on first access | PASS |
| Contacts plugin | `carddav` in `$config['plugins']`, `carddav_addressbooks` row -> `Contactos` (Radicale URL) | PASS |
| Calendar plugin | `calendar`/`libkolab`/`libcalendaring` enabled, `kolab_folders` table present | PASS |
| Calendar backend | `calendar_driver = caldav`, `calendar_caldav_server = https://webmail.velupi.com/dav/` | PASS |
| No duplicated credentials | CardDAV preset stores `%p` (runtime substitution of the mailbox password) | PASS |
| UI white-label | scan of the login page -> no `radicale|hestia|dokploy|traefik|bind9` | PASS |
| Protocol namespace | DAV XML only references `http://radicale.org/ns/` (namespace constant, no product name) | PASS |
| DAV web interface | `GET /dav/` -> `302` (built-in UI disabled) | PASS |
| Webmail health | `https://webmail.velupi.com/?_task=login` -> `200` | PASS |
| Dependency health | `composer audit` -> no advisories | PASS |

## End to end scenarios (browser + protocol)

| Scenario | Steps | Evidence | Result |
|---|---|---|---|
| E2E 1 - Calendar write | Velupi Mail -> Calendario -> Crear -> "Reunión de validacion Velupi DAV" | Radicale log: `PUT /dav/admin@velupi.com/def-calendar/<uid>.ics` -> `201 Created`; stored `.ics` with `SUMMARY`, `LOCATION: Bogota`, `TZID:America/Bogota` | PASS |
| E2E 2 - Calendar read | Reload of the calendar view | Event rendered in the day grid at 15:00 with location `Bogota` (`roundcube/qa-calendar-event.png`) | PASS |
| E2E 3 - Contact write | Velupi Mail -> Contactos -> Crear -> "Contacto Velupi DAV" | Radicale log: `PUT /dav/admin@velupi.com/def-addressbook/sabre-vobject-<uuid>.vcf` -> `201 Created`; stored vCard with `FN:Contacto Velupi DAV`, `EMAIL;TYPE=home:qa.dav@velupi.com` | PASS |
| E2E 4 - Discovery | Roundcube login with the mailbox credentials | `carddav_accounts` row with `discovery_url` and `presetname = Velupi Contactos`; calendar view lists `Calendario` | PASS |
| E2E 5 - Cleanup | DAV `DELETE` of the test event and contact | `200` responses, no orphan `.ics`/`.vcf` left in the storage | PASS |

Reference implementation: `roundcube/DAV.md` (architecture, operations, rollback and the user guide).
