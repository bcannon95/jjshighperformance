import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const workoutId = parseInt(params.id, 10);
  const { data, error } = await supabaseAdmin
    .from('workout_exercises')
    .select('id, exercise_name, sets, reps_min, reps_max, rest_seconds, notes, order_index, exercise_id')
    .eq('workout_def_id', workoutId)
    .order('order_index', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const workoutId = parseInt(params.id, 10);
  const { exercise_name, exercise_id, sets, reps_min, reps_max, rest_seconds, notes } = await req.json();
  if (!exercise_name?.trim()) return NextResponse.json({ error: 'Exercise name is required' }, { status: 400 });

  const { data: existing } = await supabaseAdmin
    .from('workout_exercises')
    .select('order_index')
    .eq('workout_def_id', workoutId)
    .order('order_index', { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.order_index ?? 0) + 1;

  const { data, error } = await supabaseAdmin
    .from('workout_exercises')
    .insert({
      workout_def_id: workoutId,
      exercise_name: exercise_name.trim(),
      exercise_id: exercise_id || null,
      sets: sets ? parseInt(sets) : null,
      reps_min: reps_min ? parseInt(reps_min) : null,
      reps_max: reps_max ? parseInt(reps_max) : null,
      rest_seconds: rest_seconds ? parseInt(rest_seconds) : null,
      notes: notes?.trim() || null,
      order_index: nextOrder,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
