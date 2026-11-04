import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { analyzePatientDocument } from '@/lib/gemini/documentUnderstanding';

export async function POST(
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

    // 1. Authenticate user
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required.' }, { status: 401 });
    }

    // 2. Verify authenticated staff role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Forbidden: Valid staff profile required.' },
        { status: 403 }
      );
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Document ID is required.' }, { status: 400 });
    }

    // 3. Verify document existence and patient association
    const adminSupabase = createAdminClient();
    const { data: document, error: docError } = await adminSupabase
      .from('documents')
      .select('id, patient_id, document_name')
      .eq('id', id)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: `Document not found: ${docError?.message || id}` },
        { status: 404 }
      );
    }

    // 4. Perform AI analysis & securely persist summary
    const result = await analyzePatientDocument(id, adminSupabase);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to analyze document',
          summary: result.summary,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      summary: result.summary,
      document: result.document,
    });
  } catch (err: any) {
    console.error('Analyze API route unhandled error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
