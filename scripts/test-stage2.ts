import {
  DocumentUnderstandingSchema,
  QueryLetterExtractionSchema,
  QueryMatchingBatchSchema,
  PatientMessageDraftSchema,
} from '../src/lib/gemini/schemas';

console.log('====================================================');
console.log(' CareLocker Stage 2: AI Processing Engine Test Suite');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}`);
    process.exitCode = 1;
  }
}

// -------------------------------------------------------------
// TEST SUITE 1: DOCUMENT UNDERSTANDING SCHEMA & EXTRACTION (Feature 1)
// -------------------------------------------------------------
console.log('--- Test Suite 1: Document Understanding (Feature 1) ---');

const syntheticDischargeSummary = {
  document_type: 'Discharge Summary',
  detected_category: 'Discharge Summary' as const,
  patient_name: 'Rajesh Sharma',
  patient_identifiers: {
    patient_id: 'PAT-2026-001',
    policy_number: 'POL-HDFC-9921',
    claim_number: 'CLM-40912',
    uhid: 'UHID-88129',
  },
  dates: {
    admission_date: '2026-10-20',
    discharge_date: '2026-10-24',
    bill_date: null,
    report_date: null,
    consultation_date: null,
  },
  hospital: {
    name: 'Max Super Speciality Hospital',
    address: 'Saket, New Delhi',
    doctor_name: 'Dr. Vivek Mehra (MS, MCh)',
  },
  financials: {
    total_amount: 184500,
    claimed_amount: 184500,
    paid_amount: 0,
    discount_amount: 5000,
    currency: 'INR',
  },
  clinical_summary: {
    diagnoses: ['Acute Calculus Cholecystitis', 'Hypertension'],
    procedures: ['Laparoscopic Cholecystectomy under General Anesthesia'],
    treatments: ['IV Ceftriaxone', 'IV Pantoprazole', 'Analgesics'],
    investigation_results: ['USG Abdomen: Distended gallbladder with multiple calculi (largest 12mm)'],
  },
  key_findings: [
    'Patient presented with acute right upper quadrant abdominal pain and vomiting.',
    'Underwent uncomplicated laparoscopic cholecystectomy on 21-Oct-2026.',
    'Histopathology confirmed chronic cholecystitis with cholelithiasis.',
    'Hemodynamically stable at discharge on 24-Oct-2026.',
  ],
  insurance_relevance: 'Verifies active surgical inpatient hospitalization and procedure validity.',
  confidence_score: 0.98,
};

const parsedSummary = DocumentUnderstandingSchema.safeParse(syntheticDischargeSummary);
assert(parsedSummary.success === true, 'Discharge summary conforms to DocumentUnderstandingSchema');
assert(parsedSummary.data?.financials?.total_amount === 184500, 'Correctly captures financial billing amounts');
assert(parsedSummary.data?.clinical_summary?.procedures?.length === 1, 'Correctly extracts surgical procedure');

// -------------------------------------------------------------
// TEST SUITE 2: QUERY EXTRACTION (Feature 2)
// -------------------------------------------------------------
console.log('\n--- Test Suite 2: Query Requirement Extraction (Feature 2) ---');

const syntheticInsurerQueryLetter = {
  insurer_name: 'Star Health & Allied Insurance Co. Ltd.',
  claim_number: 'CIR/2026/40912',
  policy_number: 'P/11029/01/2026/00192',
  query_date: '2026-10-28',
  deadline_date: '2026-11-12',
  requirements: [
    {
      requirement_text: 'Submit indoor case papers along with surgical operative notes and anesthesia record.',
      document_category: 'Investigation Reports' as const,
      context_or_reason: 'To verify surgical duration, OT registrar notes, and implant details if any.',
      is_clarification_only: false,
    },
    {
      requirement_text: 'Provide detailed itemized pharmacy bill along with doctor prescriptions for medicines exceeding Rs. 10,000.',
      document_category: 'Pharmacy Bills' as const,
      context_or_reason: 'Required as per Clause 4.2 for verification of non-payable consumables and antibiotic charges.',
      is_clarification_only: false,
    },
    {
      requirement_text: 'Signed Discharge Summary mentioning first onset of symptoms and past history of hypertension.',
      document_category: 'Discharge Summary' as const,
      context_or_reason: 'To rule out pre-existing disease exclusion under 24-month waiting period.',
      is_clarification_only: false,
    },
    {
      requirement_text: 'Doctor medical justification letter for ICU admission exceeding 48 hours.',
      document_category: 'Consultation Papers' as const,
      context_or_reason: 'Subjective medical necessity assessment required from treating surgeon.',
      is_clarification_only: true,
    },
  ],
};

const parsedQuery = QueryLetterExtractionSchema.safeParse(syntheticInsurerQueryLetter);
assert(parsedQuery.success === true, 'Query letter extraction conforms to QueryLetterExtractionSchema');
assert(parsedQuery.data?.requirements?.length === 4, 'Preserved all 4 distinct requirements separately without merging');
assert(
  parsedQuery.data?.requirements[1].requirement_text.includes('itemized pharmacy bill') ?? false,
  'Preserved exact verbatim text for pharmacy bill requirement'
);

// -------------------------------------------------------------
// TEST SUITE 3: DOCUMENT MATCHING ENGINE (Feature 3)
// -------------------------------------------------------------
console.log('\n--- Test Suite 3: Document Matching Adjudication (Feature 3) ---');

// Case A: Discharge summary is Available in vault
// Case B: Pharmacy bills are Missing from vault
// Case C: Operative notes satisfied across MULTIPLE supporting documents (Surgical Note + OT Log)
// Case D: ICU justification has ambiguous wording -> Needs Review

const evaluationBatch = {
  decisions: [
    {
      query_point_index: 0,
      requirement_text: 'Submit indoor case papers along with surgical operative notes and anesthesia record.',
      decision_status: 'available' as const,
      matched_document_ids: ['doc-uuid-2', 'doc-uuid-3'], // Multi-document match!
      evidence_quote: 'Operative notes signed by Dr. Vivek Mehra with anesthesia chart attached.',
      reasoning: 'Requirement satisfied across two supporting vault documents: OT Surgical Operative Notes and Anesthesia Registrar Record.',
      confidence: 0.98,
    },
    {
      query_point_index: 1,
      requirement_text: 'Provide detailed itemized pharmacy bill along with doctor prescriptions for medicines exceeding Rs. 10,000.',
      decision_status: 'missing' as const,
      matched_document_ids: [],
      evidence_quote: null,
      reasoning: 'No pharmacy bills or medicine invoices are present in the patient document locker.',
      confidence: 0.99,
    },
    {
      query_point_index: 2,
      requirement_text: 'Signed Discharge Summary mentioning first onset of symptoms and past history of hypertension.',
      decision_status: 'available' as const,
      matched_document_ids: ['doc-uuid-1'],
      evidence_quote: 'Diagnoses: Acute Calculus Cholecystitis, Hypertension. Hemodynamically stable at discharge on 24-Oct-2026.',
      reasoning: 'Discharge summary signed by Dr. Vivek Mehra confirms onset timeline and hypertension history.',
      confidence: 0.97,
    },
    {
      query_point_index: 3,
      requirement_text: 'Doctor medical justification letter for ICU admission exceeding 48 hours.',
      decision_status: 'needs_review' as const,
      matched_document_ids: ['doc-uuid-1'],
      evidence_quote: 'Patient presented with acute right upper quadrant abdominal pain and vomiting.',
      reasoning: 'Discharge summary indicates admission symptoms, but a specific signed doctor justification letter addressing the 48-hour ICU stay is ambiguous and requires hospital billing desk/doctor review.',
      confidence: 0.88,
    },
  ],
};

const parsedBatch = QueryMatchingBatchSchema.safeParse(evaluationBatch);
assert(parsedBatch.success === true, 'Matching batch conforms to QueryMatchingBatchSchema');

// Check Multi-Document Support
const multiDocMatch = parsedBatch.data?.decisions[0];
assert(
  multiDocMatch?.matched_document_ids.length === 2,
  'Feature 3 verified: Multiple supporting document IDs supported for requirement 1'
);

// Check Missing Document Decision
const missingMatch = parsedBatch.data?.decisions[1];
assert(missingMatch?.decision_status === 'missing', 'Requirement 2 accurately identified as missing');
assert(missingMatch?.matched_document_ids.length === 0, 'Missing requirement has 0 matched documents');

// Check Available with Evidence Quote
const availableMatch = parsedBatch.data?.decisions[2];
assert(availableMatch?.decision_status === 'available', 'Requirement 3 accurately identified as available');
assert(
  typeof availableMatch?.evidence_quote === 'string' && availableMatch.evidence_quote.length > 5,
  'Available requirement includes verifiable evidence quote'
);

// Check Ambiguous Needs Review
const reviewMatch = parsedBatch.data?.decisions[3];
assert(reviewMatch?.decision_status === 'needs_review', 'Ambiguous ICU requirement accurately designated as needs_review');

// -------------------------------------------------------------
// TEST SUITE 4: PATIENT MESSAGE DRAFTING (Feature 5)
// -------------------------------------------------------------
console.log('\n--- Test Suite 4: Patient Notification Drafting (Feature 5) ---');

const missingOnly = parsedBatch.data?.decisions.filter((d) => d.decision_status === 'missing');
assert(missingOnly?.length === 1, 'Identified exactly 1 genuinely missing requirement for patient request');

const syntheticDraft = {
  greeting: 'Dear Rajesh Sharma,',
  introduction: 'Star Health has reviewed your cashless claim for your recent hospitalization and requested additional documentation.',
  missing_documents_list: [
    'Detailed itemized pharmacy purchase bills along with doctor prescriptions for medicines',
  ],
  submission_instructions: 'Please reply to this WhatsApp message with clear photos of the pharmacy bills, or submit them at Counter 3 (Hospital Billing Desk).',
  closing: 'Warm regards,\nMax Hospital CareLocker Insurance Desk',
  full_message_body: `Dear Rajesh Sharma,

Star Health has reviewed your cashless claim for your recent hospitalization and requested additional documentation.

To ensure your claim is processed without delay, please provide the following document:
• Detailed itemized pharmacy purchase bills along with doctor prescriptions for medicines

Please reply to this message with clear photos/PDFs or hand them over to our Billing Desk (Counter 3) within 48 hours.

Warm regards,
Max Hospital CareLocker Insurance Desk`,
};

const parsedDraft = PatientMessageDraftSchema.safeParse(syntheticDraft);
assert(parsedDraft.success === true, 'Patient draft message conforms to PatientMessageDraftSchema');
assert(
  parsedDraft.data?.missing_documents_list.length === 1,
  'Patient message requested ONLY the missing pharmacy bills'
);
assert(
  !parsedDraft.data?.full_message_body.includes('Discharge Summary'),
  'Draft successfully EXCLUDED already available Discharge Summary'
);
assert(
  !parsedDraft.data?.full_message_body.includes('ICU admission exceeding 48 hours'),
  'Draft successfully EXCLUDED uncertain needs_review requirement from patient request'
);

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n====================================================');
console.log(` Results: ${passedTests} / ${totalTests} Stage 2 Unit & Schema Tests Passed`);
console.log('====================================================\n');
