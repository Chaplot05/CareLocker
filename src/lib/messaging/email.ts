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
 * Styled using Care.fi / Care.locker flat design palette (black, #7956B5 purple, #F2EEFA lavender)
 */
export function buildClaimNotificationHtml(patientName: string, textBody: string): string {
  const formattedBody = textBody
    .split('\n\n')
    .map((p) => `<p style="margin: 0 0 14px 0; line-height: 1.6; color: #111111;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Care.locker Insurance Claim Notification</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8F7FB; margin: 0; padding: 24px; color: #111111;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #E7E3EF; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);">
    <!-- Brand Header -->
    <div style="background-color: #111111; border-bottom: 3px solid #7956B5; padding: 24px 28px; color: #ffffff;">
      <div style="display: flex; align-items: center;">
        <span style="display: inline-block; background-color: #7956B5; color: #ffffff; font-weight: 800; font-size: 13px; padding: 4px 9px; border-radius: 8px; letter-spacing: -0.5px; margin-right: 10px;">cl</span>
        <span style="font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">Care.locker</span>
      </div>
      <p style="margin: 6px 0 0 0; font-size: 11px; color: #B7A2DE; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700;">
        Claims & Document Operations Vault
      </p>
    </div>

    <!-- Content Body -->
    <div style="padding: 32px 28px; font-size: 14px;">
      ${formattedBody}

      <div style="margin-top: 24px; padding: 16px; background-color: #F2EEFA; border-left: 4px solid #7956B5; border-radius: 8px;">
        <strong style="color: #7956B5; font-size: 13px;">Important Note for Faster Claim Settlement:</strong>
        <p style="margin: 6px 0 0 0; font-size: 12px; color: #111111; line-height: 1.5;">
          Submitting the requested medical documents promptly helps our billing team resolve the insurer's query without delay and prevents interruption to your cashless approval or reimbursement.
        </p>
      </div>
    </div>

    <!-- Clean Footer -->
    <div style="padding: 20px 28px; background-color: #FAFAFC; border-top: 1px solid #E7E3EF; font-size: 11px; color: #6B7280; text-align: center; line-height: 1.6;">
      Care.locker Automated Notification System • Confidential Medical Communication<br/>
      Please do not reply directly to this automated email. Contact your hospital billing & TPA desk for assistance.
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
      error: 'Gmail SMTP credentials are not configured in environment.',
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
      from: fromAddress.includes('<') ? fromAddress : `Care.locker Claims Desk <${fromAddress}>`,
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
