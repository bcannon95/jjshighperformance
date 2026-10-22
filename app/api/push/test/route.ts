import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendApnsNotification } from '@/lib/apns';

/**
 * GET /api/push/test?userId=26150870
 * Fires a test APNs notification to all stored tokens for the given client.
 * For dev/testing only — auth-gate or remove before public launch.
 */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId query param required' }, { status: 400 });
  }

  const { data: subs, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('apns_token')
    .eq('user_id', Number(userId))
    .eq('user_type', 'client')
    .eq('platform', 'ios')
    .not('apns_token', 'is', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!subs || subs.length === 0) {
    return NextResponse.json({
      message: 'No APNs token found for this user. Open the app on a real device — the token registers on first launch.',
    });
  }

  const tokens = subs.map((s) => s.apns_token as string);
  const { sent, failed } = await sendApnsNotification(tokens, {
    title: 'JJS High Performance',
    body: 'Push notifications are working!',
    url: '/messages',
  });

  return NextResponse.json({ sent, total: tokens.length, failed });
}
