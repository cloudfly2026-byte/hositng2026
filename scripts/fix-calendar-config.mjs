import { runHestia } from './exec-hestia.mjs';

function sh(label, cmd) {
  console.log('--- ' + label + ' ---');
  try {
    console.log(runHestia(cmd).trim() || '(none)'); }
  catch (err) { console.log('ERR:', (err.stderr || err.stdout || '').trim()); }
}

sh('fix default view', `sed -i "s/^\\$config\\['calendar_default_view'\\] = 'day';/\\$config['calendar_default_view'] = 'agendaDay';/" /var/lib/roundcube/plugins/calendar/config.inc.php; grep -n "default_view\\|timeslots" /var/lib/roundcube/plugins/calendar/config.inc.php; php -l /var/lib/roundcube/plugins/calendar/config.inc.php`);

sh('clear temp', `rm -rf /var/lib/roundcube/temp/* 2>/dev/null; echo cleaned`);

sh('dav debug off (production hygiene)', `rm -f /var/lib/roundcube/plugins/libkolab/config.inc.php && echo removed`);
