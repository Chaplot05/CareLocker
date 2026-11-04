import { createAdminClient } from '@/lib/supabase/admin';
import { sendWhatsAppMessage, WhatsAppSendResult } from './twilio';
import { sendEmailMessage, EmailSendResult } from './email';
import { generatePatientDraftMessage } from '@/lib/gemini/messageDrafting';

export interface ChannelDispatchOutcome {
  attempted: boolean;
  skipped: boolean;
  skipReason?: string;
  success: boolean;
  messageId?: string;
  providerId?: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'skipped';
  recipient?: string;
  error?: string;
}

export interface MultiChannelDispatchResult {
  queryLetterId: string;
  patientId: string;
  missingCount: number;
  skippedAll: boolean;
  skipReason?: string;
  whatsapp: ChannelDispatchOutcome;
  email: ChannelDispatchOutcome;
}

/**
 * Stage 3 Multi-Channel Automatic Notification Dispatcher
 * Dispatches notification through WhatsApp AND Email with complete channel independence.
 *
 * Implements:
 * - Missing-documents gating (sends only if genuinely missing documents exist)
 * - True parallel execution via Promise.allSettled: Twilio delays or errors NEVER block Email
 * - Per-query and per-channel duplicate send prevention
 * - Safe manual retry / send fallback
 * - Full delivery status & provider message ID tracking in Supabase messages table
 * - Comprehensive audit logging
 */
