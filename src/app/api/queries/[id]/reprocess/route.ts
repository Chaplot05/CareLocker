import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { runQueryLetterPipeline } from '@/lib/gemini/pipeline';

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

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Check letter exists and prevent duplicate concurrent processing
    const { data: letter, error: fetchError } = (await supabase
      .from('query_letters')
      .select('id, status, file_name')
      .eq('id', id)
      .single()) as { data: any; error: any };

    if (fetchError || !letter) {
      return NextResponse.json({ error: 'Query letter not found' }, { status: 404 });
    }

    if (letter.status === 'extracting' || letter.status === 'matching') {
      return NextResponse.json(
        { error: `Query letter is currently being processed (status: ${letter.status}). Please wait.` },
        { status: 409 }
      );
    }

    // Run pipeline
    const pipelineResult = await runQueryLetterPipeline(id, supabase);

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'REPROCESS_QUERY_LETTER',
      entity_type: 'query_letter',
      entity_id: id,
      details: {
        file_name: letter.file_name,
        result: pipelineResult,
      },
    } as any);

    return NextResponse.json({
      success: pipelineResult.success,
      status: pipelineResult.status,
      pipeline: pipelineResult,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
