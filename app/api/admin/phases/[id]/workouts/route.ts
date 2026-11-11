import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const phaseId = parseInt(params.id, 10);
  const { data, error } = await supabaseAdmin
    .from('workout_definitions')
    .select('id, name, description, est_duration_min')
    .eq('training_phase_id', phaseId)
    .order('id', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const phaseId = parseInt(params.id, 10);
  const { name, description, est_duration_min } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('workout_definitions')
    .insert({
      training_phase_id: phaseId,
      name: name.trim(),
      description: description?.trim() || null,
      est_duration_min: est_duration_min ? parseInt(est_duration_min) : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
