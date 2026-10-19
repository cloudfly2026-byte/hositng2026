import { runRemote } from './exec-on-vps.mjs';

const cmd = `curl -k -s -X POST https://89.117.147.134:8083/api/ -d "user=manager&hash=k4HHLIiCDxj9pIf1QwQK:y63wRUHzKpr8hdOSuHe6CPLYKGJsXHjMWrv6t86i&cmd=v-list-users&arg1=json"`;
const res = runRemote(cmd);
try {
  const users = JSON.parse(res);
  console.log('Hestia users:', Object.keys(users));
} catch (e) {
  console.log('Raw Hestia output:', res);
}
