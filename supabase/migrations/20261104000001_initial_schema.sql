-- CareLocker Database Schema Migration: Stage 1
-- Enables UUID generation and sets up initial schema, RLS, triggers, and storage

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Staff members: Admin & Agent)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. PATIENTS TABLE
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  date_of_birth DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'Discharge Summary',
    'Hospital Bill',
    'Investigation Reports',
    'Policy Copy',
    'KYC',
    'Consultation Papers',
    'Pharmacy Bills',
    'Cancelled Cheque',
    'Other'
  )),
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  ai_summary JSONB DEFAULT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 4. QUERY LETTERS TABLE
CREATE TABLE IF NOT EXISTS public.query_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 5. QUERY POINTS TABLE
CREATE TABLE IF NOT EXISTS public.query_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_letter_id UUID NOT NULL REFERENCES public.query_letters(id) ON DELETE CASCADE,
  requirement_text TEXT NOT NULL,
  document_category TEXT NOT NULL,
  decision_status TEXT NOT NULL DEFAULT 'needs_review' CHECK (decision_status IN ('available', 'missing', 'needs_review')),
  matched_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  evidence_quote TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  query_letter_id UUID REFERENCES public.query_letters(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('WhatsApp', 'Email')),
  message_content TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'queued' CHECK (delivery_status IN ('queued', 'sent', 'delivered', 'failed')),
  provider_message_id TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- INDEXES for Query Performance
CREATE INDEX IF NOT EXISTS idx_patients_code ON public.patients (patient_code);
CREATE INDEX IF NOT EXISTS idx_patients_name ON public.patients (name);
CREATE INDEX IF NOT EXISTS idx_patients_email ON public.patients (email);
CREATE INDEX IF NOT EXISTS idx_documents_patient_id ON public.documents (patient_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents (category);
CREATE INDEX IF NOT EXISTS idx_query_letters_patient_id ON public.query_letters (patient_id);
CREATE INDEX IF NOT EXISTS idx_query_points_letter_id ON public.query_points (query_letter_id);
CREATE INDEX IF NOT EXISTS idx_messages_patient_id ON public.messages (patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

-- Automatic Profile Creation Trigger on Supabase Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'agent')
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles: Authenticated staff can view all profiles; users can update their own profile; admins can update any.
CREATE POLICY "Profiles readable by authenticated staff"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile or admin can update any"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

-- Patients: Authenticated staff (admin & agent) can read, insert, update
CREATE POLICY "Patients readable by authenticated staff"
  ON public.patients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Patients insertable by authenticated staff"
  ON public.patients FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Patients updatable by authenticated staff"
  ON public.patients FOR UPDATE
  TO authenticated
  USING (auth.role() = 'authenticated');

CREATE POLICY "Patients deletable only by admin"
  ON public.patients FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Documents: Authenticated staff can view and insert documents; only Admin can delete
CREATE POLICY "Documents readable by authenticated staff"
  ON public.documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Documents insertable by authenticated staff"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Documents deletable by admin"
  ON public.documents FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Query Letters: Authenticated staff
CREATE POLICY "Query letters readable by authenticated staff"
  ON public.query_letters FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Query letters insertable by authenticated staff"
  ON public.query_letters FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

-- Query Points: Authenticated staff
CREATE POLICY "Query points readable by authenticated staff"
  ON public.query_points FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Query points insertable by authenticated staff"
  ON public.query_points FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

-- Messages: Authenticated staff
CREATE POLICY "Messages readable by authenticated staff"
  ON public.messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Messages insertable by authenticated staff"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

-- Audit Logs: Authenticated staff can read; anyone authenticated can insert
CREATE POLICY "Audit logs readable by authenticated staff"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Audit logs insertable by authenticated staff"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

-- STORAGE BUCKET CONFIGURATION (Private 'patient-documents' bucket)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'patient-documents',
  'patient-documents',
  false,
  20971520, -- 20MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 20971520,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

-- Storage RLS: Authenticated users can upload and read; admins can delete
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'patient-documents');

DROP POLICY IF EXISTS "Authenticated users can read documents" ON storage.objects;
CREATE POLICY "Authenticated users can read documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'patient-documents');

DROP POLICY IF EXISTS "Admins can delete documents" ON storage.objects;
CREATE POLICY "Admins can delete documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'patient-documents' AND public.is_admin());