export async function dispatchQueryNotification({
  queryLetterId,
  force = false,
  channelToRetry,
}: {
  queryLetterId: string;
  force?: boolean;
  channelToRetry?: 'WhatsApp' | 'Email';
}): Promise<MultiChannelDispatchResult> {
  const adminSupabase = createAdminClient();

  // 1. Fetch query letter, patient info, and query points
  const { data: letter, error: letterError } = (await adminSupabase
    .from('query_letters')
    .select(`
      id,
      patient_id,
      insurer_name,
      claim_number,
      patients (
        id,
        name,
        phone,
        email,
        patient_code
      ),
      query_points (
        id,
        requirement_text,
        decision_status
      )
    `)
    .eq('id', queryLetterId)
    .single()) as { data: any; error: any };

  if (letterError || !letter || !letter.patients) {
    throw new Error(`Query letter or associated patient not found: ${letterError?.message || queryLetterId}`);
  }

  const patient = letter.patients;
  const points: any[] = letter.query_points || [];
  const missingPoints = points.filter((p) => p.decision_status === 'missing');

  // Gating rule: Do NOT send anything if there are no missing documents (unless forced by staff manual action)
  if (missingPoints.length === 0 && !force) {
    console.log(`[Dispatcher] Query letter ${queryLetterId} has 0 missing documents. Automatic notification suppressed.`);
    return {
      queryLetterId,
      patientId: patient.id,
      missingCount: 0,
      skippedAll: true,
      skipReason: 'NO_MISSING_DOCUMENTS',
      whatsapp: { attempted: false, skipped: true, skipReason: 'NO_MISSING_DOCUMENTS', success: true, status: 'skipped' },
      email: { attempted: false, skipped: true, skipReason: 'NO_MISSING_DOCUMENTS', success: true, status: 'skipped' },
    };
  }

  // 2. Retrieve or generate patient draft message
  const draftResult = await generatePatientDraftMessage(queryLetterId, adminSupabase);
  if (!draftResult.success || !draftResult.messageContent) {
    throw new Error(`Failed to generate patient message draft: ${draftResult.error || 'Empty message content'}`);
  }

  const messageContent = draftResult.messageContent;

  // 3. Fetch existing message records for duplicate prevention, ordered latest first
  const { data: existingMessages } = (await adminSupabase
    .from('messages')
    .select('*')
    .eq('query_letter_id', queryLetterId)
    .order('created_at', { ascending: false })) as { data: any[] };

  const existingWhatsApp = (existingMessages || []).find((m) => m.channel === 'WhatsApp');
  const existingEmail = (existingMessages || []).find((m) => m.channel === 'Email');

  const shouldSendWhatsApp = !channelToRetry || channelToRetry === 'WhatsApp';
  const shouldSendEmail = !channelToRetry || channelToRetry === 'Email';

  // 4. Define WhatsApp worker task
  const executeWhatsApp = async (): Promise<ChannelDispatchOutcome> => {
    if (!shouldSendWhatsApp) {
      return { attempted: false, skipped: true, skipReason: 'NOT_TARGETED', success: true, status: 'skipped' };
    }

    if (!patient.phone) {
      return {
        attempted: true,
        skipped: false,
        success: false,
        status: 'failed',
        error: 'Patient has no registered phone number',
      };
    }

    if (existingWhatsApp && (existingWhatsApp.delivery_status === 'sent' || existingWhatsApp.delivery_status === 'delivered') && !force) {
      console.log(`[Dispatcher] Duplicate prevention: WhatsApp already sent for letter ${queryLetterId} (SID: ${existingWhatsApp.provider_message_id})`);
      return {
        attempted: false,
        skipped: true,
        skipReason: 'ALREADY_SENT',
        success: true,
        status: existingWhatsApp.delivery_status,
        messageId: existingWhatsApp.id,
        providerId: existingWhatsApp.provider_message_id,
        recipient: patient.phone,
      };
    }

    // Upsert message record in 'queued' state
    let messageRecordId = existingWhatsApp?.id;
    if (messageRecordId) {
      await adminSupabase
        .from('messages')
        .update({
          message_content: messageContent,
          delivery_status: 'queued',
        } as any)
        .eq('id', messageRecordId);
    } else {
      const { data: newMsg } = await adminSupabase
        .from('messages')
        .insert({
          patient_id: patient.id,
          query_letter_id: queryLetterId,
          channel: 'WhatsApp',
          message_content: messageContent,
          delivery_status: 'queued',
        } as any)
        .select()
        .single();
      messageRecordId = newMsg?.id;
    }

    try {
      const configuredContentSid = (process.env.TWILIO_CONTENT_SID || '').trim();
      const hasValidContentSid = configuredContentSid.startsWith('HX');

      const waRes: WhatsAppSendResult = await sendWhatsAppMessage({
        to: patient.phone,
        body: messageContent,
        contentSid: hasValidContentSid ? configuredContentSid : undefined,
        contentVariables: hasValidContentSid
          ? { '1': patient.name, '2': patient.patient_code }
          : undefined,
      });

      if (waRes.success && waRes.messageSid) {
        await adminSupabase
          .from('messages')
          .update({
            delivery_status: 'sent',
            provider_message_id: waRes.messageSid,
            sent_at: new Date().toISOString(),
          } as any)
          .eq('id', messageRecordId);

        await adminSupabase.from('audit_logs').insert({
          action: 'SEND_WHATSAPP_MESSAGE',
          entity_type: 'message',
          entity_id: messageRecordId,
          details: {
            channel: 'WhatsApp',
            recipient: waRes.recipient,
            messageSid: waRes.messageSid,
            status: 'sent',
          },
        } as any);

        return {
          attempted: true,
          skipped: false,
          success: true,
          status: 'sent',
          messageId: messageRecordId,
          providerId: waRes.messageSid,
          recipient: waRes.recipient,
        };
      } else {
        const errorMsg = waRes.error || 'WhatsApp provider error';
        await adminSupabase
          .from('messages')
          .update({
            delivery_status: 'failed',
            provider_message_id: `ERROR: ${errorMsg}`.substring(0, 255),
          } as any)
          .eq('id', messageRecordId);

        await adminSupabase.from('audit_logs').insert({
          action: 'SEND_WHATSAPP_MESSAGE_FAILED',
          entity_type: 'message',
          entity_id: messageRecordId,
          details: {
            channel: 'WhatsApp',
            recipient: patient.phone,
            error: errorMsg,
            status: 'failed',
          },
        } as any);

        return {
          attempted: true,
          skipped: false,
          success: false,
          status: 'failed',
          messageId: messageRecordId,
          recipient: patient.phone,
          error: errorMsg,
        };
      }
    } catch (err: any) {
      const errorMsg = err.message || 'WhatsApp network error';
      await adminSupabase
        .from('messages')
        .update({
          delivery_status: 'failed',
          provider_message_id: `ERROR: ${errorMsg}`.substring(0, 255),
        } as any)
        .eq('id', messageRecordId);

      return {
        attempted: true,
        skipped: false,
        success: false,
        status: 'failed',
        messageId: messageRecordId,
        recipient: patient.phone,
        error: errorMsg,
      };
    }
  };

  // 5. Define Email worker task
  const executeEmail = async (): Promise<ChannelDispatchOutcome> => {
    if (!shouldSendEmail) {
      return { attempted: false, skipped: true, skipReason: 'NOT_TARGETED', success: true, status: 'skipped' };
    }

    if (!patient.email) {
      return {
        attempted: true,
        skipped: false,
        success: false,
        status: 'failed',
        error: 'Patient has no registered email address on file',
      };
    }

    if (existingEmail && (existingEmail.delivery_status === 'sent' || existingEmail.delivery_status === 'delivered') && !force) {
      console.log(`[Dispatcher] Duplicate prevention: Email already sent for letter ${queryLetterId} (ID: ${existingEmail.provider_message_id})`);
      return {
        attempted: false,
        skipped: true,
        skipReason: 'ALREADY_SENT',
        success: true,
        status: existingEmail.delivery_status,
        messageId: existingEmail.id,
        providerId: existingEmail.provider_message_id,
        recipient: patient.email,
      };
    }

    // Upsert message record in 'queued' state
    let messageRecordId = existingEmail?.id;
    if (messageRecordId) {
      await adminSupabase
        .from('messages')
        .update({
          message_content: messageContent,
          delivery_status: 'queued',
        } as any)
        .eq('id', messageRecordId);
    } else {
      const { data: newMsg } = await adminSupabase
        .from('messages')
        .insert({
          patient_id: patient.id,
          query_letter_id: queryLetterId,
          channel: 'Email',
          message_content: messageContent,
          delivery_status: 'queued',
        } as any)
        .select()
        .single();
      messageRecordId = newMsg?.id;
    }

    try {
      const subject = `Action Required: Supporting Documents Requested for Claim ${patient.patient_code}`;
      const emailRes: EmailSendResult = await sendEmailMessage({
        to: patient.email,
        subject,
        text: messageContent,
      });

      if (emailRes.success && emailRes.messageId) {
        await adminSupabase
          .from('messages')
          .update({
            delivery_status: 'sent',
            provider_message_id: emailRes.messageId,
            sent_at: new Date().toISOString(),
          } as any)
          .eq('id', messageRecordId);

        await adminSupabase.from('audit_logs').insert({
          action: 'SEND_EMAIL_MESSAGE',
          entity_type: 'message',
          entity_id: messageRecordId,
          details: {
            channel: 'Email',
            recipient: emailRes.recipient,
            messageId: emailRes.messageId,
            status: 'sent',
          },
        } as any);

        return {
          attempted: true,
          skipped: false,
          success: true,
          status: 'sent',
          messageId: messageRecordId,
          providerId: emailRes.messageId,
          recipient: emailRes.recipient,
        };
      } else {
        const errorMsg = emailRes.error || 'Email SMTP error';
        await adminSupabase
          .from('messages')
          .update({
            delivery_status: 'failed',
            provider_message_id: `ERROR: ${errorMsg}`.substring(0, 255),
          } as any)
          .eq('id', messageRecordId);

        await adminSupabase.from('audit_logs').insert({
          action: 'SEND_EMAIL_MESSAGE_FAILED',
          entity_type: 'message',
          entity_id: messageRecordId,
          details: {
            channel: 'Email',
            recipient: patient.email,
            error: errorMsg,
            status: 'failed',
          },
        } as any);

        return {
          attempted: true,
          skipped: false,
          success: false,
          status: 'failed',
          messageId: messageRecordId,
          recipient: patient.email,
          error: errorMsg,
        };
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Email delivery exception';
      await adminSupabase
        .from('messages')
        .update({
          delivery_status: 'failed',
          provider_message_id: `ERROR: ${errorMsg}`.substring(0, 255),
        } as any)
        .eq('id', messageRecordId);

      return {
        attempted: true,
        skipped: false,
        success: false,
        status: 'failed',
        messageId: messageRecordId,
        recipient: patient.email,
        error: errorMsg,
      };
    }
  };

  // 6. Execute WhatsApp and Email in PARALLEL via Promise.allSettled
  // Complete channel independence: WhatsApp taking time or failing will NEVER delay or prevent Email
  const [waSettled, emailSettled] = await Promise.allSettled([
    executeWhatsApp(),
    executeEmail(),
  ]);

  const whatsappOutcome: ChannelDispatchOutcome =
    waSettled.status === 'fulfilled'
      ? waSettled.value
      : {
          attempted: true,
          skipped: false,
          success: false,
          status: 'failed',
          error: waSettled.reason?.message || 'WhatsApp unexpected exception',
        };

  const emailOutcome: ChannelDispatchOutcome =
    emailSettled.status === 'fulfilled'
      ? emailSettled.value
      : {
          attempted: true,
          skipped: false,
          success: false,
          status: 'failed',
          error: emailSettled.reason?.message || 'Email unexpected exception',
        };

  return {
    queryLetterId,
    patientId: patient.id,
    missingCount: missingPoints.length,
    skippedAll: false,
    whatsapp: whatsappOutcome,
    email: emailOutcome,
  };
}
