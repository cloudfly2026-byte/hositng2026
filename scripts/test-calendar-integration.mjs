import { runHestia } from './exec-hestia.mjs';

function sh(label, cmd) {
  console.log('--- ' + label + ' ---');
  try {
    console.log(runHestia(cmd).trim() || '(none)'); }
  catch (err) { console.log('ERR:', (err.stderr || err.stdout || '').trim()); }
}

sh('write temp credential file', `printf '%s' 'Velupi2026AdminSecure!' > /root/.davtest.pw && chmod 600 /root/.davtest.pw && echo ok`);

sh('login', `cd /tmp && rm -f rc-cookies.txt && curl -sk -c /tmp/rc-cookies.txt -o /tmp/rc-form.html 'https://webmail.velupi.com/?_task=login' && PW=$(cat /root/.davtest.pw) && TOKEN=$(grep -o 'name="_token" value="[^"]*"' /tmp/rc-form.html | head -1 | sed 's/.*value="\\([^"]*\\)"/\\1/') && curl -sk -b /tmp/rc-cookies.txt -c /tmp/rc-cookies.txt -o /dev/null -w 'login=%{http_code}\\n' -X POST 'https://webmail.velupi.com/?_task=login' --data-urlencode "_token=$TOKEN" --data-urlencode '_task=login' --data-urlencode '_action=login' --data-urlencode '_timezone=America/Bogota' --data-urlencode '_url=' --data-urlencode '_user=admin@velupi.com' --data-urlencode "_pass=$PW" --data-urlencode '_remember=0'`);

sh('load calendar task', `curl -sk -b /tmp/rc-cookies.txt -c /tmp/rc-cookies.txt -o /tmp/rc-cal.html -w 'calendar=%{http_code}\\n' 'https://webmail.velupi.com/?_task=calendar'; echo "size=$(wc -c < /tmp/rc-cal.html)"; echo "Calendario occurrences: $(grep -c 'Calendario' /tmp/rc-cal.html)"; grep -oiE 'fatal error|uncaught [a-z]+ error' /tmp/rc-cal.html | head -3`);

sh('radicale requests during calendar load', `journalctl -u radicale --since '-3 min' --no-pager | grep -E 'PROPFIND request|REPORT request|GET request' | tail -8`);

sh('roundcube errors since test', `tail -200 /var/log/roundcube/errors.log | grep -E 'calendar|kolab|dav' | tail -8`);

sh('cleanup', `rm -f /root/.davtest.pw && echo removed`);
