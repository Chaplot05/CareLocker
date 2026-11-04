-- CareLocker Synthetic Seed Data for Development & Testing
-- Realistic Indian TPA / Health Insurance Query Cases

-- Clear existing data if re-seeding (respecting FK constraints)
-- Note: Profiles are created when auth users are created.

-- Synthetic Patients
INSERT INTO public.patients (id, patient_code, name, phone, email, date_of_birth, created_at)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'PAT-2026-001', 'Rajesh Sharma', '+91 98201 44521', 'rajesh.sharma@example.com', '1982-04-12', NOW() - INTERVAL '10 days'),
  ('a2222222-2222-2222-2222-222222222222', 'PAT-2026-002', 'Priya Iyer', '+91 94451 22980', 'priya.iyer@example.com', '1990-09-25', NOW() - INTERVAL '8 days'),
  ('a3333333-3333-3333-3333-333333333333', 'PAT-2026-003', 'Vikramaditya Rao', '+91 98840 91823', 'vikram.rao@example.com', '1975-11-03', NOW() - INTERVAL '5 days'),
  ('a4444444-4444-4444-4444-444444444444', 'PAT-2026-004', 'Sunita Patel', '+91 97234 11209', 'sunita.patel@example.com', '1988-01-19', NOW() - INTERVAL '3 days'),
  ('a5555555-5555-5555-5555-555555555555', 'PAT-2026-005', 'Arjun Sengupta', '+91 98300 76543', 'arjun.sengupta@example.com', '1995-07-08', NOW() - INTERVAL '1 day')
ON CONFLICT (patient_code) DO NOTHING;

-- Synthetic Documents
INSERT INTO public.documents (id, patient_id, document_name, category, file_path, file_type, file_size, uploaded_at)
VALUES
  (
    'd1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'Discharge_Summary_MaxHealthcare.pdf',
    'Discharge Summary',
    'patients/PAT-2026-001/Discharge_Summary_MaxHealthcare.pdf',
    'application/pdf',
    1845200,
    NOW() - INTERVAL '9 days'
  ),
  (
    'd2222222-2222-2222-2222-222222222222',
    'a1111111-1111-1111-1111-111111111111',
    'Final_Consolidated_Bill_Breakup.pdf',
    'Hospital Bill',
    'patients/PAT-2026-001/Final_Consolidated_Bill_Breakup.pdf',
    'application/pdf',
    924500,
    NOW() - INTERVAL '9 days'
  ),
  (
    'd3333333-3333-3333-3333-333333333333',
    'a1111111-1111-1111-1111-111111111111',
    'CBC_Biochemistry_Lab_Report.pdf',
    'Investigation Reports',
    'patients/PAT-2026-001/CBC_Biochemistry_Lab_Report.pdf',
    'application/pdf',
    451200,
    NOW() - INTERVAL '8 days'
  ),
  (
    'd4444444-4444-4444-4444-444444444444',
    'a2222222-2222-2222-2222-222222222222',
    'Aadhar_Card_KYC.jpg',
    'KYC',
    'patients/PAT-2026-002/Aadhar_Card_KYC.jpg',
    'image/jpeg',
    820400,
    NOW() - INTERVAL '7 days'
  ),
  (
    'd5555555-5555-5555-5555-555555555555',
    'a2222222-2222-2222-2222-222222222222',
    'HDFC_Ergo_Policy_Certificate.pdf',
    'Policy Copy',
    'patients/PAT-2026-002/HDFC_Ergo_Policy_Certificate.pdf',
    'application/pdf',
    1240100,
    NOW() - INTERVAL '6 days'
  ),
  (
    'd6666666-6666-6666-6666-666666666666',
    'a3333333-3333-3333-3333-333333333333',
    'Cancelled_Cheque_HDFC.png',
    'Cancelled Cheque',
    'patients/PAT-2026-003/Cancelled_Cheque_HDFC.png',
    'image/png',
    610500,
    NOW() - INTERVAL '4 days'
  )
ON CONFLICT (id) DO NOTHING;

