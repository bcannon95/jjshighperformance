import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendApnsNotification, type ApnsPayload } from '@/lib/apns';

/**
 * POST /api/push/send
 * Body: { userId: number, userType?: 'client' | 'coach', payload: ApnsPayload }
 *
 * Sends an APNs push notification to every stored device token for that user.
 */
export async function POST(req: NextRequest) {
  const { userId, userType = 'client', payload } = await req.json() as {
    userId: number;
    userType?: string;
    payload: ApnsPayload;
  };

  if (!userId || !payload?.title) {
    return NextResponse.json({ error: 'userId and payload.title are required' }, { status: 400 });
  }

  const { data: subs, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('apns_token')
    .eq('user_id', userId)
    .eq('user_type', userType)
    .eq('platform', 'ios')
    .not('apns_token', 'is', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No APNs subscriptions found' });
  }

  const tokens = subs.map((s) => s.apns_token as string);
  const { sent, failed } = await sendApnsNotification(tokens, payload);

  // Remove invalid/expired tokens
  if (failed.length > 0) {
    await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .in('apns_token', failed);
  }

  return NextResponse.json({ sent, total: tokens.length });
}
