import { runHestia } from './exec-hestia.mjs';

function sh(cmd) {
  console.log('\n$ ' + cmd.slice(0, 120) + (cmd.length > 120 ? '…' : ''));
  try {
    const out = runHestia(cmd);
    if (out && out.trim()) console.log(out.trim());
    return out;
  } catch (err) {
    console.error('STDERR:', err.stderr);
    console.error('STDOUT:', err.stdout);
    throw err;
  }
}

// 1. Remove the broken appended block (from our marker comment to EOF)
sh("sed -i '/# Velupi Mail skin (global default for all customers)/,$d' /etc/roundcube/config.inc.php");
sh('tail -3 /etc/roundcube/config.inc.php');

// 2. Append the correct snippet via base64 (quoting-safe)
const snippet = "\n# Velupi Mail skin and branding (global default for all customers)\n$config['skin'] = 'velupi';\n$config['product_name'] = 'Velupi';\n";
const b64 = Buffer.from(snippet, 'utf-8').toString('base64');
sh(`echo ${b64} | base64 -d >> /etc/roundcube/config.inc.php`);
sh('tail -6 /etc/roundcube/config.inc.php');
sh("grep -n \"'skin'\\|'product_name'\" /etc/roundcube/config.inc.php");

// 3. PHP syntax check — abort loudly if broken
console.log('\n=== PHP LINT ===');
sh('php -l /etc/roundcube/config.inc.php');

// 4. Clear asset cache
sh('find /var/lib/roundcube/temp -mindepth 1 -delete');
