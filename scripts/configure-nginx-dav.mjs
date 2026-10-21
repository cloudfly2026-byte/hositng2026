import { runHestia } from './exec-hestia.mjs';

function sh(label, cmd) {
  console.log('--- ' + label + ' ---');
  try {
    console.log(runHestia(cmd).trim() || '(none)'); }
  catch (err) { console.log('ERR:', (err.stderr || err.stdout || '').trim()); }
}

const SNIPPET = [
  '# Velupi DAV (CalDAV/CardDAV) - reverse proxy towards the internal DAV service.',
  '# The service listens on the loopback interface only and authenticates the',
  '# users against the mail server, so no third-party branding or credentials',
  '# are exposed to the end customer.',
  'location /dav/ {',
  '    proxy_pass http://127.0.0.1:5232;',
  '    proxy_http_version 1.1;',
  '    proxy_set_header Host $host;',
  '    proxy_set_header X-Script-Name /dav;',
  '    proxy_set_header X-Real-IP $remote_addr;',
  '    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
  '    proxy_set_header X-Forwarded-Host $host;',
  '    proxy_set_header X-Forwarded-Port $server_port;',
  '    proxy_set_header X-Forwarded-Proto $scheme;',
  '    proxy_set_header Authorization $http_authorization;',
  '    proxy_request_buffering off;',
  '    proxy_read_timeout 120;',
  '    proxy_send_timeout 120;',
  '    client_max_body_size 10m;',
  '}',
  '',
  '# Service discovery for calendar and contact clients.',
  'location = /.well-known/caldav {',
  '    return 301 /dav/;',
  '}',
  '',
  'location = /.well-known/carddav {',
  '    return 301 /dav/;',
  '}',
  '',
].join('\n');

sh('write nginx snippet for mail vhost', `cat > /home/velupi/conf/mail/velupi.com/nginx.ssl.conf_radicale << 'NGINX_EOF'\n${SNIPPET}NGINX_EOF\nchmod 644 /home/velupi/conf/mail/velupi.com/nginx.ssl.conf_radicale && cat /home/velupi/conf/mail/velupi.com/nginx.ssl.conf_radicale`);

sh('nginx config test', `nginx -t 2>&1 | tail -5`);

sh('reload nginx', `systemctl reload nginx && sleep 2 && systemctl is-active nginx`);

sh('unauthenticated PROPFIND over TLS (expect 401)', `curl -sk -o /dev/null -w 'code=%{http_code}\\n' -X PROPFIND 'https://webmail.velupi.com/dav/' -H 'Depth: 0'`);

const testPw = process.env.TEST_EMAIL_PASSWORD || '';
sh('authenticated PROPFIND over TLS (expect 207)', `curl -sk -o /tmp/dav.xml -w 'code=%{http_code}\\n' -X PROPFIND 'https://webmail.velupi.com/dav/' -u 'admin@velupi.com:${testPw}' -H 'Depth: 0'; head -c 600 /tmp/dav.xml`);

sh('well-known discovery', `curl -sk -o /dev/null -w 'caldav=%{http_code} redirect=%{redirect_url}\\n' 'https://webmail.velupi.com/.well-known/caldav'; curl -sk -o /dev/null -w 'carddav=%{http_code} redirect=%{redirect_url}\\n' 'https://webmail.velupi.com/.well-known/carddav'`);

sh('webmail still healthy', `curl -sk -o /dev/null -w 'login=%{http_code}\\n' 'https://webmail.velupi.com/?_task=login'`);

sh('no radicale branding in response headers', `curl -skI 'https://webmail.velupi.com/dav/' | grep -iE 'server:|www-authenticate|realm' | head -5`);
