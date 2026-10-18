import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MailerService, EmailMessage } from './mailer-service';

describe('MailerService — Velupi Transactional Email Service', () => {
  let mailer: MailerService;
  let mockTransport: { sendMail: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockTransport = {
      sendMail: vi.fn().mockResolvedValue({ messageId: 'msg-test-123' }),
    };
    mailer = new MailerService({
      fromEmail: 'noreply@velupi.com',
      fromName: 'Velupi Cloud Platform',
      transport: mockTransport as any,
    });
  });

  it('renders and sends a branded welcome email with activation/access code', async () => {
    const result = await mailer.sendWelcomeEmail({
      toEmail: 'cliente@gmail.com',
      fullName: 'Edwin Guevara',
      accessCode: '849201',
    });

    expect(result.success).toBe(true);
    expect(mockTransport.sendMail).toHaveBeenCalledTimes(1);

    const callArgs = mockTransport.sendMail.mock.calls[0][0];
    expect(callArgs.to).toBe('cliente@gmail.com');
    expect(callArgs.subject).toContain('Bienvenido a Velupi');
    expect(callArgs.html).toContain('849201');
    expect(callArgs.html).toContain('Edwin Guevara');
    expect(callArgs.html).toContain('Velupi Cloud Platform');
  });

  it('renders and sends an OTP login access code email for existing users', async () => {
    const result = await mailer.sendLoginOtpEmail({
      toEmail: 'egbmaster2007@gmail.com',
      accessCode: '319402',
    });

    expect(result.success).toBe(true);
    expect(mockTransport.sendMail).toHaveBeenCalledTimes(1);

    const callArgs = mockTransport.sendMail.mock.calls[0][0];
    expect(callArgs.to).toBe('egbmaster2007@gmail.com');
    expect(callArgs.subject).toContain('Tu código de acceso');
    expect(callArgs.html).toContain('319402');
  });

  it('handles transport failure gracefully and logs message details', async () => {
    mockTransport.sendMail.mockRejectedValue(new Error('SMTP Connection Refused'));

    const result = await mailer.sendLoginOtpEmail({
      toEmail: 'fail@test.com',
      accessCode: '000000',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('SMTP Connection Refused');
  });
});
