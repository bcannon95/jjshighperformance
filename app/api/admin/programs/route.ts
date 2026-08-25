import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const { name, description } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Program name is required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('programs')
    .insert({ name: name.trim(), description: description?.trim() || null })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
