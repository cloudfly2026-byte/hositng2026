# Velupi Mail — Roundcube Skin

Professional Roundcube Webmail skin for **Velupi Cloud Platform**, built as a **child skin of Elastic** (Roundcube 1.6.x) and themed with the official **Warm Solar Light** design system.

**Powered by Velupi Cloud Platform.**

## Highlights

- Child skin of Elastic: inherits all templates, functionality and plugin compatibility. No core files are modified.
- Centralized branding: every color, font and elevation token lives in `skins/velupi/css/variables.css`. Rebranding the whole UI only requires editing that file.
- Light and dark modes: respects `prefers-color-scheme` and honors an explicit, persisted user choice (`localStorage` key `velupi:mail-theme`).
- Responsive three-panel layout (folders / message list / reading pane) with tablet and mobile breakpoints.
- Customized login screen with the official Velupi logo (`apps/web/public/velupi-logo.png`), same asset used by the customer portal.
- White-label compliant (`AGENTS.md` §19.1): zero references to infrastructure providers.
- CSP-safe: no third-party CDNs, no external fonts, no `eval`.

## Repository layout

```text
roundcube/
├── skins/velupi/          # The installable skin
│   ├── meta.json          # Manifest (extends: elastic)
│   ├── styles.css         # Entry stylesheet (imports partials)
│   ├── thumbnail.png      # Skin picker thumbnail
│   ├── css/
│   │   ├── variables.css  # ★ Single source of truth for branding
│   │   ├── layout.css     # Application shell
│   │   ├── login.css      # Login screen
│   │   ├── mail.css       # Message list & reading pane
│   │   ├── compose.css    # Composer
│   │   ├── responsive.css # Breakpoints
│   │   └── dark.css       # Dark mode overrides
│   ├── js/theme.js        # Theme runtime (branding + light/dark)
│   ├── images/velupi-logo.png
│   └── __tests__/skin.spec.ts
├── README.md              # This file
├── INSTALL.md             # Deployment & rollback guide
├── BRANDING.md            # Design tokens reference
└── TEST_REPORT.md         # TDD evidence
```

## Documentation

| Document | Purpose |
|---|---|
| [INSTALL.md](./INSTALL.md) | Install, activate and rollback on a HestiaCP host |
| [BRANDING.md](./BRANDING.md) | Warm Solar Light tokens and how to rebrand |
| [TEST_REPORT.md](./TEST_REPORT.md) | TDD (RED → GREEN → REFACTOR) evidence |

## Requirements

- Roundcube **1.6.x** (verified against **1.6.17**, `rcversion 10617`) with the **Elastic** skin present (stock).
- The login screen, folders, message list, reading pane, composer, contacts and settings all come from Elastic via inheritance.

## License

GPL-3.0+ (same license as Roundcube).
