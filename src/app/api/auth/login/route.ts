import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        {
          error:
            'Supabase is not configured yet. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.',
          code: 'SUPABASE_UNCONFIGURED',
        },
        { status: 503 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Retrieve staff profile and role
    const { data: profile } = (await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()) as { data: any; error: any };

    if (!profile) {
      // If profile doesn't exist, try creating fallback agent profile
      const { data: newProfile } = (await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: authData.user.user_metadata?.full_name || email.split('@')[0],
          email: authData.user.email || email,
          role: 'agent',
        } as any)
        .select()
        .single()) as { data: any };

      return NextResponse.json({
        user: authData.user,
        profile: newProfile || {
          id: authData.user.id,
          full_name: email.split('@')[0],
          email,
          role: 'agent',
        },
      });
    }

    return NextResponse.json({
      user: authData.user,
      profile,
    });
  } catch (err: any) {
    console.error('Login API error:', err);
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred during login.' },
      { status: 500 }
    );
  }
}
