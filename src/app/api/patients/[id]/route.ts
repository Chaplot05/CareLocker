import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { z } from 'zod';

const UpdatePatientSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().min(7).max(20).optional(),
  email: z.string().email().optional(),
  date_of_birth: z.string().nullable().optional(),
});

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

    // Fetch patient with all related entities
    const { data: patient, error } = (await supabase
      .from('patients')
      .select(`
        *,
        documents (*),
        query_letters (
          *,
          query_points (*)
        ),
        messages (*)
      `)
      .eq('id', id)
      .single()) as { data: any; error: any };

    if (error || !patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Enrich query points with matched supporting documents
    const docMap = new Map((patient.documents || []).map((d: any) => [d.id, d]));
    const enrichedQueryLetters = (patient.query_letters || []).map((letter: any) => ({
      ...letter,
      query_points: (letter.query_points || []).map((pt: any) => {
        const docIds: string[] = pt.matched_document_ids || (pt.matched_document_id ? [pt.matched_document_id] : []);
        const matched_documents = docIds.map((docId) => docMap.get(docId)).filter(Boolean);
        return {
          ...pt,
          matched_documents,
        };
      }),
    }));

    // Fetch audit logs for this patient
    const { data: auditLogs } = (await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_id', id)
      .order('created_at', { ascending: false })) as { data: any[] };

    return NextResponse.json({
      patient: {
        ...patient,
        query_letters: enrichedQueryLetters,
        audit_logs: auditLogs || [],
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
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
    const body = await request.json();
    const validation = UpdatePatientSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const { data: updatedPatient, error } = (await supabase
      .from('patients')
      .update({
        ...validation.data,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', id)
      .select()
      .single()) as { data: any; error: any };

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Write audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'UPDATE_PATIENT',
      entity_type: 'patient',
      entity_id: id,
      details: validation.data,
    } as any);

    return NextResponse.json({ patient: updatedPatient });
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

    // Role check: Only admin can delete patients
    const { data: profile } = (await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()) as { data: any };

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can delete patient records.' },
        { status: 403 }
      );
    }

    const { id } = params;

    const { error } = await supabase.from('patients').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Write audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'DELETE_PATIENT',
      entity_type: 'patient',
      entity_id: id,
      details: { deleted_at: new Date().toISOString() },
    } as any);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
