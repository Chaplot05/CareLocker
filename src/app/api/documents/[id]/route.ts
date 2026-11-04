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

    // Verify user is Admin
    const { data: profile } = (await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()) as { data: any };

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators are authorized to delete documents.' },
        { status: 403 }
      );
    }

    const { id } = params;

    const { data: document, error: fetchError } = (await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single()) as { data: any; error: any };

    if (fetchError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Remove from storage bucket
    const { error: storageError } = await supabase.storage
      .from('patient-documents')
      .remove([document.file_path]);

    if (storageError) {
      console.warn('Storage file deletion warning:', storageError.message);
    }

    // Delete row from database
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Record audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'DELETE_DOCUMENT',
      entity_type: 'document',
      entity_id: id,
      details: {
        document_name: document.document_name,
        category: document.category,
      },
    } as any);

    return NextResponse.json({ success: true, message: 'Document deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