-- Synthetic Query Letters (from Star Health / Medi Assist / Care Health)
INSERT INTO public.query_letters (id, patient_id, file_path, file_name, insurer_name, claim_number, status, created_at)
VALUES
  (
    'q1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'queries/PAT-2026-001/StarHealth_QueryLetter_Claim_40912.pdf',
    'StarHealth_QueryLetter_Claim_40912.pdf',
    'Star Health & Allied Insurance',
    'CIR-40912-A',
    'completed',
    NOW() - INTERVAL '4 days'
  ),
  (
    'q2222222-2222-2222-2222-222222222222',
    'a2222222-2222-2222-2222-222222222222',
    'queries/PAT-2026-002/MediAssist_Query_Clarification_Req.pdf',
    'MediAssist_Query_Clarification_Req.pdf',
    'Medi Assist TPA',
    'MED-88129',
    'completed',
    NOW() - INTERVAL '2 days'
  )
ON CONFLICT (id) DO NOTHING;

-- Synthetic Query Points with Multi-document Support and Reasoning
INSERT INTO public.query_points (id, query_letter_id, requirement_text, document_category, decision_status, matched_document_id, matched_document_ids, evidence_quote, reasoning, confidence)
VALUES
  (
    'p1111111-1111-1111-1111-111111111111',
    'q1111111-1111-1111-1111-111111111111',
    'Provide complete indoor case papers and operative notes for laparoscopic cholecystectomy.',
    'Investigation Reports',
    'missing',
    NULL,
    '{}',
    NULL,
    'No surgical operative notes or indoor registrar records exist in the patient locker.',
    0.98
  ),
  (
    'p2222222-2222-2222-2222-222222222222',
    'q1111111-1111-1111-1111-111111111111',
    'Itemized pharmacy bill with doctor prescriptions.',
    'Pharmacy Bills',
    'missing',
    NULL,
    '{}',
    NULL,
    'Itemized pharmacy breakup invoices are absent from the patient document vault.',
    0.99
  ),
  (
    'p3333333-3333-3333-3333-333333333333',
    'q1111111-1111-1111-1111-111111111111',
    'Signed discharge summary mentioning duration of symptoms and previous medical history.',
    'Discharge Summary',
    'available',
    'd1111111-1111-1111-1111-111111111111',
    ARRAY['d1111111-1111-1111-1111-111111111111']::uuid[],
    'Matched Discharge_Summary_MaxHealthcare.pdf: Diagnoses: Acute Calculus Cholecystitis, Hypertension. Signed by Dr. Vivek Mehra.',
    'Discharge summary satisfies the requirement with physician signature and symptom timeline.',
    0.97
  )
ON CONFLICT (id) DO NOTHING;

-- Synthetic Messages
INSERT INTO public.messages (id, patient_id, query_letter_id, channel, message_content, delivery_status, sent_at)
VALUES
  (
    'm1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'q1111111-1111-1111-1111-111111111111',
    'WhatsApp',
    'Dear Rajesh Sharma, Star Health has raised a query regarding your claim. Please provide your Operative Notes & Itemized Pharmacy Bills to avoid claim rejection. Reply with photos or upload via CareLocker.',
    'sent',
    NOW() - INTERVAL '3 days'
  )
ON CONFLICT (id) DO NOTHING;

-- Synthetic Audit Logs
INSERT INTO public.audit_logs (action, entity_type, entity_id, details, created_at)
VALUES
  ('CREATE_PATIENT', 'patient', 'a1111111-1111-1111-1111-111111111111', '{"name": "Rajesh Sharma", "code": "PAT-2026-001"}'::jsonb, NOW() - INTERVAL '10 days'),
  ('UPLOAD_DOCUMENT', 'document', 'd1111111-1111-1111-1111-111111111111', '{"filename": "Discharge_Summary_MaxHealthcare.pdf", "category": "Discharge Summary"}'::jsonb, NOW() - INTERVAL '9 days'),
  ('UPLOAD_DOCUMENT', 'document', 'd2222222-2222-2222-2222-222222222222', '{"filename": "Final_Consolidated_Bill_Breakup.pdf", "category": "Hospital Bill"}'::jsonb, NOW() - INTERVAL '9 days'),
  ('UPLOAD_QUERY_LETTER', 'query_letter', 'q1111111-1111-1111-1111-111111111111', '{"insurer": "Star Health", "claim_id": "40912"}'::jsonb, NOW() - INTERVAL '4 days');

