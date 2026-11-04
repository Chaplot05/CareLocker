import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractQueryLetterPoints } from './queryExtraction';
import { matchQueryPointsWithDocuments } from './documentMatching';
import { generatePatientDraftMessage } from './messageDrafting';

/**
 * Complete Stage 2 End-to-End AI Processing Pipeline
 * Executes: Extract Requirements -> Match with Patient Vault Documents -> Generate Patient Message Draft.
 */
export async function runQueryLetterPipeline(
  queryLetterId: string,
  providedSupabase?: any
): Promise<{ success: boolean; status: string; error?: string }> {
  const supabase = providedSupabase || (isSupabaseServerConfigured() ? createClient() : createAdminClient());

  try {
    console.log(`[AI Pipeline] Starting processing for query letter ${queryLetterId}`);

    // Step 1: Query Extraction
    console.log(`[AI Pipeline] Step 1: Extracting query requirements from letter...`);
    const extractResult = await extractQueryLetterPoints(queryLetterId, supabase);

    if (!extractResult.success) {
      throw new Error(extractResult.error || 'Query requirement extraction failed.');
    }

    console.log(`[AI Pipeline] Step 1 complete. Extracted ${extractResult.requirementsCount} requirements.`);

    // Step 2: Document Matching
    console.log(`[AI Pipeline] Step 2: Comparing requirements against patient document vault...`);
    const matchResult = await matchQueryPointsWithDocuments(queryLetterId, supabase);

    if (!matchResult.success) {
      throw new Error(matchResult.error || 'Document matching comparison failed.');
    }

    console.log(`[AI Pipeline] Step 2 complete. Evaluated ${matchResult.matchedCount} query points.`);

    // Step 3: Message Drafting
    console.log(`[AI Pipeline] Step 3: Drafting patient notification for missing items...`);
    const draftResult = await generatePatientDraftMessage(queryLetterId, supabase);

    if (!draftResult.success) {
      console.warn(`[AI Pipeline] Draft message warning: ${draftResult.error}`);
    }

    console.log(`[AI Pipeline] Pipeline successfully finished for query letter ${queryLetterId}`);

    return {
      success: true,
      status: 'completed',
    };
  } catch (err: any) {
    console.error(`[AI Pipeline] Pipeline failed for query letter ${queryLetterId}:`, err);

    await supabase
      .from('query_letters')
      .update({
        status: 'failed',
        error_message: err.message || 'AI pipeline processing failed.',
      } as any)
      .eq('id', queryLetterId);

    return {
      success: false,
      status: 'failed',
      error: err.message,
    };
  }
}

