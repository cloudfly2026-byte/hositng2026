import { runHestia } from './exec-hestia.mjs';

function sh(label, cmd) {
  console.log('--- ' + label + ' ---');
  try {
    console.log(runHestia(cmd).trim() || '(none)'); }
  catch (err) { console.log('ERR:', (err.stderr || err.stdout || '').trim()); }
}

const CALENDAR_CONFIG = `<?php

//// Calendar plugin configuration - Velupi Cloud Platform
////
//// The calendars are stored in the platform CalDAV service and reached through
//// the webmail reverse proxy. The plugin authenticates every request with the
//// credentials of the signed in user, so no duplicated credential store is
//// required.

//// Storage backend: generic CalDAV (the platform DAV service).
$config['calendar_driver'] = 'caldav';

//// Base URL of the DAV service. The per-user home collection is discovered
//// through the DAV principal discovery, so a single URL serves every tenant.
$config['calendar_caldav_server'] = 'https://webmail.velupi.com/dav/';

//// Default view and calendar behaviour.
$config['calendar_default_view'] = 'day';
$config['calendar_first_day'] = 1;
$config['calendar_agenda_range'] = 30;
$config['calendar_timeslots'] = 1;
$config['calendar_default_alarm_type'] = 'DISPLAY';
$config['calendar_default_alarm_offset'] = 15;
$config['calendar_event_coloring'] = true;
$config['calendar_allow_invite_shared'] = false;
$config['calendar_itip_send_option'] = 'prompt';

//// Keep the plugin self-contained: no browser notifications require the
//// optional extras of the upstream distribution.
$config['calendar_show_alarms'] = true;
`;

sh('write calendar plugin config', `cat > /var/lib/roundcube/plugins/calendar/config.inc.php << 'CAL_EOF'\n${CALENDAR_CONFIG}CAL_EOF\nchown hestiamail:www-data /var/lib/roundcube/plugins/calendar/config.inc.php && chmod 644 /var/lib/roundcube/plugins/calendar/config.inc.php && php -l /var/lib/roundcube/plugins/calendar/config.inc.php`);

sh('enable calendar plugins in roundcube', `cp -a /etc/roundcube/config.inc.php /etc/roundcube/config.inc.php.bak-20261020-calendar && python3 - << 'PY'
path = '/etc/roundcube/config.inc.php'
text = open(path).read()
old = '$config["plugins"] = ["password", "newmail_notifier", "zipdownload", "archive", "carddav"];'
new = '$config["plugins"] = ["password", "newmail_notifier", "zipdownload", "archive", "carddav", "libkolab", "libcalendaring", "calendar"];'
if '"calendar"' in text:
    print('already enabled')
else:
    assert old in text, 'plugins line not found'
    open(path, 'w').write(text.replace(old, new))
    print('enabled')
PY
grep -n 'config\\["plugins"\\]' /etc/roundcube/config.inc.php`);

sh('clear temp cache', `rm -rf /var/lib/roundcube/temp/* 2>/dev/null; echo cleaned`);

sh('verify webmail still loads (no fatal)', `curl -sk -o /tmp/rc-check.html -w 'login=%{http_code}\\n' 'https://webmail.velupi.com/?_task=login'; grep -c 'Fatal error\\|Uncaught' /tmp/rc-check.html`);
