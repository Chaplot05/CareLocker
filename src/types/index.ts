import { Database, DocumentCategory, UserRole, DecisionStatus, QueryLetterStatus } from './database';

export * from './database';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Patient = Database['public']['Tables']['patients']['Row'];
export type Document = Database['public']['Tables']['documents']['Row'];
export type QueryLetter = Database['public']['Tables']['query_letters']['Row'];
export type QueryPoint = Database['public']['Tables']['query_points']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];

export interface PatientWithStats extends Patient {
  documents_count?: number;
  query_letters_count?: number;
  latest_query_status?: QueryLetterStatus | null;
}

export interface PatientDetail extends Patient {
  documents: Document[];
  query_letters: (QueryLetter & {
    query_points?: (QueryPoint & {
      matched_documents?: Document[];
    })[];
  })[];
  messages: Message[];
  audit_logs: AuditLog[];
}

export interface DocumentUploadPayload {
  patient_id: string;
  category: DocumentCategory;
  file: File;
}

export interface SignedUrlResponse {
  signedUrl: string;
  expiresIn: number;
}

/** Structured AI Document Summary Schema (Feature 1) */
export interface DocumentAiSummary {
  document_type: string;
  patient_name?: string | null;
  patient_identifiers?: {
    patient_id?: string | null;
    policy_number?: string | null;
    claim_number?: string | null;
    uhid?: string | null;
  } | null;
  dates?: {
    admission_date?: string | null;
    discharge_date?: string | null;
    bill_date?: string | null;
    report_date?: string | null;
    consultation_date?: string | null;
  } | null;
  hospital?: {
    name?: string | null;
    address?: string | null;
    doctor_name?: string | null;
  } | null;
  financials?: {
    total_amount?: number | null;
    claimed_amount?: number | null;
    paid_amount?: number | null;
    discount_amount?: number | null;
    currency?: string;
  } | null;
  clinical_summary?: {
    diagnoses?: string[];
    procedures?: string[];
    treatments?: string[];
    investigation_results?: string[];
  } | null;
  key_findings?: string[];
  insurance_relevance?: string;
  confidence_score?: number;
  raw_extracted_text_snippet?: string;
  analyzed_at?: string;
  error?: string | null;
}

/** Structured Extracted Query Requirement (Feature 2) */
export interface ExtractedQueryPoint {
  requirement_text: string;
  document_category: DocumentCategory;
  context_or_reason?: string;
  is_clarification_only?: boolean;
}

/** Structured Matching Result (Feature 3) */
export interface MatchedQueryPointResult {
  requirement_text: string;
  document_category: DocumentCategory;
  decision_status: DecisionStatus;
  matched_document_ids: string[];
  evidence_quote?: string | null;
  reasoning: string;
  confidence: number;
}
