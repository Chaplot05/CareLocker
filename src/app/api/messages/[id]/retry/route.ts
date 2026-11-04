import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { dispatchQueryNotification } from '@/lib/messaging/dispatcher';

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
      return NextResponse.json({ error: 'Unauthorized: Authentication required.' }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { data: message, error } = await adminSupabase
      .from('messages')
      .select('id, query_letter_id, channel, delivery_status')
      .eq('id', id)
      .single();

    if (error || !message || !message.query_letter_id) {
      return NextResponse.json({ error: 'Message or associated query letter not found' }, { status: 404 });
    }

    const result = await dispatchQueryNotification({
      queryLetterId: message.query_letter_id,
      force: true,
      channelToRetry: message.channel as 'WhatsApp' | 'Email',
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    console.error('Retry message API error:', err);
    return NextResponse.json({ error: err.message || 'Failed to retry message' }, { status: 500 });
  }
}

