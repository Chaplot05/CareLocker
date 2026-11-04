import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { dispatchQueryNotification } from '@/lib/messaging/dispatcher';

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
      return NextResponse.json({ error: 'Unauthorized: Authentication required.' }, { status: 401 });
    }

    const body = await request.json();
    const { query_letter_id, channel, force = true } = body;

    if (!query_letter_id) {
      return NextResponse.json({ error: 'query_letter_id is required' }, { status: 400 });
    }

    const result = await dispatchQueryNotification({
      queryLetterId: query_letter_id,
      force,
      channelToRetry: channel,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    console.error('Send message API error:', err);
    return NextResponse.json({ error: err.message || 'Failed to dispatch notification' }, { status: 500 });
  }
}

