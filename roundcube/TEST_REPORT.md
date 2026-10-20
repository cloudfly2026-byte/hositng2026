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
