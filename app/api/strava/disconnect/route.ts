import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  const { clientId } = await req.json() as { clientId: number };
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400, headers: CORS });

  await supabaseAdmin
    .from('strava_connections')
    .delete()
    .eq('client_id', clientId);

  return NextResponse.json({ ok: true }, { headers: CORS });
}
