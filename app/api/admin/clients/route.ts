import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { first_name, last_name, email, trainer_id, location_id, status, account_type } = body;

  if (!email || !first_name || !last_name) {
    return NextResponse.json({ error: 'first_name, last_name and email are required' }, { status: 400 });
  }

  // Invite the user — Supabase sends them an email to set their password.
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: `${first_name} ${last_name}` },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const authUserId = authData.user.id;

  // Insert the client record linked to the auth user.
  const { data: client, error: clientError } = await supabaseAdmin
    .from('clients')
    .insert({
      first_name,
      last_name,
      email,
      auth_user_id: authUserId,
      trainer_id: trainer_id || null,
      location_id: location_id || null,
      status: status || 'active',
      account_type: account_type || 'standard',
      date_joined: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (clientError) {
    // Roll back the auth user if client insert fails
    await supabaseAdmin.auth.admin.deleteUser(authUserId);
    return NextResponse.json({ error: clientError.message }, { status: 500 });
  }

  return NextResponse.json({ id: client.id }, { status: 201 });
}
