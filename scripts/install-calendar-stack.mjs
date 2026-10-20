import { runHestia } from './exec-hestia.mjs';

/**
 * Installs the calendar stack of the Velupi Mail platform into Roundcube:
 *
 *   plugins/calendar       (community maintained fork of the Kolab plugin)
 *   plugins/libcalendaring
 *   plugins/libkolab
 *
 * The release archives do not ship their composer dependencies, they are
 * resolved by the Roundcube autoloader (see install-pear-http-request2.mjs).
 */

function sh(label, cmd) {
  console.log('--- ' + label + ' ---');
  try {
    console.log(runHestia(cmd).trim() || '(none)'); }
  catch (err) { console.log('ERR:', (err.stderr || err.stdout || '').trim()); }
}

const VERSION = '3.6.1';

sh(
  'download releases',
  `cd /tmp && rm -rf calstack && mkdir calstack && cd calstack && \\
curl -sL -o calendar.zip https://github.com/texxasrulez/calendar/releases/download/${VERSION}/calendar-v${VERSION}.zip && \\
curl -sL -o libcalendaring.zip https://github.com/texxasrulez/libcalendaring/releases/download/${VERSION}/libcalendaring-v${VERSION}.zip && \\
curl -sL -o libkolab.zip https://github.com/texxasrulez/libkolab/releases/download/${VERSION}/libkolab-v${VERSION}.zip && \\
for z in calendar libcalendaring libkolab; do mkdir -p $z && (cd $z && unzip -qo ../$z.zip); done && ls`,
);

sh(
  'install plugin dirs',
  `for p in libkolab libcalendaring calendar; do rm -rf /var/lib/roundcube/plugins/$p; cp -a /tmp/calstack/$p /var/lib/roundcube/plugins/$p; done; \\
chown -R hestiamail:www-data /var/lib/roundcube/plugins/libkolab /var/lib/roundcube/plugins/libcalendaring /var/lib/roundcube/plugins/calendar; \\
find /var/lib/roundcube/plugins/libkolab /var/lib/roundcube/plugins/libcalendaring /var/lib/roundcube/plugins/calendar -type d -exec chmod 755 {} +; \\
find /var/lib/roundcube/plugins/libkolab /var/lib/roundcube/plugins/libcalendaring /var/lib/roundcube/plugins/calendar -type f -exec chmod 644 {} +; \\
ls -d /var/lib/roundcube/plugins/libkolab /var/lib/roundcube/plugins/libcalendaring /var/lib/roundcube/plugins/calendar`,
);

sh(
  'php lint main entrypoints',
  `php -l /var/lib/roundcube/plugins/calendar/calendar.php; php -l /var/lib/roundcube/plugins/libkolab/libkolab.php; php -l /var/lib/roundcube/plugins/libcalendaring/libcalendaring.php`,
);

sh(
  'init libkolab db tables',
  `cd /var/lib/roundcube && php bin/initdb.sh --dir=plugins/libkolab/SQL 2>&1 | tail -5`,
);

sh(
  'init calendar caldav db tables',
  `cd /var/lib/roundcube && php bin/initdb.sh --dir=plugins/calendar/drivers/caldav/SQL 2>&1 | tail -5`,
);

sh(
  'verify tables',
  `mysql -N -B roundcube -e "SHOW TABLES LIKE 'kolab_folders'; SHOW TABLES LIKE 'itipinvitations';"`,
);
