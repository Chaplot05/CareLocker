import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { runQueryLetterPipeline } from '@/lib/gemini/pipeline';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const patient_id = searchParams.get('patient_id');

    let query = supabase
      .from('query_letters')
      .select('*, patients(id, patient_code, name), query_points(*), messages(*)')
      .order('created_at', { ascending: false });

    if (patient_id) {
      query = query.eq('patient_id', patient_id);
    }

    const { data: queryLetters, error } = (await query) as { data: any[]; error: any };

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ queryLetters: queryLetters || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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
    const file = formData.get('file') as File;
    const insurer_name = (formData.get('insurer_name') as string) || null;
    const claim_number = (formData.get('claim_number') as string) || null;

    if (!patient_id) {
      return NextResponse.json({ error: 'patient_id is required' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: 'Query letter file is required' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Allowed: PDF, JPG, JPEG, PNG.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds 20MB limit (File size: ${(file.size / (1024 * 1024)).toFixed(1)}MB).` },
        { status: 400 }
      );
    }

    // Verify patient exists
    const { data: patient, error: patientError } = (await supabase
      .from('patients')
      .select('id, patient_code, name')
      .eq('id', patient_id)
      .single()) as { data: any; error: any };

    if (patientError || !patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Upload to private storage
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `queries/${patient.patient_code}/${Date.now()}_${sanitizedName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('patient-documents')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Query storage upload error:', uploadError);
      return NextResponse.json(
        { error: `Failed to upload to storage: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Insert into query_letters table
    const { data: queryLetter, error: dbError } = (await supabase
      .from('query_letters')
      .insert({
        patient_id,
        file_path: storagePath,
        file_name: file.name,
        insurer_name,
        claim_number,
        status: 'uploaded',
        uploaded_by: user.id,
      } as any)
      .select()
      .single()) as { data: any; error: any };

    if (dbError) {
      await supabase.storage.from('patient-documents').remove([storagePath]);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Write audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'UPLOAD_QUERY_LETTER',
      entity_type: 'query_letter',
      entity_id: queryLetter.id,
      details: {
        file_name: file.name,
        patient_code: patient.patient_code,
        insurer: insurer_name,
      },
    } as any);

    // Feature 2: Automatically trigger processing pipeline
    // Run pipeline (can execute inline or non-blocking)
    try {
      // Run the pipeline to extract and match
      const pipelineResult = await runQueryLetterPipeline(queryLetter.id, supabase);
      return NextResponse.json(
        {
          queryLetter: {
            ...queryLetter,
            status: pipelineResult.status,
          },
          pipeline: pipelineResult,
        },
        { status: 201 }
      );
    } catch (pipelineErr: any) {
      console.warn('Pipeline execution encountered warning:', pipelineErr.message);
      return NextResponse.json(
        {
          queryLetter,
          pipeline: { success: false, error: pipelineErr.message },
        },
        { status: 201 }
      );
    }
  } catch (err: any) {
    console.error('Query upload API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

