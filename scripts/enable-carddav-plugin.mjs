import { runHestia } from './exec-hestia.mjs';

function sh(label, cmd) {
  console.log('--- ' + label + ' ---');
  try {
    console.log(runHestia(cmd).trim() || '(none)'); }
  catch (err) { console.log('ERR:', (err.stderr || err.stdout || '').trim()); }
}

const PLUGIN_CONFIG = `<?php

//// RCMCardDAV Plugin Admin Settings - Velupi Cloud Platform
////
//// The address books are served by the internal CalDAV/CardDAV service and are
//// reached through the webmail reverse proxy. Users authenticate with the very
//// same credentials they use for their mailbox: the "%p" placeholder is
//// replaced by the Roundcube/IMAP password at runtime, so no duplicate
//// credential store is required.

$prefs['_GLOBAL']['loglevel'] = \\Psr\\Log\\LogLevel::WARNING;
$prefs['_GLOBAL']['loglevel_http'] = \\Psr\\Log\\LogLevel::ERROR;

// Users are not allowed to register additional external address books: the
// platform only exposes the Velupi managed ones.
$prefs['_GLOBAL']['fixed'] = true;

// The CardDAV section of the preferences is hidden: the address books are
// provisioned by the platform.
$prefs['_GLOBAL']['hide_preferences'] = true;

$prefs['Velupi Contactos'] = [
    'accountname'            => 'Velupi Contactos',
    'username'               => '%u',
    'password'               => '%p',
    'discovery_url'          => 'https://webmail.velupi.com/dav/',
    'rediscover_time'        => '24:00:00',
    'hide'                   => false,
    'preemptive_basic_auth'  => true,
    'ssl_noverify'           => false,
    'name'                   => '%N',
    'active'                 => true,
    'readonly'               => false,
    'refresh_time'           => '1',
    'use_categories'         => true,
    'fixed'                  => ['username', 'password', 'discovery_url'],
];
`;

sh('install plugin files', `rm -rf /var/lib/roundcube/plugins/carddav && cp -a /tmp/carddav-dl/carddav /var/lib/roundcube/plugins/carddav && chown -R hestiamail:www-data /var/lib/roundcube/plugins/carddav && find /var/lib/roundcube/plugins/carddav -type d -exec chmod 755 {} + && find /var/lib/roundcube/plugins/carddav -type f -exec chmod 644 {} + && ls -ld /var/lib/roundcube/plugins/carddav && ls /var/lib/roundcube/plugins/carddav | head`);

sh('write plugin config', `cat > /var/lib/roundcube/plugins/carddav/config.inc.php << 'PLUGIN_EOF'\n${PLUGIN_CONFIG}PLUGIN_EOF\nchown hestiamail:www-data /var/lib/roundcube/plugins/carddav/config.inc.php && chmod 644 /var/lib/roundcube/plugins/carddav/config.inc.php && php -l /var/lib/roundcube/plugins/carddav/config.inc.php`);

sh('enable plugin in roundcube config', `cp -a /etc/roundcube/config.inc.php /etc/roundcube/config.inc.php.bak-20261020-carddav && python3 - << 'PY'
path = '/etc/roundcube/config.inc.php'
text = open(path).read()
old = '$config["plugins"] = ["password", "newmail_notifier", "zipdownload", "archive"];'
new = '$config["plugins"] = ["password", "newmail_notifier", "zipdownload", "archive", "carddav"];'
if 'carddav' in text:
    print('already enabled')
else:
    assert old in text, 'plugins line not found'
    open(path, 'w').write(text.replace(old, new))
    print('enabled')
PY
grep -n 'config\\["plugins"\\]' /etc/roundcube/config.inc.php`);

sh('clear roundcube cache', `rm -rf /var/lib/roundcube/temp/* 2>/dev/null; rm -f /var/lib/roundcube/SQL/*.sql.new 2>/dev/null; echo cleaned`);

sh('php lint plugin entrypoint', `php -l /var/lib/roundcube/plugins/carddav/carddav.php`);
