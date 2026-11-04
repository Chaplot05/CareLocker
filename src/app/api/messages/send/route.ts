import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
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
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { query_letter_id, channel, force = true } = body;

    if (!query_letter_id) {
      return NextResponse.json(
        { error: 'query_letter_id is required' },
        { status: 400 }
      );
    }

    // Accidental double-send throttle: check if a message for this channel was sent in the last 15 seconds
    const adminSupabase = createAdminClient();
    const { data: recentMessages } = await adminSupabase
      .from('messages')
      .select('id, channel, delivery_status, sent_at, provider_message_id')
      .eq('query_letter_id', query_letter_id)
      .order('created_at', { ascending: false })
      .limit(5);

    const matchingMsg = (recentMessages || []).find(
      (m: any) => (!channel || m.channel === channel) && m.delivery_status === 'sent' && m.sent_at
    );

    if (matchingMsg && matchingMsg.sent_at) {
      const sentTime = new Date(matchingMsg.sent_at).getTime();
      const now = Date.now();
      const elapsedSeconds = (now - sentTime) / 1000;

      // If sent within the last 15 seconds and not explicitly re-confirmed, protect from rapid accidental clicks
      if (elapsedSeconds < 15 && !body.allow_rapid_resend) {
        return NextResponse.json(
          {
            error: `An email was already sent ${Math.round(elapsedSeconds)} seconds ago (Message ID: ${matchingMsg.provider_message_id}). Please wait a moment before sending another.`,
            code: 'RATE_LIMIT_DUPLICATE_PROTECTION',
            recentMessageId: matchingMsg.provider_message_id,
          },
          { status: 429 }
        );
      }
    }

    const result = await dispatchQueryNotification({
      queryLetterId: query_letter_id,
      force,
      channelToRetry: channel,
    });

    // Write audit log
    await adminSupabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'MANUAL_DISPATCH_NOTIFICATION',
      entity_type: 'query_letter',
      entity_id: query_letter_id,
      details: {
        channel: channel || 'All',
        result,
      },
    } as any);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    console.error('Send message API error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to dispatch notification' },
      { status: 500 }
    );
  }
}
