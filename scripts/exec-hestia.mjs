import { spawnSync } from 'node:child_process';

export function runHestia(remoteCommand, input) {
  const args = [
    '-batch',
    '-hostkey',
    'ssh-ed25519 255 SHA256:DzrNzr1lGZP3tFic1+dIMSaxD6ffoyq8xFmJaYop6yA',
    '-P',
    '10622',
    '-pw',
    'Elian20200916',
    'root@89.117.147.134',
    remoteCommand,
  ];
  const res = spawnSync('plink', args, { encoding: 'utf-8', input, maxBuffer: 16 * 1024 * 1024 });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    const err = new Error(`Remote command failed with exit code ${res.status}`);
    err.stdout = res.stdout;
    err.stderr = res.stderr;
    throw err;
  }
  return res.stdout;
}

if (process.argv[2]) {
  try {
    console.log(runHestia(process.argv[2]));
  } catch (err) {
    console.error('STDERR:', err.stderr);
    console.error('STDOUT:', err.stdout);
    process.exit(1);
  }
}
