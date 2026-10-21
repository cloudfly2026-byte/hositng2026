import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const webPublic = path.resolve(root, 'apps/web/public');
const skinImages = path.resolve(root, 'roundcube/skins/velupi/images');

// 1. Copy favicon assets
const filesToCopy = [
  ['favicon.ico', 'favicon.ico'],
  ['favicon-32x32.png', 'favicon.png'],
  ['apple-touch-icon.png', 'apple-touch-icon.png'],
];

for (const [src, dest] of filesToCopy) {
  const srcPath = path.resolve(webPublic, src);
  const destPath = path.resolve(skinImages, dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${src} -> ${dest} (${fs.statSync(destPath).size} bytes)`);
  }
}

// 2. SSH function
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

// 3. Upload skin files
console.log('--- Uploading updated skin files to VPS ---');
const skinsDir = path.resolve(root, 'roundcube/skins');
const tar = spawnSync('tar', ['-C', skinsDir, '-cf', '-', 'velupi'], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
if (tar.status !== 0) throw new Error('tar failed: ' + tar.stderr);
ssh('tar -xf - -C /var/lib/roundcube/skins/', tar.stdout);

// Also copy favicon.ico to roundcube root and public_html so /favicon.ico serves Velupi favicon
const faviconBuffer = fs.readFileSync(path.resolve(skinImages, 'favicon.ico'));
const tarFavicon = spawnSync('tar', ['-C', skinImages, '-cf', '-', 'favicon.ico', 'favicon.png'], { encoding: 'buffer' });
ssh('tar -xf - -C /var/lib/roundcube/public_html/', tarFavicon.stdout);
ssh('tar -xf - -C /var/lib/roundcube/', tarFavicon.stdout);

// Set permissions
ssh('chown -R hestiamail:www-data /var/lib/roundcube/skins/velupi && chmod -R a+rX /var/lib/roundcube/skins/velupi');

// 4. Update /etc/roundcube/config.inc.php with favicon config
console.log('--- Updating config.inc.php ---');
ssh("sed -i \"/\\$config\\['favicon'\\]/d\" /etc/roundcube/config.inc.php");
const favConfig = "$config['favicon'] = 'skins/velupi/images/favicon.ico';\n";
const b64 = Buffer.from(favConfig, 'utf-8').toString('base64');
ssh(`echo ${b64} | base64 -d >> /etc/roundcube/config.inc.php`);
console.log(ssh("php -l /etc/roundcube/config.inc.php && grep -n \"'favicon'\" /etc/roundcube/config.inc.php").trim());

// Clear roundcube temp cache
ssh('rm -rf /var/lib/roundcube/temp/* 2>/dev/null; echo "cache cleared"');
console.log('--- Favicon deployed successfully ---');
