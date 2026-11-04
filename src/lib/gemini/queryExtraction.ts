import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateStructuredContent, isGeminiConfigured } from './client';
import { QueryLetterExtractionSchema } from './schemas';
import { DOCUMENT_CATEGORIES, DocumentCategory } from '@/types/database';

/**
 * Feature 2: Query Extraction
 * Reads an insurer/TPA query letter from Supabase storage and extracts all distinct requirements.
 */
export async function extractQueryLetterPoints(
  queryLetterId: string,
  providedSupabase?: any
): Promise<{ success: boolean; requirementsCount?: number; error?: string }> {
  const supabase = providedSupabase || (isSupabaseServerConfigured() ? createClient() : createAdminClient());

  try {
    // 1. Fetch query letter metadata
    const { data: letter, error: letterError } = (await supabase
      .from('query_letters')
      .select('*, patients(id, patient_code, name)')
      .eq('id', queryLetterId)
      .single()) as { data: any; error: any };

    if (letterError || !letter) {
      throw new Error(`Query letter not found: ${letterError?.message || queryLetterId}`);
    }

    // 2. Update status to 'extracting'
    await supabase
      .from('query_letters')
      .update({
        status: 'extracting',
        error_message: null,
      } as any)
      .eq('id', queryLetterId);

    if (!isGeminiConfigured()) {
      throw new Error('GEMINI_API_KEY is not configured in .env.local. AI query extraction requires a valid Gemini API key.');
    }

    // 3. Download query letter from private Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('patient-documents')
      .download(letter.file_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download query letter from storage: ${downloadError?.message}`);
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Determine MIME type based on file_path/file_name extension
    const ext = letter.file_name.toLowerCase().split('.').pop();
    const mimeType = ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : 'image/jpeg';

    // 4. Gemini Multimodal Extraction Prompt
    const systemInstruction = `You are an expert healthcare insurance claim and TPA query letter auditor.
Your job is to read an official query/clarification letter sent by an insurance company or TPA (such as Star Health, Medi Assist, Care Health, HDFC Ergo, ICICI Lombard, Paramount, Vidal, etc.).
Extract EVERY separate requirement or document requested.
Do NOT combine multiple requirements into one point. Split itemized requests into separate individual points.
Preserve the EXACT text/wording used by the insurer in "requirement_text".
Map each requirement to one of the following standard document categories:
[${DOCUMENT_CATEGORIES.map((c) => `"${c}"`).join(', ')}]`;

    const prompt = `Analyze this insurance query letter (${letter.file_name}) for patient "${letter.patients?.name || 'Unknown'}" (${letter.patients?.patient_code || 'N/A'}).

Extract:
1. Insurer or TPA company name
2. Claim Number or Reference Number
3. Policy Number (if mentioned)
4. Query Date and Submission Deadline (if mentioned)
5. ALL individual requirements requested in the letter.

Return a strictly valid JSON object matching this schema:
{
  "insurer_name": "Name of insurance company or TPA or null",
  "claim_number": "Claim reference number or null",
  "policy_number": "Policy number or null",
  "query_date": "YYYY-MM-DD or null",
  "deadline_date": "YYYY-MM-DD or null",
  "requirements": [
    {
      "requirement_text": "Exact verbatim sentence/clause from the letter stating the requirement",
      "document_category": "One of: Discharge Summary, Hospital Bill, Investigation Reports, Policy Copy, KYC, Consultation Papers, Pharmacy Bills, Cancelled Cheque, Other",
      "context_or_reason": "Any context or reason given by the insurer for why this is needed (e.g. clause number, deduction dispute, symptom timeline)",
      "is_clarification_only": boolean (true if asking for a written explanation rather than a document, false if document needed)
    }
  ]
}`;

    // 5. Execute Gemini call
    const rawResult = await generateStructuredContent({
      prompt,
      systemInstruction,
      fileBuffer,
      mimeType,
    });

    // 6. Validate with Zod
    const parsed = QueryLetterExtractionSchema.safeParse(rawResult);
    if (!parsed.success) {
      console.warn('Extraction schema validation issues:', parsed.error);
    }

    const data = parsed.success ? parsed.data : rawResult;
    const requirements = data?.requirements || [];

    if (!Array.isArray(requirements) || requirements.length === 0) {
      throw new Error('Gemini could not identify any distinct requirements in the uploaded query letter.');
    }

    // 7. Delete previous query points for this letter (in case of re-try)
    await supabase.from('query_points').delete().eq('query_letter_id', queryLetterId);

    // 8. Insert extracted query points
    const pointsToInsert = requirements.map((req: any) => ({
      query_letter_id: queryLetterId,
      requirement_text: req.requirement_text.trim(),
      document_category: DOCUMENT_CATEGORIES.includes(req.document_category)
        ? req.document_category
        : 'Other',
      decision_status: 'needs_review',
      matched_document_ids: [],
      matched_document_id: null,
      evidence_quote: null,
      reasoning: req.context_or_reason || null,
      confidence: 1.0,
    }));

    const { error: insertError } = await supabase.from('query_points').insert(pointsToInsert as any);

    if (insertError) {
      throw new Error(`Failed to save extracted query points: ${insertError.message}`);
    }

    // 9. Update query letter metadata
    await supabase
      .from('query_letters')
      .update({
        insurer_name: data.insurer_name || letter.insurer_name || null,
        claim_number: data.claim_number || letter.claim_number || null,
        extracted_at: new Date().toISOString(),
        error_message: null,
      } as any)
      .eq('id', queryLetterId);

    // 10. Audit log
    await supabase.from('audit_logs').insert({
      action: 'EXTRACT_QUERY_LETTER',
      entity_type: 'query_letter',
      entity_id: queryLetterId,
      details: {
        file_name: letter.file_name,
        requirements_count: pointsToInsert.length,
        insurer: data.insurer_name,
      },
    } as any);

    return {
      success: true,
      requirementsCount: pointsToInsert.length,
    };
  } catch (err: any) {
    console.error(`Query extraction error for ${queryLetterId}:`, err);

    await supabase
      .from('query_letters')
      .update({
        status: 'failed',
        error_message: `Extraction Failed: ${err.message}`,
      } as any)
      .eq('id', queryLetterId);

    return {
      success: false,
      error: err.message,
    };
  }
}
