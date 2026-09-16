// Supabase Edge Function: send-push
//
// Triggered by a database webhook on messages INSERT.
// Sends a Web Push notification to every participant in the conversation
// except the sender, where push_enabled = true.
//
// Required secrets (set via: supabase secrets set KEY=value):
//   VAPID_PUBLIC_KEY   — base64url VAPID public key
//   VAPID_PRIVATE_KEY  — base64url VAPID private key
//   VAPID_SUBJECT      — mailto: or https: contact URL (e.g. mailto:admin@jjs.app)
//   SUPABASE_URL       — your project URL (auto-injected by Supabase)
//   SUPABASE_SERVICE_ROLE_KEY — service role key (auto-injected)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore — webpush Deno-compatible build via esm.sh
import webpush from 'https://esm.sh/web-push@3.6.7'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body: { record?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return new Response('Bad request', { status: 400 })
  }

  const message = body.record
  if (!message) return new Response('No record', { status: 400 })

  const conversationId = message.conversation_id as number
  const senderId       = message.sender_id as number
  const senderType     = message.sender_type as string
  const messageBody    = (message.body as string) ?? ''

  // ── Find all participants except the sender ──────────────────────────────
  const { data: participants } = await supabase
    .from('conversation_participants')
    .select('participant_id, participant_type')
    .eq('conversation_id', conversationId)

  if (!participants?.length) return new Response('OK', { status: 200 })

  const recipients = participants.filter(
    (p) => !(p.participant_id === senderId && p.participant_type === senderType)
  )

  if (!recipients.length) return new Response('OK', { status: 200 })

  // ── Get sender name for notification title ────────────────────────────────
  let senderName = 'New message'
  if (senderType === 'trainer') {
    const { data: trainer } = await supabase
      .from('trainers')
      .select('first_name, last_name')
      .eq('id', senderId)
      .maybeSingle()
    if (trainer) {
      senderName = `${trainer.first_name ?? ''} ${trainer.last_name ?? ''}`.trim() || 'Coach'
    }
  } else {
    const { data: client } = await supabase
      .from('clients')
      .select('first_name, last_name')
      .eq('id', senderId)
      .maybeSingle()
    if (client) {
      senderName = `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() || 'Client'
    }
  }

  // ── Fetch push subscriptions for all recipients ───────────────────────────
  // Build OR conditions for each recipient
  const orConditions = recipients
    .map((r) => `and(user_id.eq.${r.participant_id},user_type.eq.${r.participant_type})`)
    .join(',')

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth_key')
    .or(orConditions)
    .eq('push_enabled', true)

  if (!subs?.length) return new Response('OK', { status: 200 })

  // ── Send pushes ───────────────────────────────────────────────────────────
  const payload = JSON.stringify({
    title:          senderName,
    body:           messageBody.length > 120 ? messageBody.slice(0, 117) + '…' : messageBody,
    conversationId,
    url:            '/messages',
  })

  await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        payload,
      ).catch((err: Error) => {
        // If subscription expired/invalid, remove it
        if ((err as any).statusCode === 410) {
          supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      })
    )
  )

  return new Response('OK', { status: 200 })
})
