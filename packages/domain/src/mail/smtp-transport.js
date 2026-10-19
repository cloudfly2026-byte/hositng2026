const tls = require('tls');
const net = require('net');

function sendSmtpMail({ to, subject, html }) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(587, '89.117.147.134');
    let step = 0;
    let secureSocket = null;

    function handleData(s, data) {
      const str = data.toString();
      if (str.startsWith('220') && step === 0) {
        step = 1;
        s.write('EHLO cloudfly.com.co\r\n');
      } else if (str.startsWith('250') && step === 1) {
        step = 2;
        s.write('STARTTLS\r\n');
      } else if (str.startsWith('220') && step === 2) {
        step = 3;
        secureSocket = tls.connect({ socket: s, rejectUnauthorized: false }, () => {
          secureSocket.write('EHLO cloudfly.com.co\r\n');
        });
        secureSocket.on('data', (d) => handleData(secureSocket, d));
        secureSocket.on('error', reject);
      } else if (str.startsWith('250') && step === 3) {
        step = 4;
        secureSocket.write('AUTH LOGIN\r\n');
      } else if (str.startsWith('334') && step === 4) {
        step = 5;
        secureSocket.write(Buffer.from('proeba1@cloudfly.com.co').toString('base64') + '\r\n');
      } else if (str.startsWith('334') && step === 5) {
        step = 6;
        secureSocket.write(Buffer.from('Velupi2026Secure!').toString('base64') + '\r\n');
      } else if (str.startsWith('235') && step === 6) {
        step = 7;
        secureSocket.write('MAIL FROM:<proeba1@cloudfly.com.co>\r\n');
      } else if (str.startsWith('250') && step === 7) {
        step = 8;
        secureSocket.write('RCPT TO:<' + to + '>\r\n');
      } else if (str.startsWith('250') && step === 8) {
        step = 9;
        secureSocket.write('DATA\r\n');
      } else if (str.startsWith('354') && step === 9) {
        step = 10;
        const msg = [
          'From: "Velupi Cloud Platform" <proeba1@cloudfly.com.co>',
          'To: <' + to + '>',
          'Subject: ' + subject,
          'MIME-Version: 1.0',
          'Content-Type: text/html; charset=UTF-8',
          '',
          html,
          '.',
          '',
        ].join('\r\n');
        secureSocket.write(msg);
      } else if (str.startsWith('250') && step === 10) {
        step = 11;
        secureSocket.write('QUIT\r\n');
        resolve({ success: true });
      }
    }

    socket.on('data', (d) => handleData(socket, d));
    socket.on('error', reject);
  });
}

module.exports = { sendSmtpMail };

if (require.main === module) {
  sendSmtpMail({
    to: 'proeba1@cloudfly.com.co',
    subject: 'Prueba SMTP Directa Velupi',
    html: '<h2>Tu codigo de acceso es 456789</h2>',
  })
    .then((r) => console.log('RESULT:', r))
    .catch((e) => console.error('ERR:', e));
}
