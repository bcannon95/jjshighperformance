import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/admin/conversations
// Body: { trainerId: number, clientIds: number[], name?: string }
//
// For a DM (1 client): returns the existing conversation if one already exists
// between this trainer and client, otherwise creates a new one.
// For a group (>1 client): always creates a new conversation.

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { trainerId, clientIds, name } = body as {
    trainerId: number
    clientIds: number[]
    name?: string
  }

  if (!trainerId || !Array.isArray(clientIds) || clientIds.length === 0) {
    return NextResponse.json({ error: 'trainerId and clientIds are required' }, { status: 400 })
  }

  const isDirect = clientIds.length === 1

  // ── For DMs: find existing conversation between this trainer + client ─────
  if (isDirect) {
    const clientId = clientIds[0]

    // Find all conversations where this trainer is a participant
    const { data: trainerConvs } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('participant_id', trainerId)
      .eq('participant_type', 'trainer')

    if (trainerConvs && trainerConvs.length > 0) {
      const convIds = trainerConvs.map((r) => r.conversation_id)

      // Check if this client is also in any of those conversations (as a direct chat)
      const { data: match } = await supabaseAdmin
        .from('conversation_participants')
        .select('conversation_id')
        .in('conversation_id', convIds)
        .eq('participant_id', clientId)
        .eq('participant_type', 'client')
        .limit(1)
        .maybeSingle()

      if (match) {
        // Verify it's a direct conversation (not a group that happens to include both)
        const { data: conv } = await supabaseAdmin
          .from('conversations')
          .select('id, type')
          .eq('id', match.conversation_id)
          .eq('type', 'direct')
          .maybeSingle()

        if (conv) {
          return NextResponse.json({ id: conv.id, existed: true })
        }
      }
    }
  }

  // ── Create new conversation ────────────────────────────────────────────────
  const { data: conv, error: convErr } = await supabaseAdmin
    .from('conversations')
    .insert({
      type: isDirect ? 'direct' : 'group',
      name: name?.trim() || null,
    })
    .select('id')
    .single()

  if (convErr || !conv) {
    console.error('Failed to create conversation:', convErr)
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
  }

  // ── Add participants ───────────────────────────────────────────────────────
  const participants = [
    { conversation_id: conv.id, participant_id: trainerId, participant_type: 'trainer' },
    ...clientIds.map((cid) => ({
      conversation_id:  conv.id,
      participant_id:   cid,
      participant_type: 'client',
    })),
  ]

  const { error: partErr } = await supabaseAdmin
    .from('conversation_participants')
    .insert(participants)

  if (partErr) {
    console.error('Failed to add participants:', partErr)
    // Rollback the conversation
    await supabaseAdmin.from('conversations').delete().eq('id', conv.id)
    return NextResponse.json({ error: 'Failed to add participants' }, { status: 500 })
  }

  return NextResponse.json({ id: conv.id, existed: false }, { status: 201 })
}
