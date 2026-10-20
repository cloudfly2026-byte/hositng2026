import { runHestia } from './exec-hestia.mjs';

function sh(label, cmd) {
  console.log('--- ' + label + ' ---');
  try {
    console.log(runHestia(cmd).trim() || '(none)');
  } catch (err) {
    console.log('STDERR:', (err.stderr || '').trim());
    console.log('STDOUT:', (err.stdout || '').trim());
  }
}

sh('fetch login page', `curl -s -o /tmp/rc-login.html -w 'code=%{http_code} size=%{size_download}\\n' -L 'http://127.0.0.1/?_task=login' -H 'Host: webmail.cloudfly.com.co'`);
sh('title + Roundcube strings', `grep -o '<title>[^<]*</title>' /tmp/rc-login.html; grep -o 'Roundcube[^<"&]*' /tmp/rc-login.html | sort -u`);
sh('login form markup', `grep -n -A4 'login-form' /tmp/rc-login.html | head -40`);
sh('td.title cells', `grep -o '<td class="title"[^>]*>[^<]*' /tmp/rc-login.html`);
