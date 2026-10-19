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

  async sendHostingProvisionedDnsEmail(options: {
    toEmail: string;
    fullName: string;
    planName: string;
    domain: string;
    orderNumber: string;
    hostingServerIp: string;
    primaryNameserver: string;
    secondaryNameserver: string;
    panelUrl: string;
  }): Promise<SendEmailResult> {
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #FFFDF9; border: 1px solid #F2E8DC; border-radius: 14px; padding: 36px 28px; color: #2D1B17;">
        <div style="text-align: center; margin-bottom: 26px;">
          <h2 style="color: #FF6B00; margin: 0; font-size: 28px; letter-spacing: -0.5px;">Velupi Cloud Platform</h2>
          <p style="color: #71717A; font-size: 14px; margin-top: 4px;">Aprovisionamiento de Infraestructura</p>
        </div>
        
        <div style="background: #FFFFFF; border: 1px solid #F2E8DC; border-radius: 10px; padding: 26px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <div style="display: inline-block; background: #ECFDF5; color: #047857; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; margin-bottom: 12px; border: 1px solid #A7F3D0;">
            ✓ HOSTING PREPARADO
          </div>
          <h3 style="margin-top: 0; font-size: 20px; color: #18181B;">¡Tu hosting Velupi está preparado! Conecta tu dominio</h3>
          <p style="font-size: 15px; line-height: 1.55; color: #3F3F46;">
            Hola <strong>${options.fullName}</strong>, tu servicio <strong>${options.planName}</strong> para el dominio <strong>${options.domain}</strong> (Pedido: <code>${options.orderNumber}</code>) ha sido aprovisionado exitosamente en nuestro cluster de alta disponibilidad.
          </p>
          <p style="font-size: 14px; line-height: 1.55; color: #52525B;">
            Para que tu sitio web comience a responder y podamos emitir tu certificado SSL Let's Encrypt automáticamente, debes conectar tu dominio en tu proveedor o registrador actual:
          </p>
          
          <div style="margin-top: 20px; border: 1px solid #FDE68A; background: #FFFBEB; border-radius: 8px; padding: 16px;">
            <div style="font-weight: 700; color: #92400E; font-size: 14px; margin-bottom: 8px;">
              Opción A: Delegar Servidores DNS (Recomendado)
            </div>
            <p style="font-size: 13px; color: #78350F; margin: 0 0 10px 0;">
              Cambia los Nameservers en tu registrador por los servidores oficiales de Velupi:
            </p>
            <div style="background: #FFFFFF; border: 1px solid #FCD34D; border-radius: 6px; padding: 10px 14px; font-family: monospace; font-size: 14px; color: #1E293B;">
              <div><strong>Primario:</strong> ${options.primaryNameserver}</div>
              <div style="margin-top: 4px;"><strong>Secundario:</strong> ${options.secondaryNameserver}</div>
            </div>
          </div>

          <div style="margin-top: 16px; border: 1px solid #E4E4E7; background: #FAFAFA; border-radius: 8px; padding: 16px;">
            <div style="font-weight: 700; color: #27272A; font-size: 14px; margin-bottom: 8px;">
              Opción B: Registros DNS Externos (A & CNAME)
            </div>
            <p style="font-size: 13px; color: #52525B; margin: 0 0 10px 0;">
              Si prefieres mantener tu zona DNS actual, crea los siguientes registros apuntando a tu servidor:
            </p>
            <div style="background: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 6px; padding: 10px 14px; font-family: monospace; font-size: 13px; color: #1E293B;">
              <div>• <strong>A:</strong> @ $\\rightarrow$ <code>${options.hostingServerIp}</code></div>
              <div style="margin-top: 4px;">• <strong>CNAME:</strong> www $\\rightarrow$ <code>${options.domain}</code></div>
            </div>
          </div>

          <div style="text-align: center; margin-top: 28px;">
            <a href="${options.panelUrl}/services/wordpress" style="display: inline-block; background: #FF6B00; color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(255, 107, 0, 0.25);">
              Ir a mi Panel de Control
            </a>
          </div>
        </div>

        <p style="font-size: 12px; color: #A1A1AA; text-align: center; margin: 0; line-height: 1.5;">
          Una vez que los DNS propaguen, nuestro worker activará el certificado TLS 1.3 de forma 100% autónoma.<br />
          © ${new Date().getFullYear()} Velupi Cloud Platform. Todos los derechos reservados.
        </p>
      </div>
    `;

    return this.sendMail({
      to: options.toEmail,
      subject: `¡Tu hosting Velupi está preparado! Conecta tu dominio ${options.domain}`,
      html,
    });
  }

  async sendServiceActiveEmail(options: {
    toEmail: string;
    fullName: string;
    planName: string;
    domain: string;
    orderNumber: string;
    panelUrl: string;
  }): Promise<SendEmailResult> {
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #FFFDF9; border: 1px solid #F2E8DC; border-radius: 14px; padding: 36px 28px; color: #2D1B17;">
        <div style="text-align: center; margin-bottom: 26px;">
          <h2 style="color: #FF6B00; margin: 0; font-size: 28px; letter-spacing: -0.5px;">Velupi Cloud Platform</h2>
          <p style="color: #71717A; font-size: 14px; margin-top: 4px;">Activación de Servicio</p>
        </div>
        
        <div style="background: #FFFFFF; border: 1px solid #F2E8DC; border-radius: 10px; padding: 26px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <div style="display: inline-block; background: #ECFDF5; color: #047857; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; margin-bottom: 12px; border: 1px solid #A7F3D0;">
            ✓ EN LÍNEA & ACTIVO
          </div>
          <h3 style="margin-top: 0; font-size: 20px; color: #18181B;">¡Tu sitio web ya está activo en Velupi!</h3>
          <p style="font-size: 15px; line-height: 1.55; color: #3F3F46;">
            Excelentes noticias <strong>${options.fullName}</strong>: los servidores DNS para <strong>${options.domain}</strong> se encuentran respondiendo correctamente y el certificado de seguridad SSL Let's Encrypt ha sido instalado.
          </p>
          
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <div style="font-size: 14px; color: #334155;"><strong>Dominio:</strong> <a href="https://${options.domain}" target="_blank" style="color: #FF6B00; text-decoration: none;">https://${options.domain}</a></div>
            <div style="font-size: 14px; color: #334155; margin-top: 6px;"><strong>Plan:</strong> ${options.planName}</div>
            <div style="font-size: 14px; color: #334155; margin-top: 6px;"><strong>Seguridad:</strong> HTTPS / TLS 1.3 Activo</div>
            <div style="font-size: 14px; color: #334155; margin-top: 6px;"><strong>Pedido:</strong> ${options.orderNumber}</div>
          </div>

          <div style="text-align: center; margin-top: 26px;">
            <a href="${options.panelUrl}/services/wordpress" style="display: inline-block; background: #FF6B00; color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(255, 107, 0, 0.25);">
              Gestionar Sitio en Site Tools
            </a>
          </div>
        </div>

        <p style="font-size: 12px; color: #A1A1AA; text-align: center; margin: 0;">
          © ${new Date().getFullYear()} Velupi Cloud Platform. Todos los derechos reservados.
        </p>
      </div>
    `;

    return this.sendMail({
      to: options.toEmail,
      subject: `Tu sitio web ya está activo en Velupi — ${options.domain}`,
      html,
    });
  }
}

