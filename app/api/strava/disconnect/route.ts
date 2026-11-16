import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const { clientId } = await req.json() as { clientId: number };
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 });

  await supabaseAdmin
    .from('strava_connections')
    .delete()
    .eq('client_id', clientId);

  return NextResponse.json({ ok: true });
}
