import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateStructuredContent, isGeminiConfigured } from './client';
import { QueryMatchingBatchSchema } from './schemas';
import { generatePatientDraftMessage } from './messageDrafting';

/**
 * Feature 3: Document Matching Engine
 * Compares each query requirement against all patient document summaries.
 * Returns available, missing, or needs_review with evidence quote, reasoning, confidence, and supporting doc IDs.
 */
export async function matchQueryPointsWithDocuments(
  queryLetterId: string,
  providedSupabase?: any
): Promise<{ success: boolean; matchedCount?: number; error?: string }> {
  const supabase = providedSupabase || (isSupabaseServerConfigured() ? createClient() : createAdminClient());

  try {
    // 1. Fetch query letter and patient ID
    const { data: letter, error: letterError } = (await supabase
      .from('query_letters')
      .select('id, patient_id, file_name, patients(id, patient_code, name)')
      .eq('id', queryLetterId)
      .single()) as { data: any; error: any };

    if (letterError || !letter) {
      throw new Error(`Query letter not found: ${letterError?.message || queryLetterId}`);
    }

    // 2. Update status to 'matching'
    await supabase
      .from('query_letters')
      .update({
        status: 'matching',
        error_message: null,
      } as any)
      .eq('id', queryLetterId);

    // 3. Fetch all query points for this letter
    const { data: points, error: pointsError } = (await supabase
      .from('query_points')
      .select('*')
      .eq('query_letter_id', queryLetterId)
      .order('created_at', { ascending: true })) as { data: any[]; error: any };

    if (pointsError || !points || points.length === 0) {
      throw new Error('No query points found to match.');
    }

    // 4. Fetch all documents for this patient
    const { data: documents, error: docsError } = (await supabase
      .from('documents')
      .select('id, document_name, category, file_path, file_size, ai_summary, uploaded_at')
      .eq('patient_id', letter.patient_id)) as { data: any[]; error: any };

    if (docsError) {
      throw new Error(`Failed to fetch patient documents: ${docsError.message}`);
    }

    // Edge Case: If patient has zero documents in locker, all requirements are definitively missing
    if (!documents || documents.length === 0) {
      for (const pt of points) {
        await supabase
          .from('query_points')
          .update({
            decision_status: 'missing',
            matched_document_ids: [],
            matched_document_id: null,
            evidence_quote: null,
            reasoning: 'Patient document locker is empty. No documents uploaded yet for comparison.',
            confidence: 1.0,
          } as any)
          .eq('id', pt.id);
      }

      await supabase
        .from('query_letters')
        .update({
          status: 'completed',
          matched_at: new Date().toISOString(),
          error_message: null,
        } as any)
        .eq('id', queryLetterId);

      // Generate draft message for all missing items
      await generatePatientDraftMessage(queryLetterId, supabase);

      return { success: true, matchedCount: points.length };
    }

    // If Gemini is not configured, fall back to safe needs_review
    if (!isGeminiConfigured()) {
      for (const pt of points) {
        await supabase
          .from('query_points')
          .update({
            decision_status: 'needs_review',
            reasoning: 'AI matching pending: GEMINI_API_KEY is not configured in .env.local',
            confidence: 0.5,
          } as any)
          .eq('id', pt.id);
      }

      await supabase
        .from('query_letters')
        .update({
          status: 'completed',
          matched_at: new Date().toISOString(),
          error_message: 'Completed with pending AI keys',
        } as any)
        .eq('id', queryLetterId);

      return { success: true, matchedCount: points.length };
    }

    // 5. Build structured payload for Gemini matching
    const queryPointsPayload = points.map((pt, idx) => ({
      index: idx,
      id: pt.id,
      requirement_text: pt.requirement_text,
      expected_category: pt.document_category,
    }));

    const documentsPayload = documents.map((doc) => ({
      document_id: doc.id,
      document_name: doc.document_name,
      category: doc.category,
      ai_summary: doc.ai_summary || 'No AI summary available yet',
    }));

    const systemInstruction = `You are a strict, forensic medical claim adjudicator comparing insurance query requirements against existing patient medical documents.
You will receive:
1. An array of required items/clarifications demanded by the insurer in a query letter.
2. An array of existing patient documents in the hospital locker, including their structured AI clinical and billing summaries.

EVALUATION RULES:
1. NEVER mark 'available' by category alone. A document categorized as 'Discharge Summary' does NOT satisfy a requirement for surgical operative notes or pharmacy bills unless the clinical text actually contains them.
2. Return 'available' ONLY when the requirement is clearly and factually satisfied by one or more documents.
   - If satisfied across MULTIPLE documents (e.g. operative note in doc A and surgical bill in doc B), return ALL supporting document IDs in 'matched_document_ids'.
3. Return 'missing' if the required document, invoice, or clinical finding is clearly absent from all patient files.
4. Return 'needs_review' if:
   - The document appears partially relevant but lacks critical details (e.g. missing signature, illegible date, ambiguous diagnosis).
   - Wording is ambiguous or contradictory.
   - The insurer requests a medical justification from the treating consultant that requires doctor consultation.
5. Provide a verbatim 'evidence_quote' from the document summary whenever available. If missing, evidence_quote must be null.
6. Provide a concise, clear professional 'reasoning' explaining the decision.
7. NEVER invent details, document IDs, or quotes.`;

    const prompt = `Patient: "${letter.patients?.name || 'Patient'}" (${letter.patients?.patient_code || 'N/A'}).

QUERY REQUIREMENTS TO EVALUATE:
${JSON.stringify(queryPointsPayload, null, 2)}

AVAILABLE PATIENT DOCUMENTS IN VAULT:
${JSON.stringify(documentsPayload, null, 2)}

Return a strictly valid JSON object matching this schema:
{
  "decisions": [
    {
      "query_point_index": number (0-based matching the requirement index),
      "requirement_text": "Exact text of the requirement",
      "decision_status": "One of: available, missing, needs_review",
      "matched_document_ids": ["array of matching document UUIDs from the available documents list"],
      "evidence_quote": "Exact verbatim quote or null",
      "reasoning": "Clear explanation of why this is available, missing, or needs review",
      "confidence": number between 0.0 and 1.0 (e.g. 0.95)
    }
  ]
}`;

    // 6. Execute Gemini matching
    const rawResult = await generateStructuredContent({
      prompt,
      systemInstruction,
    });

    const parsed = QueryMatchingBatchSchema.safeParse(rawResult);
    const decisions = parsed.success ? parsed.data.decisions : rawResult?.decisions || [];

    // 7. Update each query point in database
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const match = decisions.find((d: any) => d.query_point_index === i || d.requirement_text === pt.requirement_text);

      const decisionStatus = match?.decision_status || 'needs_review';
      const matchedDocIds = Array.isArray(match?.matched_document_ids) ? match.matched_document_ids : [];
      const primaryDocId = matchedDocIds.length > 0 ? matchedDocIds[0] : null;

      await supabase
        .from('query_points')
        .update({
          decision_status: decisionStatus,
          matched_document_ids: matchedDocIds,
          matched_document_id: primaryDocId,
          evidence_quote: match?.evidence_quote || null,
          reasoning: match?.reasoning || 'Automated AI document matching comparison completed.',
          confidence: match?.confidence || 0.9,
        } as any)
        .eq('id', pt.id);
    }

    // 8. Update query letter status to 'completed'
    await supabase
      .from('query_letters')
      .update({
        status: 'completed',
        matched_at: new Date().toISOString(),
        error_message: null,
      } as any)
      .eq('id', queryLetterId);

    // 9. Generate patient-friendly message draft (Feature 5)
    await generatePatientDraftMessage(queryLetterId, supabase);

    // 10. Audit log
    await supabase.from('audit_logs').insert({
      action: 'MATCH_QUERY_POINTS',
      entity_type: 'query_letter',
      entity_id: queryLetterId,
      details: {
        points_count: points.length,
        documents_evaluated: documents.length,
        completed_at: new Date().toISOString(),
      },
    } as any);

    return { success: true, matchedCount: points.length };
  } catch (err: any) {
    console.error(`Query document matching error for ${queryLetterId}:`, err);

    await supabase
      .from('query_letters')
      .update({
        status: 'failed',
        error_message: `Matching Failed: ${err.message}`,
      } as any)
      .eq('id', queryLetterId);

    return { success: false, error: err.message };
  }
}

