import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { createAdminClient } from '../src/lib/supabase/admin';
import { dispatchQueryNotification } from '../src/lib/messaging/dispatcher';
import { isEmailConfigured } from '../src/lib/messaging/email';

async function main() {
  console.log('====================================================');
  console.log(' Care.locker: End-to-End Automatic Email Verification');
  console.log('====================================================\n');

  if (!isEmailConfigured()) {
    console.error('❌ FAIL: Gmail SMTP is not configured in .env.local');
    process.exit(1);
  }

  const supabase = createAdminClient();
  const testEmail = process.env.SMTP_USER || process.env.SMTP_FROM_EMAIL;

  if (!testEmail) {
    console.error('❌ FAIL: No recipient test email available in SMTP_USER or SMTP_FROM_EMAIL');
    process.exit(1);
  }

  console.log(`[Setup] Target verified recipient email: ${testEmail}`);

  // 1. Find or create a synthetic test patient
  let { data: patient } = await supabase
    .from('patients')
    .select('id, patient_code, name, email, phone')
    .eq('email', testEmail)
    .maybeSingle();

  if (!patient) {
    console.log('[Setup] Creating synthetic test patient for email verification...');
    const patientCode = `TEST-${Date.now().toString().slice(-4)}`;
    const { data: newPatient, error: pErr } = await supabase
      .from('patients')
      .insert({
        patient_code: patientCode,
        name: 'Riddhi Chaplot (Verification Test)',
        email: testEmail,
        phone: process.env.WHATSAPP_TEST_TO || '+916376907620',
        date_of_birth: '1995-05-10',
      })
      .select()
      .single();

    if (pErr || !newPatient) {
      console.error('❌ Failed to create test patient:', pErr?.message);
      process.exit(1);
    }
    patient = newPatient;
  }

  console.log(`✓ Test Patient Active: "${patient.name}" (${patient.patient_code})`);

  // 2. Create a test query letter
  console.log('[Setup] Creating synthetic insurer query letter with missing requirements...');
  const { data: queryLetter, error: qErr } = await supabase
    .from('query_letters')
    .insert({
      patient_id: patient.id,
      file_path: 'queries/test_query_letter.pdf',
      file_name: 'Star_Health_Query_Letter_E2E_Test.pdf',
      insurer_name: 'Star Health & Allied Insurance',
      claim_number: `CLM-E2E-${Date.now().toString().slice(-6)}`,
      status: 'completed',
    })
    .select()
    .single();

  if (qErr || !queryLetter) {
    console.error('❌ Failed to create query letter:', qErr?.message);
    process.exit(1);
  }

  console.log(`✓ Query Letter Inserted: ${queryLetter.id} (Claim: ${queryLetter.claim_number})`);

  // 3. Insert query points: 1 available, 2 missing
  const { error: ptErr } = await supabase.from('query_points').insert([
    {
      query_letter_id: queryLetter.id,
      requirement_text: 'Detailed discharge summary mentioning history and clinical examination',
      document_category: 'Discharge Summary',
      decision_status: 'available',
      reasoning: 'Discharge summary is fully verified in the vault.',
      confidence: 0.98,
    },
    {
      query_letter_id: queryLetter.id,
      requirement_text: 'Original itemized pharmacy purchase bills with detailed batch numbers and doctor prescription',
      document_category: 'Pharmacy Bills',
      decision_status: 'missing',
      reasoning: 'No pharmacy bills found in the patient vault.',
      confidence: 1.0,
    },
    {
      query_letter_id: queryLetter.id,
      requirement_text: 'Indoor case papers with detailed daily doctor notes and nursing treatment charts',
      document_category: 'Other',
      decision_status: 'missing',
      reasoning: 'Indoor case papers not yet provided by the hospital ward.',
      confidence: 0.95,
    },
  ]);

  if (ptErr) {
    console.error('❌ Failed to insert test query points:', ptErr.message);
    process.exit(1);
  }

  console.log('✓ Inserted 3 query points (1 Available, 2 Missing)');

  // 4. Test Step 1: Automatic Multi-Channel Dispatch (Simulating Pipeline Post-Matching Step)
  console.log('\n--- Step 1: Testing Automated Dispatch (Pipeline Execution) ---');
  const dispatchResult = await dispatchQueryNotification({
    queryLetterId: queryLetter.id,
    force: false,
  });

  console.log('Dispatch Outcome:', {
    missingCount: dispatchResult.missingCount,
    skippedAll: dispatchResult.skippedAll,
    emailStatus: dispatchResult.email.status,
    emailProviderId: dispatchResult.email.providerId,
    emailError: dispatchResult.email.error,
  });

  if (dispatchResult.email.status !== 'sent') {
    console.error('❌ FAIL: Email was not marked as sent:', dispatchResult.email.error);
    process.exit(1);
  }

  console.log(`✓ [PASS] Automated Email Dispatched via SMTP! Provider Message ID: ${dispatchResult.email.providerId}`);

  // 5. Verify Supabase Message Persistence
  console.log('\n--- Step 2: Verifying Supabase Database Message Persistence ---');
  const { data: dbMessages, error: msgErr } = await supabase
    .from('messages')
    .select('*')
    .eq('query_letter_id', queryLetter.id)
    .eq('channel', 'Email');

  if (msgErr || !dbMessages || dbMessages.length === 0) {
    console.error('❌ FAIL: No Email record found in messages table:', msgErr?.message);
    process.exit(1);
  }

  const persisted = dbMessages[0];
  console.log('Persisted Database Record:', {
    id: persisted.id,
    channel: persisted.channel,
    delivery_status: persisted.delivery_status,
    provider_message_id: persisted.provider_message_id,
    sent_at: persisted.sent_at,
  });

  if (persisted.delivery_status !== 'sent' || !persisted.provider_message_id) {
    console.error('❌ FAIL: Database record delivery_status is not "sent" or provider ID is missing');
    process.exit(1);
  }
  console.log('✓ [PASS] Supabase message record verified in "sent" state with provider message ID.');

  // 6. Test Step 3: Duplicate Send Prevention on Pipeline Retry
  console.log('\n--- Step 3: Testing Duplicate Send Prevention on Pipeline Retry ---');
  const retryResult = await dispatchQueryNotification({
    queryLetterId: queryLetter.id,
    force: false,
  });

  console.log('Retry Outcome:', {
    emailSkipped: retryResult.email.skipped,
    skipReason: retryResult.email.skipReason,
    emailStatus: retryResult.email.status,
  });

  if (!retryResult.email.skipped || retryResult.email.skipReason !== 'ALREADY_SENT') {
    console.error('❌ FAIL: Duplicate send was not suppressed when force=false');
    process.exit(1);
  }
  console.log('✓ [PASS] Duplicate email prevention verified. Existing sent message preserved without sending duplicate.');

  // 7. Test Step 4: Gating when 0 Missing Items
  console.log('\n--- Step 4: Testing Gating When Zero Missing Requirements Exist ---');
  // Update all points to available
  await supabase
    .from('query_points')
    .update({ decision_status: 'available' })
    .eq('query_letter_id', queryLetter.id);

  // Create a second query letter with 0 missing items
  const { data: noMissingLetter } = await supabase
    .from('query_letters')
    .insert({
      patient_id: patient.id,
      file_path: 'queries/test_no_missing.pdf',
      file_name: 'All_Available_Query_Letter.pdf',
      status: 'completed',
    })
    .select()
    .single();

  if (!noMissingLetter) {
    throw new Error('Failed to create query letter with no missing items');
  }

  await supabase.from('query_points').insert([
    {
      query_letter_id: noMissingLetter.id,
      requirement_text: 'Discharge summary',
      document_category: 'Discharge Summary',
      decision_status: 'available',
    },
  ]);

  const zeroMissingResult = await dispatchQueryNotification({
    queryLetterId: noMissingLetter.id,
    force: false,
  });

  console.log('Zero Missing Outcome:', {
    missingCount: zeroMissingResult.missingCount,
    skippedAll: zeroMissingResult.skippedAll,
    skipReason: zeroMissingResult.skipReason,
  });

  if (!zeroMissingResult.skippedAll || zeroMissingResult.skipReason !== 'NO_MISSING_DOCUMENTS') {
    console.error('❌ FAIL: Gating rule failed for 0 missing documents');
    process.exit(1);
  }
  console.log('✓ [PASS] Gating rule verified: Notification suppressed when 0 missing documents exist.');

  console.log('\n====================================================');
  console.log('🎉 ALL EMAIL NOTIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log(`Delivered Real Email to: ${testEmail}`);
  console.log(`Message ID: ${dispatchResult.email.providerId}`);
  console.log('====================================================');
}

main().catch((err) => {
  console.error('Unhandled test exception:', err);
  process.exit(1);
});
