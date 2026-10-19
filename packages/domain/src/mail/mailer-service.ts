import * as net from 'node:net';
import * as tls from 'node:tls';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface MailerConfig {
  fromEmail: string;
  fromName: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpSecure?: boolean;
  transport?: {
    sendMail: (msg: any) => Promise<any>;
  };
}

export class MailerService {
  private transport?: { sendMail: (msg: any) => Promise<any> };

  constructor(private readonly config: MailerConfig) {
    if (config.transport) {
      this.transport = config.transport;
    } else if (config.smtpHost) {
      this.transport = {
        sendMail: (msg: any) => this.sendViaSmtpSocket(msg),
      };
    }
  }

  private sendViaSmtpSocket(msg: any): Promise<{ messageId: string }> {
    return new Promise((resolve, reject) => {
      const host = this.config.smtpHost || '127.0.0.1';
      const port = this.config.smtpPort || 25;
      const user = this.config.smtpUser;
      const password = this.config.smtpPassword;
      const fromEmail = this.config.fromEmail || 'noreply@velupi.com';

      const socket = net.createConnection(port, host);
      let step = 0;
      let secureSocket: tls.TLSSocket | null = null;

      const handleData = (activeSocket: any, data: Buffer) => {
        const str = data.toString();

        if (str.startsWith('220') && step === 0) {
          step = 1;
          activeSocket.write('EHLO cloudfly.com.co\r\n');
        } else if (str.startsWith('250') && step === 1) {
          // If port 587 and user/pass, initiate STARTTLS
          if (port === 587 || user) {
            step = 2;
            activeSocket.write('STARTTLS\r\n');
          } else {
            step = 7;
            activeSocket.write(`MAIL FROM:<${fromEmail}>\r\n`);
          }
        } else if (str.startsWith('220') && step === 2) {
          step = 3;
          secureSocket = tls.connect({ socket: activeSocket, rejectUnauthorized: false }, () => {
            secureSocket!.write('EHLO cloudfly.com.co\r\n');
          });
          secureSocket.on('data', (d: Buffer) => handleData(secureSocket, d));
          secureSocket.on('error', reject);
        } else if (str.startsWith('250') && step === 3) {
          if (user && password) {
            step = 4;
            secureSocket!.write('AUTH LOGIN\r\n');
          } else {
            step = 7;
            secureSocket!.write(`MAIL FROM:<${fromEmail}>\r\n`);
          }
        } else if (str.startsWith('334') && step === 4) {
          step = 5;
          secureSocket!.write(Buffer.from(user!).toString('base64') + '\r\n');
        } else if (str.startsWith('334') && step === 5) {
          step = 6;
          secureSocket!.write(Buffer.from(password!).toString('base64') + '\r\n');
        } else if (str.startsWith('235') && step === 6) {
          step = 7;
          secureSocket!.write(`MAIL FROM:<${fromEmail}>\r\n`);
        } else if (str.startsWith('250') && step === 7) {
          step = 8;
          const target = secureSocket || activeSocket;
          target.write(`RCPT TO:<${msg.to}>\r\n`);
        } else if (str.startsWith('250') && step === 8) {
          step = 9;
          const target = secureSocket || activeSocket;
          target.write('DATA\r\n');
        } else if (str.startsWith('354') && step === 9) {
          step = 10;
          const target = secureSocket || activeSocket;
          const raw = [
            `From: ${msg.from || `"${this.config.fromName}" <${fromEmail}>`}`,
            `To: <${msg.to}>`,
            `Subject: ${msg.subject}`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            '',
            msg.html || msg.text || '',
            '.',
            '',
          ].join('\r\n');
          target.write(raw);
        } else if (str.startsWith('250') && step === 10) {
          step = 11;
          const target = secureSocket || activeSocket;
          target.write('QUIT\r\n');
          resolve({ messageId: `smtp-${Date.now()}` });
        } else if (str.startsWith('4') || str.startsWith('5')) {
          reject(new Error(`SMTP Error: ${str.trim()}`));
        }
      };

      socket.on('data', (d: Buffer) => handleData(socket, d));
      socket.on('error', reject);
    });
  }

