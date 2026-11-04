import nodemailer, { type Transporter } from 'nodemailer';

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  response?: string;
  recipient?: string;
  error?: string;
}

export function isEmailConfigured(): boolean {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  return (
    !!host &&
    !!user &&
    !!pass &&
    !user.includes('placeholder') &&
    !pass.includes('placeholder')
  );
}

export function getEmailTransporter(): Transporter {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass || !isEmailConfigured()) {
    throw new Error('Gmail SMTP credentials are not configured in environment.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Basic email format validator
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Builds a clean HTML template for patient insurance notification
 */
export function buildClaimNotificationHtml(patientName: string, textBody: string): string {
  const formattedBody = textBody
    .split('\n\n')
    .map((p) => `<p style="margin: 0 0 14px 0; line-height: 1.6; color: #334155;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CareLocker Insurance Claim Notification</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px; color: #ffffff;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">🏥 CareLocker Claims Desk</span>
      </div>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">
        Patient Document & Insurance Query Management
      </p>
    </div>

    <!-- Content -->
    <div style="padding: 28px 24px; font-size: 14px;">
      ${formattedBody}

      <div style="margin-top: 24px; padding: 16px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px;">
        <strong style="color: #1e3a8a; font-size: 13px;">Important Note:</strong>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #1e40af; line-height: 1.5;">
          Submitting the required documents promptly ensures uninterrupted cashless hospital approval or faster reimbursement processing.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 18px 24px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
      CareLocker Automated Notification System • Confidential Medical Communication<br/>
      Please do not reply directly to this automated email. Contact your hospital billing desk for assistance.
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Sends a real email via Nodemailer and Gmail SMTP
 */
export async function sendEmailMessage({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<EmailSendResult> {
  if (!isEmailConfigured()) {
    return {
      success: false,
      error: 'Gmail SMTP credentials are not configured in .env.local.',
    };
  }

  const trimmedTo = to.trim();
  if (!isValidEmail(trimmedTo)) {
    return {
      success: false,
      error: `Invalid recipient email address: "${to}".`,
    };
  }

  try {
    const transporter = getEmailTransporter();
    const fromAddress = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'no-reply@carelocker.hospital';

    console.log(`[Nodemailer SMTP] Sending email to ${trimmedTo} with subject "${subject}"...`);

    const info = await transporter.sendMail({
      from: fromAddress.includes('<') ? fromAddress : `CareLocker Claims Desk <${fromAddress}>`,
      to: trimmedTo,
      subject,
      text,
      html: html || buildClaimNotificationHtml(trimmedTo, text),
    });

    console.log(`[Nodemailer SMTP] Email sent successfully: messageId=${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
      recipient: trimmedTo,
    };
  } catch (err: any) {
    console.error('[Nodemailer SMTP] Send failure:', err);
    return {
      success: false,
      error: err.message || 'Failed to send email message.',
      recipient: trimmedTo,
    };
  }
}
