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

console.log('--- 1. Update /etc/roundcube/config.inc.php ---');
const phpSnippet = `
# Canonical Webmail Host Redirect (Velupi Cloud Webmail)
if (!empty($_SERVER['HTTP_HOST']) && php_sapi_name() !== 'cli') {
    $currentHost = strtolower(explode(':', $_SERVER['HTTP_HOST'])[0]);
    if ($currentHost !== 'webmail.velupi.com' && $currentHost !== '127.0.0.1' && $currentHost !== 'localhost') {
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        header('Location: https://webmail.velupi.com' . $uri, true, 301);
        exit;
    }
}
`;

// Remove previous snippet if any, then append
ssh("sed -i '/# Canonical Webmail Host Redirect/,/exit;/d' /etc/roundcube/config.inc.php");
const b64Php = Buffer.from(phpSnippet, 'utf-8').toString('base64');
ssh(`echo ${b64Php} | base64 -d >> /etc/roundcube/config.inc.php`);
console.log(ssh('php -l /etc/roundcube/config.inc.php').trim());

console.log('--- 2. Update Hestia Nginx mail templates ---');
// In default.tpl, add the redirect right after server_name
const tplRedirect = `\n\tif ($host != "webmail.velupi.com") {\n\t\treturn 301 https://webmail.velupi.com$request_uri;\n\t}\n`;
const b64Tpl = Buffer.from(tplRedirect, 'utf-8').toString('base64');

// Update default.tpl and default.stpl
ssh("sed -i '/if ($host != \"webmail.velupi.com\")/d' /usr/local/hestia/data/templates/mail/nginx/default.tpl");
ssh("sed -i '/return 301 https:\\/\\/webmail.velupi.com/d' /usr/local/hestia/data/templates/mail/nginx/default.tpl");
ssh("sed -i '/server_name %domain_idn% %alias_idn%;/a \\tif ($host != \"webmail.velupi.com\") {\\n\\t\\treturn 301 https://webmail.velupi.com$request_uri;\\n\\t}' /usr/local/hestia/data/templates/mail/nginx/default.tpl");

ssh("sed -i '/if ($host != \"webmail.velupi.com\")/d' /usr/local/hestia/data/templates/mail/nginx/default.stpl");
ssh("sed -i '/return 301 https:\\/\\/webmail.velupi.com/d' /usr/local/hestia/data/templates/mail/nginx/default.stpl");
ssh("sed -i '/server_name %domain_idn% %alias_idn%;/a \\tif ($host != \"webmail.velupi.com\") {\\n\\t\\treturn 301 https://webmail.velupi.com$request_uri;\\n\\t}' /usr/local/hestia/data/templates/mail/nginx/default.stpl");

console.log('--- 3. Rebuild all mail domains on Hestia ---');
const users = ['cloudfly', 'demolicion', 'ebmmetrology', 'hospita2', 'nueveluna', 'prenem', 'protor', 'pulguero', 'velupi'];
for (const u of users) {
  try {
    ssh(`/usr/local/hestia/bin/v-rebuild-mail-domains ${u}`);
    console.log(`Rebuilt mail domains for ${u}: OK`);
  } catch (e) {
    console.warn(`Rebuild failed for ${u}:`, e.message);
  }
}

console.log('--- 4. Verify Nginx configuration ---');
console.log(ssh('nginx -t 2>&1').trim());

console.log('--- 5. Reload Nginx ---');
console.log(ssh('systemctl reload nginx && echo "nginx reloaded"').trim());
