import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    // Fetch query letter with points and messages
    const { data: queryLetter, error } = (await supabase
      .from('query_letters')
      .select('*, patients(id, patient_code, name, email, phone), query_points(*), messages(*)')
      .eq('id', id)
      .single()) as { data: any; error: any };

    if (error || !queryLetter) {
      return NextResponse.json({ error: 'Query letter not found' }, { status: 404 });
    }

    // Generate signed URL for letter preview if needed
    let signedUrl: string | null = null;
    try {
      const { data: signedData } = await supabase.storage
        .from('patient-documents')
        .createSignedUrl(queryLetter.file_path, 300);
      signedUrl = signedData?.signedUrl || null;
    } catch {
      // ignore
    }

    // Fetch all patient documents so we can attach supporting documents to query points
    const { data: patientDocs } = (await supabase
      .from('documents')
      .select('id, document_name, category, file_path, file_size, ai_summary')
      .eq('patient_id', queryLetter.patient_id)) as { data: any[] };

    const docMap = new Map((patientDocs || []).map((d) => [d.id, d]));

    // Attach full supporting document metadata to each query point
    const enrichedQueryPoints = (queryLetter.query_points || []).map((pt: any) => {
      const docIds: string[] = pt.matched_document_ids || (pt.matched_document_id ? [pt.matched_document_id] : []);
      const matched_documents = docIds.map((docId) => docMap.get(docId)).filter(Boolean);
      return {
        ...pt,
        matched_documents,
      };
    });

    return NextResponse.json({
      queryLetter: {
        ...queryLetter,
        signedUrl,
        query_points: enrichedQueryPoints,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Role check: Only admin
    const { data: profile } = (await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()) as { data: any };

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can delete query letters.' },
        { status: 403 }
      );
    }

    const { id } = params;

    const { data: letter } = (await supabase
      .from('query_letters')
      .select('file_path, file_name')
      .eq('id', id)
      .single()) as { data: any };

    if (letter) {
      await supabase.storage.from('patient-documents').remove([letter.file_path]);
    }

    const { error } = await supabase.from('query_letters').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'DELETE_QUERY_LETTER',
      entity_type: 'query_letter',
      entity_id: id,
      details: { file_name: letter?.file_name },
    } as any);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

