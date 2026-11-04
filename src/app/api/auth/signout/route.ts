import { NextResponse } from 'next/server';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

export async function POST() {
  try {
    if (isSupabaseServerConfigured()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

