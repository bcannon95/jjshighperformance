import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('calendar_events')
    .select('id, client_id, event_type, workout_def_id, scheduled_date, completed_at, status, rpe_rating, notes, client_program_id')
    .order('scheduled_date', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { client_id, event_type, scheduled_date, notes } = await req.json();

  if (!client_id || !scheduled_date) {
    return NextResponse.json({ error: 'client_id and scheduled_date are required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('calendar_events')
    .insert({
      client_id,
      event_type: event_type || 'workout',
      scheduled_date,
      status: 'scheduled',
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
