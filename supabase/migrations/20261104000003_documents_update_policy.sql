-- CareLocker Database Schema Migration: Add UPDATE policy for documents table
-- Enables authenticated staff to update document metadata and AI summary

CREATE POLICY "Documents updatable by authenticated staff"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

