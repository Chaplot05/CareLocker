import { z } from 'zod';
import { DOCUMENT_CATEGORIES } from '@/types/database';

export const DocumentCategoryEnum = z.enum([
  'Discharge Summary',
  'Hospital Bill',
  'Investigation Reports',
  'Policy Copy',
  'KYC',
  'Consultation Papers',
  'Pharmacy Bills',
  'Cancelled Cheque',
  'Other',
]);

/** Schema for Feature 1: Document Understanding */
export const DocumentUnderstandingSchema = z.object({
  document_type: z.string().default('Other'),
  detected_category: DocumentCategoryEnum.default('Other'),
  patient_name: z.string().nullable().optional(),
  patient_identifiers: z
    .object({
      patient_id: z.string().nullable().optional(),
      policy_number: z.string().nullable().optional(),
      claim_number: z.string().nullable().optional(),
      uhid: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  dates: z
    .object({
      admission_date: z.string().nullable().optional(),
      discharge_date: z.string().nullable().optional(),
      bill_date: z.string().nullable().optional(),
      report_date: z.string().nullable().optional(),
      consultation_date: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  hospital: z
    .object({
      name: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
      doctor_name: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  financials: z
    .object({
      total_amount: z.number().nullable().optional(),
      claimed_amount: z.number().nullable().optional(),
      paid_amount: z.number().nullable().optional(),
      discount_amount: z.number().nullable().optional(),
      currency: z.string().default('INR').optional(),
    })
    .nullable()
    .optional(),
  clinical_summary: z
    .object({
      diagnoses: z.array(z.string()).default([]),
      procedures: z.array(z.string()).default([]),
      treatments: z.array(z.string()).default([]),
      investigation_results: z.array(z.string()).default([]),
    })
    .nullable()
    .optional(),
  key_findings: z.array(z.string()).default([]),
  insurance_relevance: z.string().default(''),
  confidence_score: z.number().min(0).max(1).default(0.95),
  raw_extracted_text_snippet: z.string().optional(),
});

/** Schema for Feature 2: Query Letter Extraction */
export const QueryPointExtractionItemSchema = z.object({
  requirement_text: z.string().min(3, 'Requirement text cannot be empty'),
  document_category: DocumentCategoryEnum.default('Other'),
  context_or_reason: z.string().optional().default(''),
  is_clarification_only: z.boolean().default(false),
});

export const QueryLetterExtractionSchema = z.object({
  insurer_name: z.string().nullable().optional(),
  claim_number: z.string().nullable().optional(),
  policy_number: z.string().nullable().optional(),
  query_date: z.string().nullable().optional(),
  deadline_date: z.string().nullable().optional(),
  requirements: z.array(QueryPointExtractionItemSchema).min(1, 'At least one requirement must be extracted'),
});

/** Schema for Feature 3: Document Matching Decision */
export const SingleQueryMatchDecisionSchema = z.object({
  query_point_index: z.number(),
  requirement_text: z.string(),
  decision_status: z.enum(['available', 'missing', 'needs_review']),
  matched_document_ids: z.array(z.string()).default([]),
  evidence_quote: z.string().nullable().optional(),
  reasoning: z.string().min(5, 'Reasoning explanation required'),
  confidence: z.number().min(0).max(1).default(0.9),
});

export const QueryMatchingBatchSchema = z.object({
  decisions: z.array(SingleQueryMatchDecisionSchema),
});

/** Schema for Feature 5: Patient-Friendly Message Draft */
export const PatientMessageDraftSchema = z.object({
  greeting: z.string(),
  introduction: z.string(),
  missing_documents_list: z.array(z.string()),
  submission_instructions: z.string(),
  closing: z.string(),
  full_message_body: z.string(),
});
