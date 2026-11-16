import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const TOKEN_URL = 'https://www.strava.com/oauth/token';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code     = searchParams.get('code');
  const clientId = searchParams.get('state'); // we pass clientId as state
  const error    = searchParams.get('error');

  const base = req.nextUrl.origin;

  if (error || !code || !clientId) {
    return NextResponse.redirect(`${base}/strava-connected?status=error`);
  }

  // Exchange code for tokens
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type:    'authorization_code',
    }),
  });

  if (!res.ok) {
    return NextResponse.redirect(`${base}/strava-connected?status=error`);
  }

  const data = await res.json();

  await supabaseAdmin.from('strava_connections').upsert(
    {
      client_id:         Number(clientId),
      strava_athlete_id: data.athlete?.id,
      access_token:      data.access_token,
      refresh_token:     data.refresh_token,
      expires_at:        new Date(data.expires_at * 1000).toISOString(),
    },
    { onConflict: 'client_id' },
  );

  return NextResponse.redirect(`${base}/strava-connected?status=success`);
}
