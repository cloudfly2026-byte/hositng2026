import { spawnSync } from 'node:child_process';

export function runRemote(remoteCommand, input) {
  const args = [
    '-batch',
    '-hostkey',
    'ssh-ed25519 255 SHA256:bTgaIzwlklC6Lw0zsIM2UU25jo0+Abx0vvAfqn2Cd/c',
    '-pw',
    'Elian20200916',
    'root@169.58.220.244',
    remoteCommand,
  ];
  const res = spawnSync('plink', args, { encoding: 'utf-8', input });
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
    const out = runRemote(process.argv[2]);
    console.log(out);
  } catch (err) {
    console.error('STDERR:', err.stderr);
    console.error('STDOUT:', err.stdout);
    process.exit(1);
  }
}
