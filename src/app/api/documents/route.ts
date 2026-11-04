import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { DOCUMENT_CATEGORIES, DocumentCategory } from '@/types/database';
import { analyzePatientDocument } from '@/lib/gemini/documentUnderstanding';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { error: 'Supabase credentials missing', code: 'SUPABASE_UNCONFIGURED' },
        { status: 503 }
      );
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const patient_id = formData.get('patient_id') as string;
    const category = formData.get('category') as DocumentCategory;
    const file = formData.get('file') as File;

    if (!patient_id) {
      return NextResponse.json({ error: 'patient_id is required' }, { status: 400 });
    }

    if (!category || !DOCUMENT_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${DOCUMENT_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Allowed formats: PDF, JPEG, JPG, PNG.' },
        { status: 400 }
      );
    }

    // Validate Size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds 20MB limit (File size: ${(file.size / (1024 * 1024)).toFixed(1)}MB).` },
        { status: 400 }
      );
    }

    // Check that patient exists
    const { data: patient, error: patientError } = (await supabase
      .from('patients')
      .select('id, patient_code')
      .eq('id', patient_id)
      .single()) as { data: any; error: any };

    if (patientError || !patient) {
      return NextResponse.json({ error: 'Patient does not exist' }, { status: 404 });
    }

    // Sanitize filename & create unique storage path
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `patients/${patient.patient_code}/${Date.now()}_${sanitizedName}`;

    // Upload to private Supabase Storage bucket 'patient-documents'
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('patient-documents')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return NextResponse.json(
        { error: `Failed to upload to storage: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Insert metadata into database
    const { data: document, error: dbError } = (await supabase
      .from('documents')
      .insert({
        patient_id,
        document_name: file.name,
        category,
        file_path: storagePath,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: user.id,
      } as any)
      .select()
      .single()) as { data: any; error: any };

    if (dbError) {
      console.error('Database insert error for document:', dbError);
      await supabase.storage.from('patient-documents').remove([storagePath]);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Write audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'UPLOAD_DOCUMENT',
      entity_type: 'document',
      entity_id: document.id,
      details: {
        document_name: file.name,
        category,
        file_size: file.size,
        patient_code: patient.patient_code,
      },
    } as any);

    // Feature 1: Trigger Document Understanding in background (or inline)
    try {
      analyzePatientDocument(document.id, supabase).catch((aiErr) => {
        console.warn('Background AI document analysis notice:', aiErr.message);
      });
    } catch (err) {
      console.warn('Non-blocking AI document analysis trigger error:', err);
    }

    return NextResponse.json({ document }, { status: 201 });
  } catch (err: any) {
    console.error('Document upload API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
