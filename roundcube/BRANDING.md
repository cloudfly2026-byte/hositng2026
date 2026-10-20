# Velupi Mail — Branding Reference (Warm Solar Light)

All branding is **centralized in `skins/velupi/css/variables.css`**. Every other stylesheet consumes these CSS custom properties. To rebrand the entire mail UI, edit `variables.css` only — no other screen-specific changes are required.

## Design tokens

| Token | Value | Usage |
|---|---|---|
| `--brand-primary` | `#FF6B00` | Primary actions, active states, unread markers |
| `--brand-primary-dark` | `#E85A00` | Hover / pressed |
| `--brand-secondary` | `#FF9100` | Secondary accents, attachment icon |
| `--brand-accent` | `#FFB800` | Highlights, flags/stars |
| `--brand-accent-light` | `#FFD54A` | Gradient stop |
| `--brand-gradient` | solar gradient | Decorative surfaces |
| `--background` | `#FFFDF9` | App background |
| `--background-alt` | `#FFF8ED` | Secondary background (login, toolbars) |
| `--surface` | `#FFFFFF` | Cards, panels, list surfaces |
| `--border` | `#F2E8DC` | Warm borders, dividers |
| `--text-primary` | `#2D1B17` | Primary text |
| `--text-secondary` | `#667085` | Secondary text |
| `--text-muted` | `#667085` | Muted text, dates, counts |
| `--text-on-brand` | `#FFFFFF` | Text on primary buttons |
| `--success` | `#16A34A` | Success |
| `--success-bg` / `--success-text` | `#D1FAE5` / `#065F46` | Success notices |
| `--warning` | `#D97706` | Warnings |
| `--error` | `#DC2626` | Errors |

## Typography

| Token | Stack |
|---|---|
| `--font-display` | `Poppins`, system fallbacks |
| `--font-body` | `Inter`, system fallbacks |

## Logo

- Source of truth: `apps/web/public/velupi-logo.png` (the same asset used by the `app.velupi.com` dashboard).
- Skin copy: `skins/velupi/images/velupi-logo.png`.
- Rendered on the login screen by `js/theme.js` (injected above the form). No CDN.

## Dark mode

Dark mode redefines the surface/text tokens (dark charcoal palette derived from the Velupi dark charcoal `#1A1311`). Activation:

1. **Explicit** — `js/theme.js` stores the choice in `localStorage` under `velupi:mail-theme` and sets `data-theme='dark'` on `<html>`.
2. **Implicit** — if no stored choice, `prefers-color-scheme: dark` applies unless the user chose light.

## Rebranding procedure

1. Update the token values in `css/variables.css`.
2. Replace `images/velupi-logo.png` (and regenerate `thumbnail.png` if desired).
3. Run the skin test suite: `pnpm vitest run roundcube/skins/velupi/__tests__/skin.spec.ts` (it asserts the official palette).
4. Redeploy per `INSTALL.md`.

## White-label rule

The skin must never expose infrastructure providers (HestiaCP, Traefik, BIND9, Docker, Portainer) or internal CLI/paths — enforced by the `white-label integrity` tests in `__tests__/skin.spec.ts` (`AGENTS.md` §19.1).
