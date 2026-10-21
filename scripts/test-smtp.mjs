import { runRemote } from './exec-on-vps.mjs';

const script = `
const net = require('net');
const tls = require('tls');

const host = '89.117.147.134';
const port = 587;
const user = 'admin@velupi.com';
const password = process.env.TEST_EMAIL_PASSWORD || process.env.SMTP_PASSWORD || '';
const fromEmail = 'admin@velupi.com';
const toEmail = 'admin@velupi.com';

const socket = net.createConnection(port, host);
let step = 0;
let secureSocket = null;

const handleData = (activeSocket, data) => {
  const str = data.toString();
  console.log('RECV:', str.trim());
  if (str.startsWith('220') && step === 0) {
    step = 1;
    console.log('SEND: EHLO cloudfly.com.co');
    activeSocket.write('EHLO cloudfly.com.co\\r\\n');
  } else if (str.startsWith('250') && step === 1) {
    step = 2;
    console.log('SEND: STARTTLS');
    activeSocket.write('STARTTLS\\r\\n');
  } else if (str.startsWith('220') && step === 2) {
    step = 3;
    console.log('CONNECT TLS');
    secureSocket = tls.connect({ socket: activeSocket, rejectUnauthorized: false }, () => {
      console.log('SEND TLS: EHLO cloudfly.com.co');
      secureSocket.write('EHLO cloudfly.com.co\\r\\n');
    });
    secureSocket.on('data', (d) => handleData(secureSocket, d));
    secureSocket.on('error', (e) => console.error('TLS ERR:', e));
  } else if (str.startsWith('250') && step === 3) {
    step = 4;
    console.log('SEND: AUTH LOGIN');
    secureSocket.write('AUTH LOGIN\\r\\n');
  } else if (str.startsWith('334') && step === 4) {
    step = 5;
    console.log('SEND USER');
    secureSocket.write(Buffer.from(user).toString('base64') + '\\r\\n');
  } else if (str.startsWith('334') && step === 5) {
    step = 6;
    console.log('SEND PASS');
    secureSocket.write(Buffer.from(password).toString('base64') + '\\r\\n');
  } else if (str.startsWith('235') && step === 6) {
    step = 7;
    console.log('AUTH OK, SEND MAIL FROM');
    secureSocket.write('MAIL FROM:<' + fromEmail + '>\\r\\n');
  } else if (str.startsWith('250') && step === 7) {
    step = 8;
    console.log('SEND RCPT TO');
    secureSocket.write('RCPT TO:<' + toEmail + '>\\r\\n');
  } else if (str.startsWith('250') && step === 8) {
    step = 9;
    console.log('SEND DATA');
    secureSocket.write('DATA\\r\\n');
  } else if (str.startsWith('354') && step === 9) {
    step = 10;
    console.log('SEND BODY');
    secureSocket.write('From: "Velupi Platform" <' + fromEmail + '>\\r\\nTo: <' + toEmail + '>\\r\\nSubject: Test OTP Email\\r\\n\\r\\nTu codigo OTP es: 998877\\r\\n.\\r\\n');
  } else if (str.startsWith('250') && step === 10) {
    step = 11;
    console.log('MESSAGE DELIVERED!');
    secureSocket.write('QUIT\\r\\n');
  }
};
socket.on('data', (d) => handleData(socket, d));
socket.on('error', (e) => console.error('SOCK ERR:', e));
setTimeout(() => process.exit(0), 6000);
`;

const res = runRemote("node", script);
console.log('RESULT:\n', res);
