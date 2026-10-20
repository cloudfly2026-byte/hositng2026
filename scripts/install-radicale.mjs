import { runHestia } from './exec-hestia.mjs';

function sh(label, cmd, input) {
  console.log('--- ' + label + ' ---');
  try {
    console.log(runHestia(cmd, input).trim() || '(none)');
  } catch (err) {
    console.log('ERR:', (err.stderr || err.stdout || '').trim());
  }
}

sh('install python3-venv', `DEBIAN_FRONTEND=noninteractive apt-get update -qq >/dev/null 2>&1; DEBIAN_FRONTEND=noninteractive apt-get install -y -qq python3-venv python3-pip 2>&1 | tail -5; python3 -m venv --help >/dev/null && echo venv-ready`);

sh('create radicale user', `id radicale 2>/dev/null || useradd --system --user-group --home-dir /var/lib/radicale --shell /usr/sbin/nologin radicale; id radicale`);

sh('add radicale to mail group', `usermod -aG mail radicale; id radicale`);

sh('create storage dirs', `mkdir -p /var/lib/radicale/collections && chown -R radicale:radicale /var/lib/radicale && chmod 750 /var/lib/radicale && chmod -R o= /var/lib/radicale/collections && ls -ld /var/lib/radicale /var/lib/radicale/collections`);

sh('create venv and install radicale', `python3 -m venv /opt/radicale/venv && /opt/radicale/venv/bin/pip install --quiet --upgrade pip wheel setuptools 2>&1 | tail -2; /opt/radicale/venv/bin/pip install --quiet --upgrade radicale 2>&1 | tail -5; /opt/radicale/venv/bin/radicale --version`);
