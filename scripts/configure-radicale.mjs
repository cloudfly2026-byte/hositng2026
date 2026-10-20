import { runHestia } from './exec-hestia.mjs';

function sh(label, cmd) {
  console.log('--- ' + label + ' ---');
  try {
    console.log(runHestia(cmd).trim() || '(none)'); }
  catch (err) { console.log('ERR:', (err.stderr || err.stdout || '').trim()); }
}

const CONFIG = [
  '[server]',
  '# Loopback only: public access is provided through the nginx reverse proxy.',
  'hosts = 127.0.0.1:5232',
  'max_connections = 20',
  'max_content_length = 10000000',
  'timeout = 30',
  '',
  '[auth]',
  '# Relay authentication to the local Dovecot instance so that DAV clients',
  '# reuse the mailbox credentials (no duplicated user database).',
  'type = dovecot',
  'dovecot_connection_type = AF_UNIX',
  'dovecot_socket = /var/run/dovecot/auth-client',
  '# White-label: the realm is shown by clients when asking for credentials.',
  'realm = Velupi Mail',
  'delay = 1',
  'cache_logins = True',
  'cache_successful_logins_expiry = 15',
  'cache_failed_logins_expiry = 90',
  '# Mobile clients (iOS/Android) URL-encode the user part of the address.',
  'urldecode_username = True',
  '',
  '[rights]',
  '# Every user only owns the collections stored under their own path.',
  'type = owner_only',
  '',
  '[storage]',
  'filesystem_folder = /var/lib/radicale/collections',
  '# Every user receives a default address book and calendar on first access.',
  'predefined_collections = {"def-addressbook":{"D:displayname":"Contactos","tag":"VADDRESSBOOK"},"def-calendar":{"C:supported-calendar-component-set":"VEVENT,VJOURNAL,VTODO","D:displayname":"Calendario","tag":"VCALENDAR"}}',
  '',
  '[web]',
  '# The bundled web interface is disabled: only the DAV endpoints are served,',
  '# so no third-party branding is ever exposed to Velupi customers.',
  'type = none',
  '',
  '[logging]',
  'level = info',
  'mask_passwords = True',
  '',
].join('\n');

const UNIT = [
  '[Unit]',
  'Description=Velupi CalDAV/CardDAV server (Radicale)',
  'Documentation=https://radicale.org/v3.html',
  'After=network.target dovecot.service',
  '',
  '[Service]',
  'Type=simple',
  'User=radicale',
  'Group=radicale',
  'SupplementaryGroups=mail',
  'Environment=RADICALE_CONFIG=/etc/radicale/config',
  'ExecStart=/opt/radicale/venv/bin/radicale --config /etc/radicale/config',
  'Restart=on-failure',
  'RestartSec=5',
  'ProtectSystem=full',
  'ProtectHome=yes',
  'PrivateTmp=yes',
  'NoNewPrivileges=yes',
  'RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6',
  'ReadWritePaths=/var/lib/radicale',
  '',
  '[Install]',
  'WantedBy=multi-user.target',
  '',
].join('\n');

sh('write radicale config', `mkdir -p /etc/radicale && cat > /etc/radicale/config << 'RADICALE_EOF'\n${CONFIG}RADICALE_EOF\nchown root:radicale /etc/radicale/config && chmod 640 /etc/radicale/config && cat /etc/radicale/config`);

sh('write systemd unit', `cat > /etc/systemd/system/radicale.service << 'UNIT_EOF'\n${UNIT}UNIT_EOF\nchmod 644 /etc/systemd/system/radicale.service && systemctl daemon-reload && systemctl enable radicale && systemctl restart radicale; sleep 3; systemctl is-enabled radicale; systemctl is-active radicale`);

sh('service status + logs', `systemctl status radicale --no-pager -n 20 2>&1 | head -25; journalctl -u radicale -n 20 --no-pager 2>&1 | tail -20`);
