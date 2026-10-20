import { runRemote } from './exec-on-vps.mjs';

function queryHestia(cmd, args = []) {
  let dataStr = `user=manager&hash=k4HHLIiCDxj9pIf1QwQK:y63wRUHzKpr8hdOSuHe6CPLYKGJsXHjMWrv6t86i&cmd=${cmd}`;
  args.forEach((a, idx) => {
    dataStr += `&arg${idx + 1}=${a}`;
  });
  const curlCmd = `curl -k -s -X POST https://89.117.147.134:8083/api/ -d "${dataStr}"`;
  return runRemote(curlCmd);
}

console.log('--- 1. Check Users ---');
const usersRes = queryHestia('v-list-users', ['json']);
try {
  console.log('Hestia users:', Object.keys(JSON.parse(usersRes)));
} catch {
  console.log('Raw users output:', usersRes);
}

console.log('\n--- 2. Check Web Domains for u_45232lpw39 ---');
const webRes = queryHestia('v-list-web-domains', ['u_45232lpw39', 'json']);
try {
  console.log('Web domains:', Object.keys(JSON.parse(webRes)));
} catch {
  console.log('Raw web output:', webRes);
}

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

