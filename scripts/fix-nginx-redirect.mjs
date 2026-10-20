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

console.log('--- Fixing tif to if in all configs and templates ---');
ssh("sed -i 's/^tif /\\tif /g' /usr/local/hestia/data/templates/mail/nginx/default.tpl");
ssh("sed -i 's/^tif /\\tif /g' /usr/local/hestia/data/templates/mail/nginx/default.stpl");
ssh("find /home/*/conf/mail/ -name 'nginx*.conf' -exec sed -i 's/^tif /\\tif /g' {} +");

console.log('--- Testing Nginx syntax ---');
console.log(ssh('nginx -t 2>&1').trim());

console.log('--- Reloading Nginx ---');
console.log(ssh('systemctl reload nginx && echo "nginx reloaded successfully"').trim());
