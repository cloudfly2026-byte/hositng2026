import { runRemote } from './exec-on-vps.mjs';

function probe(cmd) {
  try {
    return runRemote(cmd);
  } catch (err) {
    return 'ERR: ' + (err.stderr || err.message);
  }
}

// 1. Full login page head — look for version strings
console.log('===== LOGIN PAGE HEAD =====');
console.log(probe(`curl -k -s -L -m 15 'http://webmail.velupi.com/' | tr '>' '>\\n' | grep -iE 'version|1\\.[0-9]+\\.[0-9]+|meta name|stylesheet' | head -20`));

// 2. Elastic meta.json (skin metadata served statically)
console.log('\n===== ELASTIC META.JSON =====');
console.log(probe(`curl -k -s -L -m 15 'http://webmail.velupi.com/skins/elastic/meta.json' | head -c 1500`));

// 3. Roundcube skins listing + available skins
console.log('\n===== SKINS DIR PROBE =====');
for (const skin of ['elastic', 'classic', 'velupi']) {
  const code = probe(`curl -k -s -o /dev/null -m 10 -w '%{http_code}' 'http://webmail.velupi.com/skins/${skin}/meta.json'`);
  console.log(`skins/${skin}/meta.json -> HTTP ${code}`);
}

// 4. Plugins listing (common ones)
console.log('\n===== PLUGINS PROBE =====');
for (const p of ['zipdownload', 'managesieve', 'enigma', 'twofactor_gauthenticator', 'password', 'hide_delete', 'newuser_identity', 'acl', 'attachment-placeholder']) {
  const code = probe(`curl -k -s -o /dev/null -m 8 -w '%{http_code}' 'http://webmail.velupi.com/plugins/${p}/'`);
  console.log(`plugins/${p} -> HTTP ${code}`);
}

// 5. PHP info via login form action hints + task list
console.log('\n===== LOGIN FORM SNIPPET =====');
console.log(probe(`curl -k -s -L -m 15 'http://webmail.velupi.com/?_task=login' | grep -oE '<(form|input|button|div id="[^"]+"|body id="[^"]+")[^>]*' | head -20`));
