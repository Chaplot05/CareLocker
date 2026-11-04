import { Database, DocumentCategory, UserRole, DecisionStatus } from './database';

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
  latest_query_status?: string | null;
}

export interface PatientDetail extends Patient {
  documents: Document[];
  query_letters: (QueryLetter & {
    query_points?: QueryPoint[];
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
