-- CareLocker Database Schema Migration: Stage 2
-- Extends query letters and query points for Gemini AI Extraction & Multi-document Matching

-- 1. Update Query Letter Status constraint to include 'extracting' and 'matching'
ALTER TABLE public.query_letters DROP CONSTRAINT IF EXISTS query_letters_status_check;
ALTER TABLE public.query_letters 
  ADD CONSTRAINT query_letters_status_check 
  CHECK (status IN ('uploaded', 'extracting', 'matching', 'completed', 'failed'));

-- 2. Add error_message, insurer_name, claim_number and processing timestamps to query_letters
ALTER TABLE public.query_letters
  ADD COLUMN IF NOT EXISTS error_message TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS insurer_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS claim_number TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS extracted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS matched_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Update query_points to support multiple matched documents, reasoning and confidence
ALTER TABLE public.query_points
  ADD COLUMN IF NOT EXISTS matched_document_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reasoning TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS confidence NUMERIC DEFAULT 1.0;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_query_points_status ON public.query_points (decision_status);
CREATE INDEX IF NOT EXISTS idx_query_points_matched_doc ON public.query_points (matched_document_id);
CREATE INDEX IF NOT EXISTS idx_query_letters_status ON public.query_letters (status);

-- 5. Helper trigger to synchronize matched_document_ids with single matched_document_id for backwards compatibility
CREATE OR REPLACE FUNCTION public.sync_query_point_docs()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.matched_document_id IS NOT NULL AND NOT (NEW.matched_document_ids @> ARRAY[NEW.matched_document_id]) THEN
    NEW.matched_document_ids := array_append(NEW.matched_document_ids, NEW.matched_document_id);
  ELSIF (NEW.matched_document_id IS NULL) AND array_length(NEW.matched_document_ids, 1) > 0 THEN
    NEW.matched_document_id := NEW.matched_document_ids[1];
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_query_point_docs ON public.query_points;
CREATE TRIGGER trg_sync_query_point_docs
  BEFORE INSERT OR UPDATE ON public.query_points
  FOR EACH ROW EXECUTE FUNCTION public.sync_query_point_docs();
