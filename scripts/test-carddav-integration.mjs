import { runHestia } from './exec-hestia.mjs';

function sh(label, cmd) {
  console.log('--- ' + label + ' ---');
  try {
    console.log(runHestia(cmd).trim() || '(none)'); }
  catch (err) { console.log('ERR:', (err.stderr || err.stdout || '').trim()); }
}

sh('write temp credential file', `printf '%s' 'Velupi2026AdminSecure!' > /root/.davtest.pw && chmod 600 /root/.davtest.pw && echo ok`);

sh('step 1: get login form + token', `cd /tmp && rm -f rc-cookies.txt && curl -sk -c /tmp/rc-cookies.txt -o /tmp/rc-form.html -w 'get=%{http_code}\\n' 'https://webmail.velupi.com/?_task=login' && grep -o 'name="_token" value="[^"]*"' /tmp/rc-form.html | head -2; grep -o 'request_token[^,;]*' /tmp/rc-form.html | head -2`);

sh('step 2: login with token', `cd /tmp && PW=$(cat /root/.davtest.pw) && TOKEN=$(grep -o 'name="_token" value="[^"]*"' /tmp/rc-form.html | head -1 | sed 's/.*value="\\([^"]*\\)"/\\1/') && echo "token_len=$(printf '%s' "$TOKEN" | wc -c)" && curl -sk -b /tmp/rc-cookies.txt -c /tmp/rc-cookies.txt -o /tmp/rc-post.html -w 'post=%{http_code} redirect=%{redirect_url}\\n' -X POST 'https://webmail.velupi.com/?_task=login' --data-urlencode "_token=$TOKEN" --data-urlencode '_task=login' --data-urlencode '_action=login' --data-urlencode '_timezone=America/Bogota' --data-urlencode '_url=' --data-urlencode '_user=admin@velupi.com' --data-urlencode "_pass=$PW" --data-urlencode '_remember=0'`);

sh('step 3: load addressbook with session', `curl -sk -b /tmp/rc-cookies.txt -c /tmp/rc-cookies.txt -o /tmp/rc-ab.html -w 'addressbook=%{http_code}\\n' 'https://webmail.velupi.com/?_task=addressbook'; echo "mentions Contactos: $(grep -c 'Contactos' /tmp/rc-ab.html)"; grep -o 'carddav[a-z_]*' /tmp/rc-ab.html | sort -u | head -5`);

sh('carddav tables in db', `mysql -N -B roundcube -e "SHOW TABLES LIKE 'carddav%';" 2>&1 | head -10`);

sh('addressbook rows', `mysql -N -B roundcube -e "SELECT id, name, username, url FROM carddav_accounts;" 2>&1 | head -5; echo ---; mysql -N -B roundcube -e "SELECT id, name, url, synctime FROM carddav_addressbooks;" 2>&1 | head -5`);

sh('errors in log (last 20 lines)', `tail -25 /var/log/roundcube/errors.log | tail -12`);

sh('cleanup', `rm -f /root/.davtest.pw && echo removed`);
