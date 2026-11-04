import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateStructuredContent, isGeminiConfigured } from './client';
import { DocumentUnderstandingSchema } from './schemas';
import { DocumentAiSummary, Document } from '@/types';

export interface AnalyzeDocumentResult {
  success: boolean;
  summary?: DocumentAiSummary;
  document?: Document;
  error?: string;
}

/**
 * Feature 1: Document Understanding
 * Reads medical document from Supabase private storage and extracts structured summary with Gemini multimodal.
 * Saves validated summary to documents.ai_summary and selects/verifies the persisted value.
 */
export async function analyzePatientDocument(
  documentId: string,
  providedSupabase?: any
): Promise<AnalyzeDocumentResult> {
  const adminSupabase = createAdminClient();

  try {
    const supabase = providedSupabase || adminSupabase;

    // 1. Fetch document metadata with patient details
    const { data: document, error: fetchError } = (await adminSupabase
      .from('documents')
      .select('*, patients(id, patient_code, name)')
      .eq('id', documentId)
      .single()) as { data: any; error: any };

    if (fetchError || !document) {
      throw new Error(`Document not found: ${fetchError?.message || documentId}`);
    }

    if (!isGeminiConfigured()) {
      const unconfiguredSummary: DocumentAiSummary = {
        document_type: document.category,
        patient_name: document.patients?.name || null,
        key_findings: [
          `File: ${document.document_name}`,
          `Category: ${document.category}`,
          'AI document analysis pending: GEMINI_API_KEY is not configured in .env.local',
        ],
        insurance_relevance: 'Configure Gemini API Key in .env.local to enable automated clinical and billing extraction.',
        confidence_score: 0.5,
        analyzed_at: new Date().toISOString(),
        error: 'GEMINI_API_KEY_MISSING',
      };

      const { data: updatedDoc } = await adminSupabase
        .from('documents')
        .update({ ai_summary: unconfiguredSummary as any })
        .eq('id', documentId)
        .select('*')
        .single();

      return {
        success: false,
        summary: unconfiguredSummary,
        document: updatedDoc as unknown as Document,
        error: 'GEMINI_API_KEY is not configured in .env.local',
      };
    }

    // 2. Download file buffer from private Supabase Storage
    const { data: fileData, error: downloadError } = await adminSupabase.storage
      .from('patient-documents')
      .download(document.file_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file from storage: ${downloadError?.message}`);
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // 3. Multimodal Gemini Prompt
    const systemInstruction = `You are a senior medical claims auditor and healthcare document specialist.
Your task is to analyze patient documents uploaded to a hospital document locker (such as discharge summaries, hospital bills, pharmacy bills, investigation reports, KYC, consultation papers, cancelled cheques).
Extract factual information with zero hallucinations. If a piece of information is not present in the document, return null or empty array.
Never invent patient names, dates, amounts, or diagnoses.`;

    const prompt = `Analyze this uploaded patient document (${document.document_name}, classified as ${document.category}).
Target Patient Name on record: "${document.patients?.name || 'Unknown'}" (Code: ${document.patients?.patient_code || 'N/A'}).

Return a strictly valid JSON object matching the following structure:
{
  "document_type": "string (e.g. Discharge Summary, Final Bill, CT Scan Report, Aadhar Card)",
  "detected_category": "One of: Discharge Summary, Hospital Bill, Investigation Reports, Policy Copy, KYC, Consultation Papers, Pharmacy Bills, Cancelled Cheque, Other",
  "patient_name": "extracted patient name or null",
  "patient_identifiers": {
    "patient_id": "hospital ID or UHID or null",
    "policy_number": "insurance policy number or null",
    "claim_number": "claim ID or null",
    "uhid": "unique hospital ID or null"
  },
  "dates": {
    "admission_date": "YYYY-MM-DD or null",
    "discharge_date": "YYYY-MM-DD or null",
    "bill_date": "YYYY-MM-DD or null",
    "report_date": "YYYY-MM-DD or null",
    "consultation_date": "YYYY-MM-DD or null"
  },
  "hospital": {
    "name": "hospital, lab or clinic name or null",
    "address": "location/city or null",
    "doctor_name": "treating consultant doctor or null"
  },
  "financials": {
    "total_amount": number or null (numeric value only),
    "claimed_amount": number or null,
    "paid_amount": number or null,
    "discount_amount": number or null,
    "currency": "INR"
  },
  "clinical_summary": {
    "diagnoses": ["array of diagnoses mentioned"],
    "procedures": ["array of surgical procedures or major clinical interventions performed"],
    "treatments": ["medications or clinical treatments"],
    "investigation_results": ["key lab or radiology findings"]
  },
  "key_findings": ["3 to 5 concise bullet points highlighting key factual contents of this document"],
  "insurance_relevance": "Brief 1-2 sentence explanation of how this document supports healthcare insurance claim settlement",
  "confidence_score": 0.95
}`;

    // 4. Execute Gemini multimodal call with automatic retries and fallback
    const rawAiResult = await generateStructuredContent({
      prompt,
      systemInstruction,
      fileBuffer,
      mimeType: document.file_type,
    });

    // 5. Validate output schema with Zod
    const parsedSummary = DocumentUnderstandingSchema.safeParse(rawAiResult);
    const validSummary: DocumentAiSummary = parsedSummary.success
      ? {
          ...parsedSummary.data,
          analyzed_at: new Date().toISOString(),
        }
      : {
          document_type: rawAiResult?.document_type || document.category,
          patient_name: rawAiResult?.patient_name || null,
          key_findings: rawAiResult?.key_findings || ['Document analyzed'],
          insurance_relevance: rawAiResult?.insurance_relevance || 'Extracted document content',
          confidence_score: 0.8,
          analyzed_at: new Date().toISOString(),
        };

    // 6. Save summary securely and select persisted record
    const { data: savedDocument, error: updateError } = await adminSupabase
      .from('documents')
      .update({ ai_summary: validSummary as any })
      .eq('id', documentId)
      .select('*')
      .single();

    if (updateError) {
      throw new Error(`Failed to save AI summary: ${updateError.message}`);
    }

    if (!savedDocument || !savedDocument.ai_summary) {
      throw new Error('AI summary was not saved in the database.');
    }

    const persistedSummary = savedDocument.ai_summary as unknown as DocumentAiSummary;

    // 7. Audit log
    await adminSupabase.from('audit_logs').insert({
      action: 'ANALYZE_DOCUMENT',
      entity_type: 'document',
      entity_id: documentId,
      details: {
        document_name: document.document_name,
        category: document.category,
        detected_category: validSummary.document_type,
        patient_code: document.patients?.patient_code,
      },
    } as any);

    return {
      success: true,
      summary: persistedSummary,
      document: savedDocument as unknown as Document,
    };
  } catch (err: any) {
    console.error(`Document understanding error for ${documentId}:`, err);

    // Save error state in ai_summary so staff can see failure details in the modal
    try {
      const errorSummary = {
        error: err.message,
        analyzed_at: new Date().toISOString(),
        confidence_score: 0,
      };

      await adminSupabase
        .from('documents')
        .update({
          ai_summary: errorSummary as any,
        })
        .eq('id', documentId);
    } catch {
      // ignore secondary errors
    }

    return { success: false, error: err.message };
  }
}
