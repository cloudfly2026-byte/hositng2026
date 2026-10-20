# Velupi DAV — CalDAV / CardDAV service

Internal technical document for the calendar and contact service backing **Velupi Mail**
(Roundcube). User facing instructions are in [Guía para usuarios](#guía-para-usuarios).

---

## 1. Architecture

```text
Client (Roundcube / Thunderbird / DAVx⁵ / iOS)
        │  HTTPS  https://webmail.velupi.com/dav/
        ▼
nginx (TLS, cert velupi.com)            /home/velupi/conf/mail/velupi.com/nginx.ssl.conf_radicale
        │  proxy_pass http://127.0.0.1:5232  +  X-Script-Name: /dav
        ▼
Radicale 3.8.3 (loopback only)          systemd unit: radicale.service
        │  auth: dovecot (unix socket /var/run/dovecot/auth-client)
        ▼
Dovecot → mailbox credentials of the user
        │
        ▼
Storage /var/lib/radicale/collections/collection-root/<user>/{def-addressbook,def-calendar}
```

Design decisions:

| Decision | Rationale |
|---|---|
| Radicale from PyPI in `/opt/radicale/venv` | The distribution package (3.1.8) is outdated and lacks the `dovecot` auth backend. The venv keeps the host Python untouched. |
| Bound to `127.0.0.1:5232` | The service is never exposed directly; nginx is the only entry point (TLS + HSTS + rate limiting of the webmail vhost). |
| `auth type = dovecot` | Users authenticate with the **same credentials as their mailbox**. No duplicated user database, no second password to manage. |
| `realm = "Velupi Mail"` | The string shown by clients when they ask for credentials. White-label requirement. |
| `[web] type = none` | The built-in web interface is disabled: only the DAV endpoints answer, so no third party branding is ever rendered. |
| `predefined_collections` | Every user automatically gets a `Contactos` address book and a `Calendario` collection on first access, with Spanish display names. |
| `urldecode_username = True` | iOS and Android clients URL-encode the `@` of the user part of the address. |
| Reverse proxy under `/dav/` | Reuses the existing `webmail.velupi.com` certificate and DNS, and keeps the customer facing brand. |

## 2. Installed components

| Component | Version | Location |
|---|---|---|
| Radicale | 3.8.3 | `/opt/radicale/venv` |
| Unit file | — | `/etc/systemd/system/radicale.service` |
| Configuration | — | `/etc/radicale/config` (mode 640, `root:radicale`) |
| Storage | — | `/var/lib/radicale/collections` (`radicale:radicale`, `o=` removed) |
| nginx snippet | — | `/home/velupi/conf/mail/velupi.com/nginx.ssl.conf_radicale` |
| Plugin `carddav` | 5.1.4 | `/var/lib/roundcube/plugins/carddav` (release tarball, `vendor/` included) |
| Plugins `libkolab`, `libcalendaring`, `calendar` | 3.6.1 | `/var/lib/roundcube/plugins/{libkolab,libcalendaring,calendar}` |
| `pear/http_request2` | 2.8.0 | `/var/lib/roundcube/vendor/pear/http_request2` (required by the calendar DAV client) |

Roundcube configuration:

```php
$config['plugins'] = ["password", "newmail_notifier", "zipdownload", "archive",
                      "carddav", "libkolab", "libcalendaring", "calendar"];
```

- `plugins/carddav/config.inc.php`: preset **Velupi Contactos** → `discovery_url = https://webmail.velupi.com/dav/`,
  `username = %u`, `password = %p` (the placeholder is replaced at runtime by the mailbox password of the
  signed in user, so nothing is stored in the database).
- `plugins/calendar/config.inc.php`: `calendar_driver = caldav`,
  `calendar_caldav_server = https://webmail.velupi.com/dav/`. The per user home collection is resolved
  through the DAV principal discovery, therefore a single URL serves every tenant.

## 3. Known constraints of the calendar stack

The calendar plugin is a community maintained fork of the Kolab plugins. Mitigations applied:

| Risk | Mitigation |
|---|---|
| PHP 8 fatal errors on string/int bit operations | Configuration values are typed as upstream expects (`calendar_itip_send_option` int, `calendar_default_alarm_offset` string `-15M`). |
| `calendar_default_view` must be a FullCalendar view id | Set to `agendaDay` (`day` is not a valid view and breaks the client side rendering). |
| `HTTP_Request2` is not shipped with Roundcube 1.6 | Installed through composer (`pear/http_request2` 2.8.0, patched against CVE-2025-43717). |
| Dependency tree drift | `composer audit` is part of the verification suite; it currently reports **no advisories**. |
| Kolab specific properties (`k:alarms`) | Ignored by the server, they only produce `404` entries inside the `propstat` of a `PROPFIND`, which is valid DAV. |

To disable the calendar without touching the mail service, remove `calendar`, `libcalendaring` and
`libkolab` from `$config['plugins']` and reload the webmail. Contacts keep working.

## 4. Operations

```bash
# Service
systemctl status radicale
journalctl -u radicale -f

# Verification suite (19 checks, live production)
node scripts/verify-radicale.mjs

# Storage
ls -la /var/lib/radicale/collections/collection-root/
```

Backup: `tar czf radicale-collections.tar.gz /var/lib/radicale/collections` and the Roundcube database
(`mysqldump roundcube`), because the calendar and contact caches are stored in MySQL.

## 5. Rollback

1. `cp /etc/roundcube/config.inc.php.bak-20261020-radicale /etc/roundcube/config.inc.php` (restores the
   plugin list without `carddav`/`calendar`).
2. `systemctl disable --now radicale` (the reverse proxy then answers `502`, the webmail keeps working).
3. Optional: `rm -f /home/velupi/conf/mail/velupi.com/nginx.ssl.conf_radicale && nginx -t && systemctl reload nginx`.
4. Optional: `rm -rf /var/lib/roundcube/plugins/{carddav,libkolab,libcalendaring,calendar}`.

## 6. Guía para usuarios

Los calendarios y la lista de contactos de Velupi Mail están almacenados en la plataforma y se sincronizan
automáticamente:

- **En el webmail (Velupi Mail)**: la sección *Calendario* muestra tus eventos y la sección *Contactos*
  tu agenda. Todo lo que guardas ahí queda sincronizado con tus demás dispositivos.
- **En el celular (iOS / Android)**: añade una cuenta de tipo *CalDAV* (o *CardDAV*) con estos datos:

  | Campo | Valor |
  |---|---|
  | Servidor | `https://webmail.velupi.com/dav/` |
  | Usuario | Tu correo completo, por ejemplo `usuario@velupi.com` |
  | Contraseña | La misma del buzón de correo |
  | SSL | Activado |

- **En Thunderbird**: *Configuración de cuentas → Nueva cuenta → CalDAV*, con la misma URL y credenciales.
- **En Google Calendar o iCloud**: usa la opción *Agregar otro calendario* con la misma URL.

Tus calendarios y contactos pertenecen únicamente a tu cuenta: cada usuario tiene su propio espacio privado
y nadie más puede verlos.
