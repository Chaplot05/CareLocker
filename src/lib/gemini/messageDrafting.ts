import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateStructuredContent, isGeminiConfigured } from './client';
import { PatientMessageDraftSchema } from './schemas';

/**
 * Feature 5: Patient-Friendly Message Draft Generator
 * Generates an empathetic, clear draft message including ONLY genuinely missing documents.
 * Excludes already available and needs_review items from the automatic request list.
 */
export async function generatePatientDraftMessage(
  queryLetterId: string,
  providedSupabase?: any
): Promise<{ success: boolean; messageContent?: string; error?: string }> {
  const supabase = providedSupabase || (isSupabaseServerConfigured() ? createClient() : createAdminClient());

  try {
    // 1. Fetch query letter and patient
    const { data: letter, error: letterError } = (await supabase
      .from('query_letters')
      .select('id, patient_id, insurer_name, claim_number, patients(id, name, phone, email, patient_code)')
      .eq('id', queryLetterId)
      .single()) as { data: any; error: any };

    if (letterError || !letter || !letter.patients) {
      throw new Error(`Patient or query letter not found for message drafting.`);
    }

    const patient = letter.patients;

    // 2. Fetch all query points for this letter
    const { data: points, error: pointsError } = (await supabase
      .from('query_points')
      .select('*')
      .eq('query_letter_id', queryLetterId)) as { data: any[]; error: any };

    if (pointsError || !points) {
      throw new Error(`Failed to load query points: ${pointsError?.message}`);
    }

    // 3. Filter ONLY genuinely missing items
    const missingPoints = points.filter((p) => p.decision_status === 'missing');
    const availablePoints = points.filter((p) => p.decision_status === 'available');
    const reviewPoints = points.filter((p) => p.decision_status === 'needs_review');

    let fullMessage = '';

    // If no items are missing: Reassuring message
    if (missingPoints.length === 0) {
      const insurerText = letter.insurer_name ? ` from ${letter.insurer_name}` : '';
      fullMessage = `Dear ${patient.name},

Good news regarding your hospital cashless/reimbursement claim (ID: ${patient.patient_code}).
We have reviewed the query letter${insurerText}. All requested medical records and bills are already available in your CareLocker vault and have been verified by our billing desk.

No additional documents are needed from you at this time. Our insurance desk is preparing the formal query response to the insurer.

Warm regards,
Hospital CareLocker Operations Desk`;
    } else {
      // Missing items exist: Generate tailored patient-friendly draft
      const missingList = missingPoints.map((p) => p.requirement_text);

      if (isGeminiConfigured()) {
        try {
          const systemInstruction = `You are a patient communications specialist for a premier hospital.
Your job is to draft a polite, reassuring, and completely clear message (for WhatsApp / SMS / Email) to a patient or their attendant.
The health insurer has asked for clarification, and the hospital desk has already checked all files in CareLocker.
We ONLY want to ask the patient for the items that are GENUINELY MISSING.
Do NOT use intimidating insurance jargon. Translate technical claim clauses into plain everyday language (e.g., "Operative notes" -> "Surgical operative report from your surgery", "Itemized pharmacy bills" -> "Detailed pharmacy medicine purchase bills with doctor prescriptions").
Keep it friendly, respectful, and actionable.`;

          const prompt = `Patient Name: ${patient.name} (Patient ID: ${patient.patient_code})
Insurer: ${letter.insurer_name || 'Health Insurance Provider'}
Claim Reference: ${letter.claim_number || 'Cashless Claim'}

GENUINELY MISSING ITEMS TO REQUEST:
${missingList.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}

ITEMS ALREADY FOUND (DO NOT ASK FOR THESE):
${availablePoints.map((p) => p.requirement_text).join('\n') || 'None'}

Return a strictly valid JSON object:
{
  "greeting": "Dear [Patient Name],",
  "introduction": "Brief, reassuring statement about insurer query received and hospital desk review",
  "missing_documents_list": ["plain language bullet point 1", "plain language bullet point 2"],
  "submission_instructions": "Clear instruction to reply on WhatsApp with photos or submit at billing desk",
  "closing": "Warm regards, Hospital Billing & Insurance Desk",
  "full_message_body": "Complete cohesive message ready to send via WhatsApp or Email"
}`;

          const aiDraft = await generateStructuredContent({
            prompt,
            systemInstruction,
          });

          const parsed = PatientMessageDraftSchema.safeParse(aiDraft);
          fullMessage = parsed.success
            ? parsed.data.full_message_body
            : aiDraft?.full_message_body || '';
        } catch (err) {
          console.warn('Gemini message draft generation warning, falling back to clean template:', err);
        }
      }

      // If AI draft not produced or fallback needed:
      if (!fullMessage) {
        const bulletItems = missingPoints
          .map((p, idx) => `• ${p.requirement_text}`)
          .join('\n');

        fullMessage = `Dear ${patient.name},

Hope you are recovering well.

${letter.insurer_name || 'Your health insurer'} has raised a query regarding your claim (${patient.patient_code}).
Our hospital billing team has checked your records, and we require the following missing document(s) to submit the query response and avoid claim rejection:

${bulletItems}

📱 How to send:
1. Simply reply to this message with clear photos/PDFs of the above documents, OR
2. Submit original copies at our Hospital TPA/Billing Desk (Counter 3).

Please provide these within 48 hours to ensure prompt cashless approval.

Warm regards,
Hospital CareLocker Operations Desk`;
      }
    }

    // 4. Save/upsert draft message in messages table
    // Check if a message draft already exists for this query letter
    const { data: existingMessage } = (await supabase
      .from('messages')
      .select('id')
      .eq('query_letter_id', queryLetterId)
      .maybeSingle()) as { data: any };

    if (existingMessage) {
      await supabase
        .from('messages')
        .update({
          message_content: fullMessage,
          delivery_status: 'queued',
          channel: 'WhatsApp',
        } as any)
        .eq('id', existingMessage.id);
    } else {
      await supabase.from('messages').insert({
        patient_id: letter.patient_id,
        query_letter_id: queryLetterId,
        channel: 'WhatsApp',
        message_content: fullMessage,
        delivery_status: 'queued',
      } as any);
    }

    // 5. Audit log
    await supabase.from('audit_logs').insert({
      action: 'DRAFT_PATIENT_MESSAGE',
      entity_type: 'query_letter',
      entity_id: queryLetterId,
      details: {
        missing_count: missingPoints.length,
        patient_name: patient.name,
      },
    } as any);

    return {
      success: true,
      messageContent: fullMessage,
    };
  } catch (err: any) {
    console.error(`Message draft error for ${queryLetterId}:`, err);
    return { success: false, error: err.message };
  }
}

