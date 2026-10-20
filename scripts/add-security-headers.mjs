import { spawnSync } from 'node:child_process';

function ssh(remoteCommand, input) {
  const res = spawnSync('plink', [
    '-batch',
    '-hostkey',
    'ssh-ed25519 255 SHA256:DzrNzr1lGZP3tFic1+dIMSaxD6ffoyq8xFmJaYop6yA',
    '-P',
    '10622',
    '-pw',
    'Elian20200916',
    'root@89.117.147.134',
    remoteCommand,
  ], { encoding: 'utf-8', input, maxBuffer: 64 * 1024 * 1024 });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    const err = new Error(`Remote failed: ${res.status}`);
    err.stdout = res.stdout;
    err.stderr = res.stderr;
    throw err;
  }
  return res.stdout;
}

const confPath = '/home/velupi/conf/mail/velupi.com/nginx.ssl.conf';
const current = ssh(`cat ${confPath}`);

if (!current.includes('Strict-Transport-Security')) {
  console.log('Adding security headers to nginx.ssl.conf...');
  const headers = `
\tadd_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
\tadd_header X-Content-Type-Options "nosniff" always;
\tadd_header X-XSS-Protection "1; mode=block" always;
\tadd_header Referrer-Policy "strict-origin-when-cross-origin" always;
`;
  const updated = current.replace(
    'ssl_certificate_key /home/velupi/conf/mail/velupi.com/ssl/velupi.com.key;',
    'ssl_certificate_key /home/velupi/conf/mail/velupi.com/ssl/velupi.com.key;' + headers
  );
  const b64 = Buffer.from(updated, 'utf-8').toString('base64');
  ssh(`echo ${b64} | base64 -d > ${confPath}`);
  console.log('Testing Nginx syntax:');
  console.log(ssh('nginx -t 2>&1').trim());
  console.log(ssh('systemctl reload nginx && echo "Nginx reloaded with security headers"').trim());
} else {
  console.log('Security headers already present.');
}
