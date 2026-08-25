import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const { first_name, last_name, email, role } = await req.json();

  if (!first_name || !last_name || !email) {
    return NextResponse.json({ error: 'first_name, last_name and email are required' }, { status: 400 });
  }

  // Check if trainer with this email already exists
  const { data: existing } = await supabaseAdmin
    .from('trainers')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'A team member with this email already exists' }, { status: 409 });
  }

  // Invite via Supabase auth — sends a setup email
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  // Create trainers row linked to the auth user
  const { error: dbError } = await supabaseAdmin.from('trainers').insert({
    first_name,
    last_name,
    email,
    role: role || 'trainer',
    auth_user_id: authData.user.id,
  });

  if (dbError) {
    // Roll back auth user so we don't leave orphans
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
