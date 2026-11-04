import { createAdminClient } from '@/lib/supabase/admin';
import { extractQueryLetterPoints } from './queryExtraction';
import { matchQueryPointsWithDocuments } from './documentMatching';
import { generatePatientDraftMessage } from './messageDrafting';
import { dispatchQueryNotification, MultiChannelDispatchResult } from '@/lib/messaging/dispatcher';

export interface QueryPipelineResult {
  success: boolean;
  status: string;
  dispatchResult?: MultiChannelDispatchResult;
  error?: string;
}

/**
 * Complete End-to-End Processing Pipeline:
 * Stage 2: Extract Requirements -> Match with Patient Vault Documents -> Generate Patient Message Draft.
 * Stage 3: Automatically Dispatch through WhatsApp AND Email if genuinely missing items exist.
 */
export async function runQueryLetterPipeline(
  queryLetterId: string,
  providedSupabase?: any
): Promise<QueryPipelineResult> {
  const supabase = providedSupabase || createAdminClient();

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

    // Step 4: Stage 3 Automatic Multi-channel Delivery (WhatsApp AND Email)
    console.log(`[AI Pipeline] Step 4: Executing Stage 3 automated multi-channel delivery...`);
    let dispatchOutcome: MultiChannelDispatchResult | undefined;

    try {
      dispatchOutcome = await dispatchQueryNotification({
        queryLetterId,
        force: false,
      });

      console.log(`[AI Pipeline] Automated delivery outcome:`, {
        missingCount: dispatchOutcome.missingCount,
        skippedAll: dispatchOutcome.skippedAll,
        skipReason: dispatchOutcome.skipReason,
        whatsappStatus: dispatchOutcome.whatsapp.status,
        emailStatus: dispatchOutcome.email.status,
      });
    } catch (dispatchErr: any) {
      console.error(`[AI Pipeline] Automated notification dispatch error:`, dispatchErr);
    }

    console.log(`[AI Pipeline] Pipeline successfully finished for query letter ${queryLetterId}`);

    return {
      success: true,
      status: 'completed',
      dispatchResult: dispatchOutcome,
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
