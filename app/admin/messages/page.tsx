'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Search, Plus, X, Users, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'

const PAGE_SIZE = 50

// ── Types ─────────────────────────────────────────────────────────────────────

type ConversationRow = {
  id: number
  type: string
  name: string | null
  last_message_at: string | null
  last_message_preview: string | null
}

type Participant = {
  conversation_id: number
  participant_id: number
  participant_type: string
  last_read_at: string | null
}

type Message = {
  id: number
  sender_id: number
  sender_type: string
  body: string
  sent_at: string
}

type ClientLite = {
  id: number
  first_name: string | null
  last_name: string | null
}

type ConversationView = {
  id: number
  type: string
  name: string          // derived display name
  initials: string
  lastPreview: string | null
  lastAt: string | null
  unread: boolean
  participantCount: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fullName(p: ClientLite): string {
  return `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Client'
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

// ── New Conversation Modal ────────────────────────────────────────────────────

function NewConversationModal({
  trainerId,
  onCreated,
  onClose,
}: {
  trainerId: number
  onCreated: (convId: number) => void
  onClose: () => void
}) {
  const [clients, setClients]         = useState<ClientLite[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [selected, setSelected]       = useState<Set<number>>(new Set())
  const [groupName, setGroupName]     = useState('')
  const [creating, setCreating]       = useState(false)
  const [error, setError]             = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('clients')
      .select('id, first_name, last_name')
      .order('first_name')
      .then(({ data }) => {
        setClients(data ?? [])
        setLoading(false)
      })
  }, [])

  const filtered = search.trim()
    ? clients.filter((c) =>
        fullName(c).toLowerCase().includes(search.toLowerCase())
      )
    : clients

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function create() {
    if (selected.size === 0) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/conversations', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          trainerId,
          clientIds: [...selected],
          name:      groupName.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create conversation')
      onCreated(data.id)
    } catch (err: any) {
      setError(err.message)
      setCreating(false)
    }
  }

  const isGroup = selected.size > 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white text-base">New Conversation</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={20} />
          </button>
        </div>

        {/* Group name field (shown when >1 client selected) */}
        {isGroup && (
          <div className="px-5 pt-4">
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name (optional — defaults to member names)"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        )}

        {/* Search */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients…"
              className="bg-transparent outline-none text-sm w-full text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>
        </div>

        {/* Selected chips */}
        {selected.size > 0 && (
          <div className="px-5 pb-2 flex flex-wrap gap-1.5">
            {Array.from(selected).map((id) => {
              const c = clients.find((cl) => cl.id === id)
              return c ? (
                <span
                  key={id}
                  className="flex items-center gap-1 bg-brand/20 text-gray-900 dark:text-white text-xs px-2 py-0.5 rounded-full"
                >
                  {fullName(c)}
                  <button onClick={() => toggle(id)} className="hover:opacity-70">
                    <X size={11} />
                  </button>
                </span>
              ) : null
            })}
          </div>
        )}

        {/* Client list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading clients…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No clients found.</p>
          ) : (
            filtered.map((c) => {
              const isSelected = selected.has(c.id)
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                    isSelected
                      ? 'bg-brand/10 dark:bg-brand/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gray-900 dark:bg-gray-700 flex items-center justify-center text-brand font-bold text-xs shrink-0">
                    {getInitials(fullName(c))}
                  </div>
                  <span className="text-sm text-gray-900 dark:text-white flex-1">{fullName(c)}</span>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-brand flex items-center justify-center">
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="#111" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="px-5 pb-2 text-xs text-red-500">{error}</p>
        )}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={create}
            disabled={selected.size === 0 || creating}
            className="w-full py-2.5 rounded-xl bg-brand text-gray-900 font-semibold text-sm disabled:opacity-40 transition-opacity"
          >
            {creating
              ? 'Creating…'
              : isGroup
              ? `Create Group Chat (${selected.size} members)`
              : 'Start Conversation'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminMessagesPage() {
  const { trainer } = useAdminAuth()
  const trainerId = trainer ? Number(trainer.id) : null

  const [conversations, setConversations]     = useState<ConversationView[]>([])
  const [selectedId, setSelectedId]           = useState<number | null>(null)
  const [messages, setMessages]               = useState<Message[]>([])
  const [hasMore, setHasMore]                 = useState(false)
  const [loadingConvs, setLoadingConvs]       = useState(true)
  const [loadingMsgs, setLoadingMsgs]         = useState(false)
  const [sending, setSending]                 = useState(false)
  const [draft, setDraft]                     = useState('')
  const [search, setSearch]                   = useState('')
  const [showNewModal, setShowNewModal]       = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [convParticipants, setConvParticipants] = useState<string[]>([])

  const bottomRef     = useRef<HTMLDivElement>(null)
  const selectedIdRef = useRef<number | null>(null)
  selectedIdRef.current = selectedId

  // ── Load conversation list ─────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    if (!trainerId) return
    setLoadingConvs(true)

    // RLS filters to conversations this trainer participates in
    const { data: convs } = await supabase
      .from('conversations')
      .select('id, type, name, last_message_at, last_message_preview')
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (!convs?.length) {
      setConversations([])
      setLoadingConvs(false)
      return
    }

    const convIds = convs.map((c) => c.id)

    // Participants for all conversations
    const { data: parts } = await supabase
      .from('conversation_participants')
      .select('conversation_id, participant_id, participant_type, last_read_at')
      .in('conversation_id', convIds)

    if (!parts) { setLoadingConvs(false); return }

    // Client names
    const clientIds = [...new Set(
      parts.filter((p) => p.participant_type === 'client').map((p) => p.participant_id as number)
    )]

    let clientMap: Record<number, string> = {}
    if (clientIds.length > 0) {
      const { data: clients } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .in('id', clientIds)
      if (clients) {
        clientMap = Object.fromEntries(
          clients.map((c) => [c.id, `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || 'Client'])
        )
      }
    }

    // My participant rows (to check unread)
    const myRows = parts.filter(
      (p) => p.participant_id === trainerId && p.participant_type === 'trainer'
    )

    const views: ConversationView[] = convs
      .filter((c) => myRows.some((p) => p.conversation_id === c.id))
      .map((c) => {
        const myRow    = myRows.find((p) => p.conversation_id === c.id)!
        const clients  = parts.filter((p) => p.conversation_id === c.id && p.participant_type === 'client')
        const clientNames = clients.map((p) => clientMap[p.participant_id] ?? 'Client')

        // Display name: explicit name > participant names
        let name: string
        if (c.name) {
          name = c.name
        } else if (clientNames.length === 1) {
          name = clientNames[0]
        } else if (clientNames.length <= 3) {
          name = clientNames.join(', ')
        } else {
          name = `${clientNames.slice(0, 2).join(', ')} +${clientNames.length - 2}`
        }

        const unread = !!(
          c.last_message_at &&
          (!myRow.last_read_at || c.last_message_at > myRow.last_read_at)
        )

        return {
          id:               c.id,
          type:             c.type,
          name,
          initials:         getInitials(name),
          lastPreview:      c.last_message_preview,
          lastAt:           c.last_message_at,
          unread,
          participantCount: clients.length,
        }
      })

    setConversations(views)
    setSelectedId((prev) => prev ?? (views[0]?.id ?? null))
    setLoadingConvs(false)
  }, [trainerId])

  useEffect(() => { loadConversations() }, [loadConversations])

  // ── Load messages ──────────────────────────────────────────────────────────

  const loadMessages = useCallback(async (convId: number, before: string | null) => {
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
  }, [])

  const markRead = useCallback(async (convId: number) => {
    if (!trainerId) return
    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', convId)
      .eq('participant_id', trainerId)
      .eq('participant_type', 'trainer')
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unread: false } : c))
    )
  }, [trainerId])

  // ── Load participant names for header ──────────────────────────────────────

  const loadParticipantNames = useCallback(async (convId: number) => {
    const { data: parts } = await supabase
      .from('conversation_participants')
      .select('participant_id, participant_type')
      .eq('conversation_id', convId)

    if (!parts) return

    const clientIds = parts.filter((p) => p.participant_type === 'client').map((p) => p.participant_id as number)
    if (!clientIds.length) { setConvParticipants([]); return }

    const { data: clients } = await supabase
      .from('clients')
      .select('id, first_name, last_name')
      .in('id', clientIds)

    setConvParticipants((clients ?? []).map((c) => `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || 'Client'))
  }, [])

  // ── Realtime + message load on conversation select ─────────────────────────

  useEffect(() => {
    if (!selectedId) return
    setMessages([])
    setHasMore(false)
    setShowParticipants(false)
    loadMessages(selectedId, null)
    markRead(selectedId)
    loadParticipantNames(selectedId)

    const channel = supabase
      .channel(`admin:messages:conv:${selectedId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedId}` },
        (payload) => {
          if (selectedIdRef.current !== selectedId) return
          const msg = payload.new as Message
          setMessages((prev) => [...prev, msg])
          setConversations((prev) =>
            prev.map((c) =>
              c.id === selectedId
                ? { ...c, lastPreview: msg.body, lastAt: msg.sent_at, unread: false }
                : c
            )
          )
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedId, loadMessages, markRead, loadParticipantNames])

  // ── Send ───────────────────────────────────────────────────────────────────

  async function sendMessage() {
    if (!draft.trim() || !selectedId || !trainerId || sending) return
    const body = draft.trim()
    setDraft('')
    setSending(true)
    await supabase.from('messages').insert({
      conversation_id: selectedId,
      sender_id:       trainerId,
      sender_type:     'trainer',
      body,
    })
    setSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function handleConversationCreated(convId: number) {
    setShowNewModal(false)
    loadConversations().then(() => setSelectedId(convId))
  }

  const selected     = conversations.find((c) => c.id === selectedId)
  const filtered     = search
    ? conversations.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : conversations

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-64px)] bg-jj-neutral dark:bg-gray-950 -m-6">

      {/* New conversation modal */}
      {showNewModal && trainerId && (
        <NewConversationModal
          trainerId={trainerId}
          onCreated={handleConversationCreated}
          onClose={() => setShowNewModal(false)}
        />
      )}

      {/* ── Conversation list ──────────────────────────────────────────────── */}
      <div className="w-72 bg-white dark:bg-gray-900 border-r border-jj-grey/40 dark:border-gray-700 flex flex-col shrink-0">
        <div className="p-4 border-b border-jj-grey/40 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-xl text-gray-900 dark:text-white">Messages</h2>
            <button
              onClick={() => setShowNewModal(true)}
              className="w-8 h-8 rounded-full bg-brand hover:opacity-90 flex items-center justify-center transition-opacity"
              title="New conversation"
            >
              <Plus size={16} color="#111" />
            </button>
          </div>
          <div className="flex items-center gap-2 bg-jj-neutral dark:bg-gray-800 rounded-lg px-3 py-2">
            <Search size={15} className="text-jj-grey shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="border-none bg-transparent outline-none text-sm w-full text-gray-900 dark:text-white placeholder-jj-grey"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {loadingConvs ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 px-4">
              <p className="text-sm text-gray-400 dark:text-gray-600">
                {search ? 'No results.' : 'No conversations yet.'}
              </p>
              {!search && (
                <button
                  onClick={() => setShowNewModal(true)}
                  className="mt-3 text-xs text-brand hover:underline"
                >
                  Start a conversation
                </button>
              )}
            </div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full flex items-start gap-3 px-4 py-3.5 border-b border-jj-grey/20 dark:border-gray-800 text-left transition-colors ${
                  selectedId === c.id ? 'bg-brand/10' : 'hover:bg-jj-neutral dark:hover:bg-gray-800'
                }`}
              >
                <div className="relative w-10 h-10 shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-brand font-bold text-[13px]">
                    {c.initials}
                  </div>
                  {c.type === 'group' && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand flex items-center justify-center">
                      <Users size={9} color="#111" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-0.5 gap-1">
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
                    {c.unread && <span className="w-2.5 h-2.5 rounded-full bg-brand shrink-0" />}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Chat area ─────────────────────────────────────────────────────── */}
      {!selected ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400 dark:text-gray-600">
          <p className="text-sm">Select a conversation or start a new one.</p>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand text-gray-900 rounded-full font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            New Conversation
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Header */}
          <div className="px-5 py-3.5 border-b border-jj-grey/40 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 shrink-0">
                <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center text-brand font-bold text-sm">
                  {selected.initials}
                </div>
                {selected.type === 'group' && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand flex items-center justify-center">
                    <Users size={9} color="#111" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">{selected.name}</div>
                {selected.type === 'group' && (
                  <button
                    onClick={() => setShowParticipants((v) => !v)}
                    className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-brand transition-colors"
                  >
                    {selected.participantCount} members
                    {showParticipants ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}
              </div>
            </div>

            {/* Expandable participant list */}
            {showParticipants && convParticipants.length > 0 && (
              <div className="mt-2 pt-2 border-t border-jj-grey/20 dark:border-gray-700 flex flex-wrap gap-1.5">
                {convParticipants.map((name) => (
                  <span
                    key={name}
                    className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full"
                  >
                    {name}
                  </span>
                ))}
              </div>
            )}
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

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
            {loadingMsgs && messages.length === 0 ? (
              <p className="text-sm text-gray-400 text-center">Loading…</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-gray-400 text-center mt-8">No messages yet — say hello!</p>
            ) : (
              messages.map((m) => {
                const isMe = m.sender_id === trainerId && m.sender_type === 'trainer'
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
                      <div className="text-[11px] opacity-60 mt-1 text-right">{formatTime(m.sent_at)}</div>
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
