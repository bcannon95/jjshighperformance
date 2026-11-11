import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function DELETE(_req: Request, { params }: { params: { id: string; exId: string } }) {
  const exId = parseInt(params.exId, 10);
  const { error } = await supabaseAdmin.from('workout_exercises').delete().eq('id', exId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
