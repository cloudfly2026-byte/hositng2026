import { runHestia } from './exec-hestia.mjs';

/**
 * Configures the collections that every user receives automatically on the
 * first access to the DAV service:
 *
 *   def-addressbook -> "Contactos"   (CardDAV address book)
 *   def-calendar    -> "Calendario"  (CalDAV calendar)
 */

function sh(label, cmd) {
  console.log('--- ' + label + ' ---');
  try {
    console.log(runHestia(cmd).trim() || '(none)'); }
  catch (err) { console.log('ERR:', (err.stderr || err.stdout || '').trim()); }
}

const COLLECTIONS = JSON.stringify({
  'def-addressbook': {
    'D:displayname': 'Contactos',
    tag: 'VADDRESSBOOK',
  },
  'def-calendar': {
    'C:supported-calendar-component-set': 'VEVENT,VJOURNAL,VTODO',
    'D:displayname': 'Calendario',
    tag: 'VCALENDAR',
  },
});

sh(
  'dry run on a copy of the config',
  `printf '%s' '${COLLECTIONS}' > /tmp/predefined-collections.json && \\
cp /etc/radicale/config /tmp/radicale-config.dryrun && \\
awk -v json="$(cat /tmp/predefined-collections.json)" '/^\\[web\\]/ && !done { print "predefined_collections = " json; print ""; done=1 } { print }' /tmp/radicale-config.dryrun > /tmp/radicale-config.dryrun.new && \\
grep -n 'predefined_collections' /tmp/radicale-config.dryrun.new && echo dry-run-ok`,
);

sh(
  'apply to the live config',
  `if grep -q '^predefined_collections' /etc/radicale/config; then echo 'already present'; \\
else cp /etc/radicale/config /etc/radicale/config.bak-$(date +%Y%m%d) && \\
awk -v json="$(cat /tmp/predefined-collections.json)" '/^\\[web\\]/ && !done { print "predefined_collections = " json; print ""; done=1 } { print }' /etc/radicale/config > /tmp/radicale-config.new && \\
mv /tmp/radicale-config.new /etc/radicale/config && chown root:radicale /etc/radicale/config && chmod 640 /etc/radicale/config && echo applied; fi; \\
sed -n '/\\[storage\\]/,/\\[logging\\]/p' /etc/radicale/config`,
);

sh(
  'restart and validate config',
  `systemctl restart radicale; sleep 3; systemctl is-active radicale; journalctl -u radicale -n 40 --no-pager | grep -iE 'error|ready' | tail -5`,
);

sh(
  'collections of the existing user',
  `find /var/lib/radicale/collections/collection-root -maxdepth 2 -mindepth 2 -type d -printf '%f\\n' | sort | tr '\\n' ' '`,
);
