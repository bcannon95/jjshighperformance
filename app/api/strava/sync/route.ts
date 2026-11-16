import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const TOKEN_URL      = 'https://www.strava.com/oauth/token';
const ACTIVITIES_URL = 'https://www.strava.com/api/v3/athlete/activities';

async function refreshIfNeeded(conn: {
  client_id: number;
  access_token: string;
  refresh_token: string;
  expires_at: string;
}): Promise<string> {
  if (new Date(conn.expires_at) > new Date(Date.now() + 60_000)) {
    return conn.access_token; // still valid
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type:    'refresh_token',
      refresh_token: conn.refresh_token,
    }),
  });

  const data = await res.json();

  await supabaseAdmin.from('strava_connections').update({
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
    expires_at:    new Date(data.expires_at * 1000).toISOString(),
  }).eq('client_id', conn.client_id);

  return data.access_token;
}

export async function POST(req: NextRequest) {
  const { clientId } = await req.json() as { clientId: number };
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 });

  const { data: conn, error: connErr } = await supabaseAdmin
    .from('strava_connections')
    .select('client_id, access_token, refresh_token, expires_at')
    .eq('client_id', clientId)
    .single();

  if (connErr || !conn) {
    return NextResponse.json({ error: 'Strava not connected' }, { status: 404 });
  }

  const token = await refreshIfNeeded(conn);

  // Fetch up to 100 recent activities from Strava
  const activitiesRes = await fetch(
    `${ACTIVITIES_URL}?per_page=100`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!activitiesRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch Strava activities' }, { status: 502 });
  }

  const activities = await activitiesRes.json();
  const runs = (activities as any[]).filter((a) => a.type === 'Run' || a.sport_type === 'Run');

  if (runs.length === 0) return NextResponse.json({ synced: 0 });

  const rows = runs.map((a) => ({
    client_id:          clientId,
    strava_activity_id: a.id,
    source:             'strava',
    started_at:         a.start_date,
    finished_at:        new Date(new Date(a.start_date).getTime() + a.elapsed_time * 1000).toISOString(),
    distance_m:         a.distance,
    duration_s:         a.moving_time,
    elevation_gain_m:   a.total_elevation_gain ?? 0,
    avg_pace_s_per_km:  a.distance > 0
      ? Math.round((a.moving_time / a.distance) * 1000)
      : null,
  }));

  const { error: upsertErr } = await supabaseAdmin
    .from('runs')
    .upsert(rows, { onConflict: 'strava_activity_id' });

  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

  return NextResponse.json({ synced: rows.length });
}
