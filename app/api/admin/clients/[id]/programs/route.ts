import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const clientId = parseInt(params.id, 10);
  const { program_id, is_main } = body;

  if (!program_id) {
    return NextResponse.json({ error: 'program_id is required' }, { status: 400 });
  }

  // If this is the main program, unset any existing main program first
  if (is_main) {
    await supabaseAdmin
      .from('client_programs')
      .update({ is_main: false })
      .eq('client_id', clientId)
      .eq('is_main', true);
  }

  const { data, error } = await supabaseAdmin
    .from('client_programs')
    .insert({
      client_id: clientId,
      program_id,
      status: 'active',
      is_main: is_main ?? false,
      assigned_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url);
  const programId = searchParams.get('program_id');
  const clientId = parseInt(params.id, 10);

  if (!programId) {
    return NextResponse.json({ error: 'program_id query param required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('client_programs')
    .delete()
    .eq('client_id', clientId)
    .eq('program_id', parseInt(programId, 10));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