  async sendMail(msg: EmailMessage): Promise<SendEmailResult> {
    const from = msg.from || `"${this.config.fromName}" <${this.config.fromEmail}>`;

    if (this.transport) {
      try {
        const res = await this.transport.sendMail({
          from,
          to: msg.to,
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
        });
        return { success: true, messageId: res?.messageId || `msg-${Date.now()}` };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Error sending email' };
      }
    }

    // Fallback: Console logger if no active transport
    console.log(`[VELUPI MAILER] Enviando a: ${msg.to} | Asunto: ${msg.subject}`);
    return { success: true, messageId: `local-console-${Date.now()}` };
  }

  async sendWelcomeEmail(options: {
    toEmail: string;
    fullName: string;
    accessCode: string;
  }): Promise<SendEmailResult> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FFFDF9; border: 1px solid #F2E8DC; border-radius: 12px; padding: 32px; color: #2D1B17;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #FF6B00; margin: 0; font-size: 28px;">Velupi Cloud Platform</h2>
          <p style="color: #667085; font-size: 14px; margin-top: 4px;">Tus ideas merecen volar.</p>
        </div>
        <div style="background: #FFFFFF; border: 1px solid #F2E8DC; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <h3 style="margin-top: 0; font-size: 20px;">¡Bienvenido a Velupi, ${options.fullName}!</h3>
          <p style="font-size: 15px; line-height: 1.5; color: #4B5563;">
            Tu cuenta ha sido creada exitosamente. Para acceder de manera inmediata y proteger tu espacio, utiliza tu código de acceso único:
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #FF6B00; background: #FFF4E5; padding: 12px 24px; border-radius: 8px; border: 1px dashed #FFB800;">
              ${options.accessCode}
            </span>
          </div>
          <p style="font-size: 13px; color: #9CA3AF; text-align: center;">
            Este código es válido por 10 minutos. No lo compartas con nadie.
          </p>
        </div>
        <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin: 0;">
          © ${new Date().getFullYear()} Velupi Cloud Platform. Todos los derechos reservados.
        </p>
      </div>
    `;

    return this.sendMail({
      to: options.toEmail,
      subject: `¡Bienvenido a Velupi Cloud! Código de acceso: ${options.accessCode}`,
      html,
    });
  }

  async sendLoginOtpEmail(options: {
    toEmail: string;
    accessCode: string;
  }): Promise<SendEmailResult> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FFFDF9; border: 1px solid #F2E8DC; border-radius: 12px; padding: 32px; color: #2D1B17;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #FF6B00; margin: 0; font-size: 28px;">Velupi Cloud Platform</h2>
          <p style="color: #667085; font-size: 14px; margin-top: 4px;">Seguridad de Acceso</p>
        </div>
        <div style="background: #FFFFFF; border: 1px solid #F2E8DC; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <h3 style="margin-top: 0; font-size: 20px;">Tu código de acceso seguro</h3>
          <p style="font-size: 15px; line-height: 1.5; color: #4B5563;">
            Hemos recibido una solicitud para iniciar sesión en tu cuenta. Ingresa el siguiente código de 6 dígitos en tu pantalla:
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #FF6B00; background: #FFF4E5; padding: 12px 24px; border-radius: 8px; border: 1px dashed #FFB800;">
              ${options.accessCode}
            </span>
          </div>
          <p style="font-size: 13px; color: #9CA3AF; text-align: center;">
            Este código vence en 10 minutos. Si no solicitaste este acceso, puedes ignorar este correo.
          </p>
        </div>
        <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin: 0;">
          © ${new Date().getFullYear()} Velupi Cloud Platform. Todos los derechos reservados.
        </p>
      </div>
    `;

    return this.sendMail({
      to: options.toEmail,
      subject: `Tu código de acceso a Velupi: ${options.accessCode}`,
      html,
    });
  }
}
