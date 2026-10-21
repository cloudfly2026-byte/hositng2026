import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SKINS = resolve(ROOT, 'roundcube/skins');

function ssh(remoteCommand, input) {
  const res = spawnSync('plink', [
    '-batch',
    '-hostkey',
    'ssh-ed25519 255 SHA256:DzrNzr1lGZP3tFic1+dIMSaxD6ffoyq8xFmJaYop6yA',
    '-P',
    '10622',
    '-pw',
    process.env.HESTIA_SSH_PASSWORD || process.env.SSH_PASSWORD || '',
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

console.log('--- upload files ---');
const tar = spawnSync('tar', ['-C', SKINS, '-cf', '-', 'velupi'], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
if (tar.status !== 0) throw new Error('tar failed: ' + tar.stderr);
ssh('tar -xf - -C /var/lib/roundcube/skins/', tar.stdout);

console.log('--- perms ---');
console.log(ssh('sh -c "chown -R hestiamail:www-data /var/lib/roundcube/skins/velupi && chmod -R a+rX /var/lib/roundcube/skins/velupi && find /var/lib/roundcube/skins/velupi -type f | sort"').trim());

console.log('--- clear temp ---');
console.log(ssh('sh -c "rm -rf /var/lib/roundcube/temp/* 2>/dev/null; echo ok"').trim());
