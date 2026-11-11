import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const clientProgramId = parseInt(params.id, 10);
  const { data, error } = await supabaseAdmin
    .from('training_phases')
    .select('id, name, start_date, end_date, order_index, week_count')
    .eq('client_program_id', clientProgramId)
    .order('order_index', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const clientProgramId = parseInt(params.id, 10);
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const { data: existing } = await supabaseAdmin
    .from('training_phases')
    .select('order_index')
    .eq('client_program_id', clientProgramId)
    .order('order_index', { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.order_index ?? 0) + 1;

  const { data, error } = await supabaseAdmin
    .from('training_phases')
    .insert({ client_program_id: clientProgramId, name: name.trim(), order_index: nextOrder })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
