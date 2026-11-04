import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { z } from 'zod';

const PatientSchema = z.object({
  patient_code: z.string().min(3, 'Patient code must be at least 3 characters').max(30),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().min(7, 'Invalid phone number format').max(20),
  email: z.string().email('Invalid email address'),
  date_of_birth: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { error: 'Supabase credentials missing. Please set .env.local', code: 'SUPABASE_UNCONFIGURED' },
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
    const search = searchParams.get('search')?.trim();

    let query = supabase
      .from('patients')
      .select('*, documents(id), query_letters(id, status)')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,patient_code.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: patients, error } = (await query) as { data: any[]; error: any };

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const patientsWithStats = (patients || []).map((p: any) => ({
      id: p.id,
      patient_code: p.patient_code,
      name: p.name,
      phone: p.phone,
      email: p.email,
      date_of_birth: p.date_of_birth,
      created_at: p.created_at,
      updated_at: p.updated_at,
      documents_count: p.documents?.length || 0,
      query_letters_count: p.query_letters?.length || 0,
      latest_query_status: p.query_letters?.[0]?.status || null,
    }));

    return NextResponse.json({ patients: patientsWithStats });
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

    const body = await request.json();
    const validation = PatientSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const { patient_code, name, phone, email, date_of_birth } = validation.data;

    // Check for duplicate patient_code
    const { data: existingPatient } = (await supabase
      .from('patients')
      .select('id, patient_code')
      .eq('patient_code', patient_code.trim())
      .single()) as { data: any };

    if (existingPatient) {
      return NextResponse.json(
        { error: `Patient code '${patient_code}' already exists.` },
        { status: 409 }
      );
    }

    // Insert new patient
    const { data: newPatient, error: insertError } = (await supabase
      .from('patients')
      .insert({
        patient_code: patient_code.trim().toUpperCase(),
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        date_of_birth: date_of_birth || null,
      } as any)
      .select()
      .single()) as { data: any; error: any };

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Write audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'CREATE_PATIENT',
      entity_type: 'patient',
      entity_id: newPatient.id,
      details: {
        patient_code: newPatient.patient_code,
        name: newPatient.name,
      },
    } as any);

    return NextResponse.json({ patient: newPatient }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
