import { runRemote } from './exec-on-vps.mjs';

function queryHestia(cmd, args = []) {
  let dataStr = `user=manager&hash=k4HHLIiCDxj9pIf1QwQK:y63wRUHzKpr8hdOSuHe6CPLYKGJsXHjMWrv6t86i&cmd=${cmd}`;
  args.forEach((a, idx) => {
    dataStr += `&arg${idx + 1}=${a}`;
  });
  const curlCmd = `curl -k -s -X POST https://89.117.147.134:8083/api/ -d "${dataStr}"`;
  return runRemote(curlCmd);
}

console.log('--- Mail accounts velupi.com ---');
console.log(queryHestia('v-list-mail-account', ['velupi', 'velupi.com', 'admin', 'json']));

console.log('--- 2. Check Mail Accounts for velupi.com ---');
const mailAccountsVelupi = queryHestia('v-list-mail-accounts', ['velupi', 'velupi.com', 'json']);
console.log('Mail accounts velupi.com:', mailAccountsVelupi);

console.log('--- 3. Check Mail Domains for cloudfly ---');
const mailResCloudfly = queryHestia('v-list-mail-domains', ['cloudfly', 'json']);
console.log('Mail domains cloudfly:', mailResCloudfly);

console.log('--- 4. Check Mail Accounts for cloudfly.com.co ---');
const mailAccountsCloudfly = queryHestia('v-list-mail-accounts', ['cloudfly', 'cloudfly.com.co', 'json']);
console.log('Mail accounts cloudfly.com.co:', mailAccountsCloudfly);

console.log('\n--- 3. Check DNS Zones for u_45232lpw39 ---');
const dnsRes = queryHestia('v-list-dns-domains', ['u_45232lpw39', 'json']);
try {
  console.log('DNS domains:', Object.keys(JSON.parse(dnsRes)));
} catch {
  console.log('Raw DNS output:', dnsRes);
}

console.log('\n--- 4. Check Mail Accounts for easysnotes.com ---');
const mailRes = queryHestia('v-list-mail-accounts', ['u_45232lpw39', 'easysnotes.com', 'json']);
try {
  console.log('Mail accounts:', Object.keys(JSON.parse(mailRes)));
} catch {
  console.log('Raw mail output:', mailRes);
}

