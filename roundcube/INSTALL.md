# Velupi Mail — Installation, Activation & Rollback

> **Environment rule (`AGENTS.md` §18.1):** production infrastructure runs exclusively on the VPS. This guide targets the HestiaCP host that serves Roundcube (webmail). **All steps below mutate production mail infrastructure and require explicit user authorization before execution.**

## 1. Target

| Item | Value |
|---|---|
| Host | HestiaCP node (`89.117.147.134`) |
| Webmail URL (verified live) | `https://webmail.velupi.com/` (Roundcube 1.6.17, Elastic) |
| Roundcube skins dir | `/usr/share/roundcube/skins/` (standard HestiaCP package path — confirm with `dpkg -L roundcube` or `ls /usr/share/roundcube/skins`) |
| Roundcube config | `/etc/roundcube/config.inc.php` (confirm with `grep skin /etc/roundcube/config.inc.php`) |

> Inspect the actual paths on the host before applying. Do not assume package layout.

## 2. Build the installable package

From the repository root:

```powershell
Compress-Archive -Path roundcube\skins\velupi -DestinationPath roundcube\velupi-skin.zip -Force
```

(The committed `velupi-skin.zip` is generated the same way.)

## 3. Deploy (requires authorization)

```bash
# 3.1 Backup the current config
cp /etc/roundcube/config.inc.php /etc/roundcube/config.inc.php.bak-$(date +%Y%m%d_%H%M%S)

# 3.2 Copy the skin (unzip so that skins/velupi/ results)
unzip -o /tmp/velupi-skin.zip -d /usr/share/roundcube/skins/

# 3.3 Fix ownership/permissions (match existing skins)
chown -R root:www-data /usr/share/roundcube/skins/velupi
find /usr/share/roundcube/skins/velupi -type d -exec chmod 755 {} \;
find /usr/share/roundcube/skins/velupi -type f -exec chmod 644 {} \;

# 3.4 Activate the skin
# In /etc/roundcube/config.inc.php set:
#   $config['skin'] = 'velupi';
# Roundcube falls back to the previous skin automatically if loading fails.

# 3.5 Clear the Roundcube temp cache (avoids stale compiled assets)
rm -rf /var/lib/roundcube/temp/* 2>/dev/null || true
```

## 4. Verification checklist

1. `https://webmail.velupi.com/` renders the Velupi login screen with the official logo.
2. Login works with an existing mailbox (authentication is untouched Roundcube behavior).
3. Folders, message list, reading pane, composer, contacts and settings are functional.
4. Attachments can be downloaded and uploaded.
5. Dark mode follows the OS preference and the in-app toggle persists across reloads.
6. Mobile viewport (≤640px) is usable.
7. No critical console errors; no white-label leaks (Hestia/Traefik/etc.).
8. `checkWhiteLabelIntegrity` passes over the skin files.

## 5. Rollback (immediate)

```bash
# Option A — switch back to Elastic (config change only)
sed -i "s/\$config\['skin'\] = 'velupi';/\$config['skin'] = 'elastic';/" /etc/roundcube/config.inc.php
rm -rf /var/lib/roundcube/temp/* 2>/dev/null || true

# Option B — restore the config backup
cp /etc/roundcube/config.inc.php.bak-<timestamp> /etc/roundcube/config.inc.php

# Option C — remove the skin entirely
rm -rf /usr/share/roundcube/skins/velupi
```

Roundcube keeps serving mail during all rollback options; no IMAP/SMTP service is stopped by a skin change.

## 6. Notes

- The skin does **not** modify IMAP/SMTP, authentication, mail sending, plugins or the Roundcube core.
- No SSO is implemented; Velupi's existing secure autologin (`GET /hosting/sso/webmail`) can open the webmail without changes.
- Fonts: the skin references `Poppins`/`Inter` for consistency with the portal. If those fonts are not installed on the host, the CSS stack falls back to system fonts — no CDN is loaded (CSP-safe).
