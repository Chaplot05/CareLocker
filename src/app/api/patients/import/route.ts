import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { z } from 'zod';

const PatientRowSchema = z.object({
  patient_code: z.string().min(2, 'Code required').max(30),
  name: z.string().min(2, 'Name required').max(100),
  phone: z.string().min(7, 'Invalid phone').max(20),
  email: z.string().email('Invalid email address'),
  date_of_birth: z.string().optional().nullable(),
});

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

    const { rows } = await request.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No data rows provided for import' }, { status: 400 });
    }

    const validPatients: any[] = [];
    const errors: { row: number; patient_code?: string; error: string }[] = [];
    const seenCodesInBatch = new Set<string>();

    // Fetch existing patient codes from database for conflict prevention
    const { data: existingRecords } = (await supabase
      .from('patients')
      .select('patient_code')) as { data: any[] };

    const existingCodesInDb = new Set((existingRecords || []).map((r) => r.patient_code.toUpperCase()));

    rows.forEach((rawRow, index) => {
      const rowNum = index + 1;
      const normalizedRow = {
        patient_code: (rawRow.patient_code || rawRow.PatientCode || rawRow['Patient ID'] || rawRow['patient_id'] || '').trim().toUpperCase(),
        name: (rawRow.name || rawRow.Name || rawRow['Patient Name'] || '').trim(),
        phone: (rawRow.phone || rawRow.Phone || rawRow['Phone Number'] || rawRow['Contact'] || '').trim(),
        email: (rawRow.email || rawRow.Email || '').trim().toLowerCase(),
        date_of_birth: (rawRow.date_of_birth || rawRow.DOB || rawRow['Date of Birth'] || null)?.trim() || null,
      };

      const parsed = PatientRowSchema.safeParse(normalizedRow);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        errors.push({ row: rowNum, patient_code: normalizedRow.patient_code, error: errorMsg });
        return;
      }

      if (seenCodesInBatch.has(normalizedRow.patient_code)) {
        errors.push({
          row: rowNum,
          patient_code: normalizedRow.patient_code,
          error: `Duplicate patient code within CSV file: ${normalizedRow.patient_code}`,
        });
        return;
      }

      if (existingCodesInDb.has(normalizedRow.patient_code)) {
        errors.push({
          row: rowNum,
          patient_code: normalizedRow.patient_code,
          error: `Patient code already exists in database: ${normalizedRow.patient_code}`,
        });
        return;
      }

      seenCodesInBatch.add(normalizedRow.patient_code);
      validPatients.push(normalizedRow);
    });

    if (validPatients.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid records to import. Review row errors below.',
          insertedCount: 0,
          errors,
        },
        { status: 400 }
      );
    }

    // Insert valid batch
    const { data: inserted, error: insertError } = (await supabase
      .from('patients')
      .insert(validPatients as any)
      .select()) as { data: any[]; error: any };

    if (insertError) {
      return NextResponse.json({ error: insertError.message, errors }, { status: 500 });
    }

    // Write audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'CSV_IMPORT_PATIENTS',
      entity_type: 'patient',
      entity_id: 'batch',
      details: {
        count: inserted?.length || 0,
        errors_count: errors.length,
      },
    } as any);

    return NextResponse.json({
      success: true,
      insertedCount: inserted?.length || 0,
      errorsCount: errors.length,
      errors,
      patients: inserted,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
