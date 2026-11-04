export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'admin' | 'agent';

export type DocumentCategory =
  | 'Discharge Summary'
  | 'Hospital Bill'
  | 'Investigation Reports'
  | 'Policy Copy'
  | 'KYC'
  | 'Consultation Papers'
  | 'Pharmacy Bills'
  | 'Cancelled Cheque'
  | 'Other';

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  'Discharge Summary',
  'Hospital Bill',
  'Investigation Reports',
  'Policy Copy',
  'KYC',
  'Consultation Papers',
  'Pharmacy Bills',
  'Cancelled Cheque',
  'Other',
];

export type DecisionStatus = 'available' | 'missing' | 'needs_review';
export type MessageChannel = 'WhatsApp' | 'Email';
export type MessageDeliveryStatus = 'queued' | 'sent' | 'delivered' | 'failed';
export type QueryLetterStatus = 'uploaded' | 'extracting' | 'matching' | 'completed' | 'failed';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          role?: UserRole;
          created_at?: string;
        };
      };
      patients: {
        Row: {
          id: string;
          patient_code: string;
          name: string;
          phone: string;
          email: string;
          date_of_birth: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_code: string;
          name: string;
          phone: string;
          email: string;
          date_of_birth?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_code?: string;
          name?: string;
          phone?: string;
          email?: string;
          date_of_birth?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          patient_id: string;
          document_name: string;
          category: DocumentCategory;
          file_path: string;
          file_type: string;
          file_size: number;
          ai_summary: Json | null;
          uploaded_at: string;
          uploaded_by: string | null;
        };
        Insert: {
          id?: string;
          patient_id: string;
          document_name: string;
          category: DocumentCategory;
          file_path: string;
          file_type: string;
          file_size: number;
          ai_summary?: Json | null;
          uploaded_at?: string;
          uploaded_by?: string | null;
        };
        Update: {
          id?: string;
          patient_id?: string;
          document_name?: string;
          category?: DocumentCategory;
          file_path?: string;
          file_type?: string;
          file_size?: number;
          ai_summary?: Json | null;
          uploaded_at?: string;
          uploaded_by?: string | null;
        };
      };
      query_letters: {
        Row: {
          id: string;
          patient_id: string;
          file_path: string;
          file_name: string;
          status: QueryLetterStatus;
          error_message: string | null;
          insurer_name: string | null;
          claim_number: string | null;
          extracted_at: string | null;
          matched_at: string | null;
          created_at: string;
          uploaded_by: string | null;
        };
        Insert: {
          id?: string;
          patient_id: string;
          file_path: string;
          file_name: string;
          status?: QueryLetterStatus;
          error_message?: string | null;
          insurer_name?: string | null;
          claim_number?: string | null;
          extracted_at?: string | null;
          matched_at?: string | null;
          created_at?: string;
          uploaded_by?: string | null;
        };
        Update: {
          id?: string;
          patient_id?: string;
          file_path?: string;
          file_name?: string;
          status?: QueryLetterStatus;
          error_message?: string | null;
          insurer_name?: string | null;
          claim_number?: string | null;
          extracted_at?: string | null;
          matched_at?: string | null;
          created_at?: string;
          uploaded_by?: string | null;
        };
      };
      query_points: {
        Row: {
          id: string;
          query_letter_id: string;
          requirement_text: string;
          document_category: string;
          decision_status: DecisionStatus;
          matched_document_id: string | null;
          matched_document_ids: string[];
          evidence_quote: string | null;
          reasoning: string | null;
          confidence: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          query_letter_id: string;
          requirement_text: string;
          document_category: string;
          decision_status?: DecisionStatus;
          matched_document_id?: string | null;
          matched_document_ids?: string[];
          evidence_quote?: string | null;
          reasoning?: string | null;
          confidence?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          query_letter_id?: string;
          requirement_text?: string;
          document_category?: string;
          decision_status?: DecisionStatus;
          matched_document_id?: string | null;
          matched_document_ids?: string[];
          evidence_quote?: string | null;
          reasoning?: string | null;
          confidence?: number | null;
          created_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          patient_id: string;
          query_letter_id: string | null;
          channel: MessageChannel;
          message_content: string;
          delivery_status: MessageDeliveryStatus;
          provider_message_id: string | null;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          query_letter_id?: string | null;
          channel: MessageChannel;
          message_content: string;
          delivery_status?: MessageDeliveryStatus;
          provider_message_id?: string | null;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          query_letter_id?: string | null;
          channel?: MessageChannel;
          message_content?: string;
          delivery_status?: MessageDeliveryStatus;
          provider_message_id?: string | null;
          sent_at?: string | null;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string;
          details?: Json;
          created_at?: string;
        };
      };
    };
  };
}
