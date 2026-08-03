'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

const PAGE_SIZE = 50

type Message = {
  id: number
  sender_id: number
  sender_type: string
  body: string
  sent_at: string
}

type ConversationView = {
  id: number
  name: string
  initials: string
  lastPreview: string | null
  lastAt: string | null
  unread: boolean
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
  }
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

export default function MessagesPage() {
  const { clientId } = useAuth()

  const [conversations, setConversations]   = useState<ConversationView[]>([])
  const [selectedId, setSelectedId]         = useState<number | null>(null)
  const [messages, setMessages]             = useState<Message[]>([])
  const [hasMore, setHasMore]               = useState(false)
  const [loadingConvs, setLoadingConvs]     = useState(true)
  const [loadingMsgs, setLoadingMsgs]       = useState(false)
  const [sending, setSending]               = useState(false)
  const [draft, setDraft]                   = useState('')
  const [search, setSearch]                 = useState('')

  const bottomRef    = useRef<HTMLDivElement>(null)
  const selectedIdRef = useRef<number | null>(null)
  selectedIdRef.current = selectedId

  // ── Load conversation list ─────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!clientId) { setLoadingConvs(false); return }
    setLoadingConvs(true)

    // Step 1: conversations visible to this client (RLS filters automatically)
    const { data: convs } = await supabase
      .from('conversations')
      .select('id, type, last_message_at, last_message_preview')
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (!convs?.length) {
      setConversations([])
      setLoadingConvs(false)
      return
    }


    const convIds = convs.map((c) => c.id)

    // Step 2: all participants in those conversations
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('conversation_id, participant_id, participant_type, last_read_at')
      .in('conversation_id', convIds)

    if (!participants) { setLoadingConvs(false); return }

    // Step 3: trainer names for trainer participants
    const trainerIdSet: Record<number, true> = {}
    participants
      .filter((p) => p.participant_type === 'trainer')
      .forEach((p) => { trainerIdSet[p.participant_id as number] = true })
    const trainerIds = Object.keys(trainerIdSet).map(Number)

    let trainerMap: Record<number, string> = {}
    if (trainerIds.length > 0) {
      const { data: trainers } = await supabase
        .from('trainers')
        .select('id, first_name, last_name')
        .in('id', trainerIds)
      if (trainers) {
        trainerMap = Object.fromEntries(
          trainers.map((t) => [
            t.id,
            `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim() || 'Trainer',
          ])
        )
      }
    }

    // Build views
    const myRows = participants.filter(
      (p) => p.participant_id === clientId && p.participant_type === 'client'
    )

    const views: ConversationView[] = convs
      .filter((c) => myRows.some((p) => p.conversation_id === c.id))
      .map((c) => {
        const myRow   = myRows.find((p) => p.conversation_id === c.id)!
        const trainers = participants.filter(
          (p) => p.conversation_id === c.id && p.participant_type === 'trainer'
        )
        const name =
          trainers.length > 0
            ? (trainerMap[trainers[0].participant_id] ?? 'Trainer')
            : c.type === 'group'
            ? 'Group Chat'
            : 'Support'

        const unread = !!(
          c.last_message_at &&
          (!myRow.last_read_at || c.last_message_at > myRow.last_read_at)
        )

        return {
          id:          c.id,
          name,
          initials:    getInitials(name),
          lastPreview: c.last_message_preview,
          lastAt:      c.last_message_at,
          unread,
        }
      })

    setConversations(views)
    // Auto-select first conversation on initial load
    setSelectedId((prev) => prev ?? (views[0]?.id ?? null))
    setLoadingConvs(false)
  }, [clientId])

  useEffect(() => { loadConversations() }, [loadConversations])

  // ── Load messages + realtime for selected conversation ─────────────────────
  const loadMessages = useCallback(
    async (convId: number, before: string | null) => {
      setLoadingMsgs(true)
      let query = supabase
        .from('messages')
        .select('id, sender_id, sender_type, body, sent_at')
        .eq('conversation_id', convId)
        .order('sent_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (before) query = query.lt('sent_at', before)

      const { data } = await query
      setLoadingMsgs(false)
      if (!data) return

      const asc = [...data].reverse()
      setMessages((prev) => (before ? [...asc, ...prev] : asc))
      setHasMore(data.length === PAGE_SIZE)
      if (!before) setTimeout(() => bottomRef.current?.scrollIntoView(), 50)
    },
    []
  )

  const markRead = useCallback(
    async (convId: number) => {
      if (!clientId) return
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', convId)
        .eq('participant_id', clientId)
        .eq('participant_type', 'client')
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unread: false } : c))
      )
    },
    [clientId]
  )

  useEffect(() => {
    if (!selectedId) return
    setMessages([])
    setHasMore(false)
    loadMessages(selectedId, null)
    markRead(selectedId)

    // Realtime: new messages in this conversation
    const channel = supabase
      .channel(`messages:conv:${selectedId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'messages',
          filter: `conversation_id=eq.${selectedId}`,
        },
        (payload) => {
          const msg = payload.new as Message
          // Only append if we're still viewing this conversation
          if (selectedIdRef.current !== selectedId) return
          setMessages((prev) => [...prev, msg])
          setConversations((prev) =>
            prev.map((c) =>
              c.id === selectedId
                ? { ...c, lastPreview: msg.body, lastAt: msg.sent_at }
                : c
            )
          )
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedId, loadMessages, markRead])

  // ── Send ───────────────────────────────────────────────────────────────────
  async function sendMessage() {
    if (!draft.trim() || !selectedId || !clientId || sending) return
    const body = draft.trim()
    setDraft('')
    setSending(true)
    await supabase.from('messages').insert({
      conversation_id: selectedId,
      sender_id:       clientId,
      sender_type:     'client',
      body,
    })
    setSending(false)
    // Realtime subscription will append the new message
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const selected = conversations.find((c) => c.id === selectedId)
  const filtered = search
    ? conversations.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : conversations

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full bg-jj-neutral dark:bg-gray-950">

      {/* ── Thread list ───────────────────────────────────────────────────── */}
      <div className="w-72 bg-white dark:bg-gray-900 border-r border-jj-grey/40 dark:border-gray-700 flex flex-col shrink-0">
        <div className="p-4 border-b border-jj-grey/40 dark:border-gray-700">
          <h2 className="font-heading text-2xl mb-3 text-gray-900 dark:text-white">Messages</h2>
          <div className="flex items-center gap-2 bg-jj-neutral dark:bg-gray-800 rounded-lg px-3 py-2">
            <Search size={16} className="text-jj-grey" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages..."
              className="border-none bg-transparent outline-none text-sm w-full text-gray-900 dark:text-white placeholder-jj-grey"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {loadingConvs ? (
            <p className="text-sm text-gray-400 dark:text-gray-600 text-center py-8">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-600 text-center py-8 px-4">
              {search ? 'No results.' : 'No conversations yet.'}
            </p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full flex items-start gap-3 px-4 py-3.5 border-b border-jj-grey/20 dark:border-gray-800 text-left transition-colors ${
                  selectedId === c.id
                    ? 'bg-brand/10'
                    : 'hover:bg-jj-neutral dark:hover:bg-gray-800'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-brand font-bold text-[13px] shrink-0">
                  {c.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-1 gap-1">
                    <span className={`text-sm truncate ${c.unread ? 'font-bold' : 'font-semibold'} text-gray-900 dark:text-white`}>
                      {c.name}
                    </span>
                    <span className="text-xs text-jj-grey dark:text-gray-500 shrink-0">
                      {c.lastAt ? formatTime(c.lastAt) : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[13px] text-gray-500 dark:text-gray-400 truncate">
                      {c.lastPreview ?? 'No messages yet'}
                    </span>
                    {c.unread && (
                      <span className="w-2.5 h-2.5 rounded-full bg-brand shrink-0" />
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Chat area ─────────────────────────────────────────────────────── */}
      {!selected ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400 dark:text-gray-600">
          Select a conversation to start messaging.
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Header */}
          <div className="px-5 py-4 border-b border-jj-grey/40 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-brand font-bold text-sm">
              {selected.initials}
            </div>
            <span className="font-semibold text-sm text-gray-900 dark:text-white">{selected.name}</span>
          </div>

          {/* Load earlier */}
          {hasMore && (
            <div className="text-center py-2 shrink-0 bg-jj-neutral dark:bg-gray-950">
              <button
                onClick={() => loadMessages(selectedId!, messages[0]?.sent_at ?? null)}
                disabled={loadingMsgs}
                className="text-xs text-brand hover:underline disabled:opacity-50"
              >
                {loadingMsgs ? 'Loading…' : 'Load earlier messages'}
              </button>
            </div>
          )}

          {/* Message list */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
            {loadingMsgs && messages.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-600 text-center">Loading…</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-600 text-center mt-8">
                No messages yet — say hello!
              </p>
            ) : (
              messages.map((m) => {
                const isMe = m.sender_id === clientId && m.sender_type === 'client'
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[60%] px-3.5 py-2.5 text-sm ${
                        isMe
                          ? 'bg-gray-900 text-brand rounded-2xl rounded-br-sm'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-jj-grey/30 dark:border-gray-700 rounded-2xl rounded-bl-sm'
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">{m.body}</div>
                      <div className="text-[11px] opacity-60 mt-1 text-right">
                        {formatTime(m.sent_at)}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <div className="px-5 py-4 border-t border-jj-grey/40 dark:border-gray-700 bg-white dark:bg-gray-900 flex gap-2.5 items-center shrink-0">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message…"
              className="flex-1 px-4 py-2.5 border border-jj-grey/40 dark:border-gray-600 rounded-full text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand placeholder-jj-grey"
            />
            <button
              onClick={sendMessage}
              disabled={!draft.trim() || sending}
              className="w-10 h-10 rounded-full bg-gray-900 hover:bg-gray-800 disabled:opacity-40 flex items-center justify-center shrink-0 transition-opacity"
            >
              <Send size={18} color="#d4de26" />
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
