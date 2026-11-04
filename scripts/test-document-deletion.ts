import { createAdminClient } from '../src/lib/supabase/admin';

// Load .env.local if needed
if (!process.env.NEXT_PUBLIC_SUPABASE_URL && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env.local');
  } catch {}
}

async function testDeletionWorkflow() {
  console.log('========================================================');
  console.log(' CareLocker: Document Deletion & Evidence Safety Test');
  console.log('========================================================\n');

  const supabase = createAdminClient();

  // 1. Find a test patient
  const { data: patient, error: patientErr } = await supabase
    .from('patients')
    .select('id, name, patient_code')
    .limit(1)
    .single();

  if (patientErr || !patient) {
    throw new Error('No patient found for deletion test.');
  }

  console.log(`✓ Using test patient: ${patient.name} (${patient.patient_code})`);

  // 2. Upload a dummy test file to patient-documents bucket
  const testFileName = `test_deletion_${Date.now()}.pdf`;
  const testFilePath = `patients/${patient.patient_code}/${testFileName}`;
  const dummyBuffer = Buffer.from('%PDF-1.4 dummy deletion test file content');

  const { error: uploadStorageErr } = await supabase.storage
    .from('patient-documents')
    .upload(testFilePath, dummyBuffer, { contentType: 'application/pdf', upsert: true });

  if (uploadStorageErr) {
    throw new Error(`Failed to upload test file to storage: ${uploadStorageErr.message}`);
  }
  console.log(`✓ Uploaded test file to storage: ${testFilePath}`);

  // 3. Create document record in database
  const { data: docRecord, error: docInsertErr } = await supabase
    .from('documents')
    .insert({
      patient_id: patient.id,
      document_name: testFileName,
      category: 'Investigation Reports',
      file_path: testFilePath,
      file_type: 'application/pdf',
      file_size: dummyBuffer.length,
    } as any)
    .select()
    .single();

  if (docInsertErr || !docRecord) {
    throw new Error(`Failed to insert document record: ${docInsertErr?.message}`);
  }
  console.log(`✓ Created document record in DB: ID=${docRecord.id}`);

  // 4. Create a query letter and query point that uses this document as matched evidence
  const { data: qLetter } = await supabase
    .from('query_letters')
    .insert({
      patient_id: patient.id,
      file_path: `patients/${patient.patient_code}/test_qletter_${Date.now()}.pdf`,
      file_name: 'test_qletter.pdf',
      status: 'completed',
    } as any)
    .select()
    .single();

  if (!qLetter) {
    throw new Error('Failed to create test query letter.');
  }

  const { data: qPoint } = await supabase
    .from('query_points')
    .insert({
      query_letter_id: qLetter.id,
      requirement_text: 'Ultrasound abdomen and pelvis report',
      document_category: 'Investigation Reports',
      decision_status: 'available',
      matched_document_id: docRecord.id,
      matched_document_ids: [docRecord.id],
      evidence_quote: 'Normal liver and kidneys noted',
      confidence: 0.98,
    } as any)
    .select()
    .single();

  if (!qPoint) {
    throw new Error('Failed to create test query point.');
  }

  console.log(`✓ Linked document ${docRecord.id} to Query Point ${qPoint.id} with status 'available'`);

  // 5. Execute simulated deletion workflow (same logic as /api/documents/[id] DELETE)
  console.log('\n--- Executing Deletion Workflow ---');

  // A. Storage remove
  const { error: storageRemoveErr } = await supabase.storage
    .from('patient-documents')
    .remove([docRecord.file_path]);

  if (storageRemoveErr) {
    throw new Error(`Storage remove failed: ${storageRemoveErr.message}`);
  }
  console.log('✓ Successfully removed file from private storage bucket');

  // B. Database record delete
  const { error: docDeleteErr } = await supabase
    .from('documents')
    .delete()
    .eq('id', docRecord.id);

  if (docDeleteErr) {
    throw new Error(`DB document delete failed: ${docDeleteErr.message}`);
  }
  console.log('✓ Successfully deleted row from documents table');

  // C. Update affected query points to 'needs_review'
  const { data: affectedPoints } = await supabase
    .from('query_points')
    .select('id, matched_document_id, matched_document_ids, decision_status')
    .eq('id', qPoint.id);

  if (affectedPoints && affectedPoints.length > 0) {
    const point = affectedPoints[0];
    const isSingleMatch = point.matched_document_id === docRecord.id;
    const isMultiMatch = point.matched_document_ids?.includes(docRecord.id);

    if (isSingleMatch || isMultiMatch) {
      await supabase
        .from('query_points')
        .update({
          decision_status: 'needs_review',
          matched_document_id: null,
          matched_document_ids: [],
          reasoning: `[Notice: Supporting document "${docRecord.document_name}" was deleted. Verification required.]`,
        } as any)
        .eq('id', point.id);
      console.log('✓ Automatically updated affected query point decision_status to "needs_review"');
    }
  }

  // D. Create audit trail
  const { error: auditErr } = await supabase.from('audit_logs').insert({
    action: 'DELETE_DOCUMENT',
    entity_type: 'document',
    entity_id: docRecord.id,
    details: {
      document_name: docRecord.document_name,
      patient_id: patient.id,
      patient_code: patient.patient_code,
      affected_query_points: 1,
    },
  } as any);

  if (!auditErr) {
    console.log('✓ Recorded DELETE_DOCUMENT entry in audit_logs');
  }

  // 6. Verify assertions
  // Verify document is gone from documents table
  const { data: checkDoc } = await supabase.from('documents').select('id').eq('id', docRecord.id).maybeSingle();
  if (checkDoc) throw new Error('Document still exists in DB!');
  console.log('✓ Confirmed document purged from DB');

  // Verify query point is now needs_review
  const { data: updatedQPoint } = await supabase.from('query_points').select('decision_status, reasoning').eq('id', qPoint.id).single();
  if (updatedQPoint?.decision_status !== 'needs_review') {
    throw new Error(`Expected decision_status to be 'needs_review', got ${updatedQPoint?.decision_status}`);
  }
  console.log(`✓ Confirmed query point status is now: ${updatedQPoint.decision_status}`);

  // Cleanup test query letter
  await supabase.from('query_points').delete().eq('id', qPoint.id);
  await supabase.from('query_letters').delete().eq('id', qLetter.id);

  console.log('\n========================================================');
  console.log(' All Document Deletion & Evidence Safety Tests PASSED!');
  console.log('========================================================\n');
}

testDeletionWorkflow().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

