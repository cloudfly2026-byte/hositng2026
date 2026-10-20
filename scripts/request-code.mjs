import { runRemote } from './exec-on-vps.mjs';

const script = `
fetch('http://127.0.0.1:4000/auth/request-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@velupi.com' })
})
.then(r => r.json())
.then(data => {
  console.log('RESPONSE:', JSON.stringify(data));
})
.catch(err => console.error('FETCH ERR:', err));
`;

const out = runRemote('node', script);
console.log('OUTPUT:', out);
