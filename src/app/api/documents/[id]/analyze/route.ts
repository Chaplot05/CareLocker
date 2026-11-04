import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
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

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const result = await analyzePatientDocument(id, supabase);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to analyze document', summary: result.summary },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, summary: result.summary });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

