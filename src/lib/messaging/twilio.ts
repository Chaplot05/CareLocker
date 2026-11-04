import twilio from 'twilio';

export interface SendWhatsAppParams {
  to: string;
  body: string;
  contentSid?: string;
  contentVariables?: Record<string, string>;
}

export interface WhatsAppSendResult {
  success: boolean;
  messageSid?: string;
  status?: string;
  recipient?: string;
  error?: string;
  errorCode?: number;
}

export const TWILIO_NETWORK_TIMEOUT_MS = 15000;

export function isTwilioConfigured(): boolean {
  const sid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const token = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const number = (process.env.TWILIO_WHATSAPP_NUMBER || '').trim();
  return (
    !!sid &&
    !!token &&
    !!number &&
    sid.startsWith('AC') &&
    !sid.includes('placeholder') &&
    !token.includes('placeholder')
  );
}

export function getTwilioClient(): twilio.Twilio {
  const sid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const token = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  if (!sid || !token || !isTwilioConfigured()) {
    throw new Error('Twilio credentials are not configured in environment.');
  }
  return twilio(sid, token, {
    timeout: TWILIO_NETWORK_TIMEOUT_MS,
  });
}

/**
 * Normalizes phone number to E.164 standard with country code and adds whatsapp: prefix.
 * Handles Indian numbers (10 digits starting with 6-9 -> +91).
 */
export function formatWhatsAppRecipient(rawPhone: string): string {
  let cleaned = (rawPhone || '').replace(/[\s\-()]/g, '').trim();

  if (cleaned.startsWith('whatsapp:')) {
    cleaned = cleaned.substring(9);
  }

  if (/^[6-9]\d{9}$/.test(cleaned)) {
    cleaned = `+91${cleaned}`;
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = `+91${cleaned.substring(1)}`;
  } else if (!cleaned.startsWith('+')) {
    cleaned = `+${cleaned}`;
  }

  return `whatsapp:${cleaned}`;
}

/**
 * Normalizes Twilio sandbox / sender number.
 */
export function formatWhatsAppSender(): string {
  let sender = (process.env.TWILIO_WHATSAPP_NUMBER || '').replace(/[\s\-()]/g, '').trim();
  if (sender.startsWith('whatsapp:')) {
    return sender;
  }
  if (!sender.startsWith('+')) {
    sender = `+${sender}`;
  }
  return `whatsapp:${sender}`;
}

/**
 * Sends a real WhatsApp message using Twilio WhatsApp API / Sandbox.
 *
 * Strict Rules:
 * 1. 15-second strict network timeout to prevent indefinite hangs.
 * 2. If sending free-form message:
 *    Payload contains ONLY 'from', 'to', and 'body'.
 *    NEVER passes 'contentVariables' or 'contentSid'.
 * 3. If sending Content Template:
 *    Payload contains 'from', 'to', 'contentSid', and formatted 'contentVariables'.
 *    NEVER passes 'body'.
 * 4. Never report success without a real Twilio message SID starting with SM or MM.
 * 5. Returns exact provider error code and description.
 */
export async function sendWhatsAppMessage({
  to,
  body,
  contentSid,
  contentVariables,
}: SendWhatsAppParams): Promise<WhatsAppSendResult> {
  if (!isTwilioConfigured()) {
    return {
      success: false,
      error: 'Twilio WhatsApp is not configured in .env.local.',
    };
  }

  const formattedTo = formatWhatsAppRecipient(to);
  const formattedFrom = formatWhatsAppSender();

  // Validate ContentSid (must be a valid string starting with HX)
  const rawContentSid = (contentSid || process.env.TWILIO_CONTENT_SID || '').trim();
  const isTemplateMode = rawContentSid.startsWith('HX');

  const payload: Record<string, any> = {
    from: formattedFrom,
    to: formattedTo,
  };

  if (isTemplateMode) {
    payload.contentSid = rawContentSid;
    if (contentVariables && Object.keys(contentVariables).length > 0) {
      payload.contentVariables = JSON.stringify(contentVariables);
    }
    console.log(
      `[Twilio WhatsApp] Sending template message: from=${formattedFrom}, to=${formattedTo}, contentSid=${rawContentSid}`
    );
  } else {
    // STRICT FREE-FORM MODE: From, To, Body only. NEVER pass contentVariables or contentSid.
    payload.body = body;
    console.log(
      `[Twilio WhatsApp] Sending free-form message: from=${formattedFrom}, to=${formattedTo}, bodyLength=${body?.length || 0}`
    );
  }

  try {
    const client = getTwilioClient();

    // Strict 15-second timeout wrapper to prevent any hanging calls
    let timeoutHandle: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        const timeoutErr: any = new Error(
          `Twilio network request timed out after ${TWILIO_NETWORK_TIMEOUT_MS / 1000} seconds.`
        );
        timeoutErr.code = 'ETIMEDOUT';
        reject(timeoutErr);
      }, TWILIO_NETWORK_TIMEOUT_MS);
      if (timeoutHandle.unref) timeoutHandle.unref();
    });

    const createPromise = client.messages.create(payload as any);

    const message = await Promise.race([createPromise, timeoutPromise]).finally(() => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    });

    // Never report success without a real Twilio message SID
    if (
      !message ||
      !message.sid ||
      typeof message.sid !== 'string' ||
      (!message.sid.startsWith('SM') && !message.sid.startsWith('MM'))
    ) {
      return {
        success: false,
        error: 'Twilio provider returned response without a valid message SID.',
        recipient: formattedTo,
      };
    }

    console.log(
      `[Twilio WhatsApp] Message accepted by Twilio: SID=${message.sid}, status=${message.status}`
    );

    return {
      success: true,
      messageSid: message.sid,
      status: message.status,
      recipient: formattedTo,
    };
  } catch (err: any) {
    console.error('[Twilio WhatsApp] Provider rejected message:', {
      message: err.message,
      code: err.code,
      status: err.status,
    });

    let friendlyError = err.message || 'Failed to send WhatsApp message.';
    if (err.code === 21654) {
      friendlyError = `Twilio Error 21654 (ContentSid Required): Twilio requires a pre-approved Content Template (ContentSid) to message this recipient. Outbound free-form messages cannot be sent unless the recipient has initiated a WhatsApp conversation with this sender within the last 24 hours.`;
    } else if (err.code === 63015) {
      friendlyError = `Twilio Error 63015: Recipient has not joined the WhatsApp Sandbox. To receive messages, send the sandbox join keyword to ${process.env.TWILIO_WHATSAPP_NUMBER} from WhatsApp.`;
    } else if (err.code === 63016) {
      friendlyError = `Twilio Error 63016: Cannot send freeform message outside the 24-hour customer window. An approved Content Template (ContentSid) is required.`;
    } else if (err.code === 21655) {
      friendlyError = `Twilio Error 21655: The provided ContentSid is invalid or does not exist.`;
    } else if (err.code === 21608) {
      friendlyError = 'Twilio Error 21608: The recipient phone number is unverified for this Twilio trial account.';
    } else if (err.code === 21211) {
      friendlyError = 'Twilio Error 21211: Invalid recipient phone number format.';
    } else if (err.code === 'ETIMEDOUT') {
      friendlyError = `Twilio Error ETIMEDOUT: Network request timed out after ${TWILIO_NETWORK_TIMEOUT_MS / 1000} seconds.`;
    }

    return {
      success: false,
      error: friendlyError,
      errorCode: typeof err.code === 'number' ? err.code : undefined,
      recipient: formattedTo,
    };
  }
}
