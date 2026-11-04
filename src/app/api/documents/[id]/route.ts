import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

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

    const { data: document, error } = (await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single()) as { data: any; error: any };

    if (error || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Generate temporary signed URL (valid for 300 seconds / 5 minutes)
    const { data: signedData, error: signedError } = await supabase.storage
      .from('patient-documents')
      .createSignedUrl(document.file_path, 300);

    if (signedError || !signedData) {
      return NextResponse.json(
        { error: `Could not generate signed URL: ${signedError?.message}` },
        { status: 500 }
      );
    }

    // Audit log document view
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'VIEW_DOCUMENT',
      entity_type: 'document',
      entity_id: id,
      details: {
        document_name: document.document_name,
      },
    } as any);

    return NextResponse.json({
      signedUrl: signedData.signedUrl,
      document,
      expiresIn: 300,
    });
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

    // Verify user has authorized staff role (admin or agent)
    const { data: profile } = (await supabase
      .from('profiles')
      .select('role, full_name, email')
      .eq('id', user.id)
      .single()) as { data: any };

    const role = profile?.role;
    if (role !== 'admin' && role !== 'agent') {
      return NextResponse.json(
        { error: 'Forbidden: Only authenticated staff (admin/agent) are authorized to delete documents.' },
        { status: 403 }
      );
    }

    const { id } = params;

    // Fetch document details before deletion
    const { data: document, error: fetchError } = (await supabase
      .from('documents')
      .select(`
        id,
        patient_id,
        document_name,
        category,
        file_path,
        file_size,
        patients (
          id,
          name,
          patient_code
        )
      `)
      .eq('id', id)
      .single()) as { data: any; error: any };

    if (fetchError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // STEP 1: Delete file from private Supabase Storage bucket FIRST
    // Per requirement: Do not remove the database record if storage deletion fails
    const { error: storageError } = await supabase.storage
      .from('patient-documents')
      .remove([document.file_path]);

    if (storageError) {
      console.error('[Document Deletion] Storage removal failed:', storageError);
      return NextResponse.json(
        {
          error: `Storage file deletion failed: ${storageError.message}. Database record was preserved.`,
        },
        { status: 500 }
      );
    }

    // STEP 2: Delete database record from documents table
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[Document Deletion] DB record deletion failed:', deleteError);
      return NextResponse.json(
        { error: `Database deletion failed: ${deleteError.message}` },
        { status: 500 }
      );
    }

    // STEP 3: Check if document was used as evidence in query_points and mark affected matches as needs_review
    let affectedPointsCount = 0;
    try {
      // Find any query points referencing this document
      const { data: queryPoints } = (await supabase
        .from('query_points')
        .select('id, query_letter_id, matched_document_id, matched_document_ids, decision_status, reasoning')) as {
        data: any[];
      };

      if (queryPoints && queryPoints.length > 0) {
        const affectedPoints = queryPoints.filter((qp) => {
          const isSingleMatch = qp.matched_document_id === id;
          const isMultiMatch = Array.isArray(qp.matched_document_ids) && qp.matched_document_ids.includes(id);
          return isSingleMatch || isMultiMatch;
        });

        affectedPointsCount = affectedPoints.length;

        for (const point of affectedPoints) {
          const remainingMatches = Array.isArray(point.matched_document_ids)
            ? point.matched_document_ids.filter((docId: string) => docId !== id)
            : [];

          const updatedReasoning = point.reasoning
            ? `${point.reasoning} [Notice: Supporting document "${document.document_name}" was deleted on ${new Date().toISOString().split('T')[0]}. Verification required.]`
            : `[Notice: Supporting document "${document.document_name}" was deleted. Verification required.]`;

          await supabase
            .from('query_points')
            .update({
              decision_status: 'needs_review',
              matched_document_id: remainingMatches.length > 0 ? remainingMatches[0] : null,
              matched_document_ids: remainingMatches,
              reasoning: updatedReasoning,
            } as any)
            .eq('id', point.id);

          // Update parent query letter status if completed to ensure visibility
          if (point.query_letter_id) {
            await supabase
              .from('query_letters')
              .update({
                error_message: `Evidence document "${document.document_name}" deleted by staff. Review required.`,
              } as any)
              .eq('id', point.query_letter_id);
          }
        }
      }
    } catch (queryErr) {
      console.warn('[Document Deletion] Error checking affected query matches:', queryErr);
    }

    // STEP 4: Record audit log with actor, patient, and document details
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'DELETE_DOCUMENT',
      entity_type: 'document',
      entity_id: id,
      details: {
        document_name: document.document_name,
        category: document.category,
        file_path: document.file_path,
        patient_id: document.patient_id,
        patient_name: document.patients?.name,
        patient_code: document.patients?.patient_code,
        actor_email: user.email,
        actor_role: role,
        affected_query_points: affectedPointsCount,
        timestamp: new Date().toISOString(),
      },
    } as any);

    return NextResponse.json({
      success: true,
      message: `Document "${document.document_name}" was permanently deleted.`,
      affectedQueryPoints: affectedPointsCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
