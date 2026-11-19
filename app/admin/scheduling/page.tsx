'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, X } from 'lucide-react'

type CalendarEvent = {
  id: number
  client_id: number
  event_type: string | null
  workout_def_id: number | null
  scheduled_date: string
  completed_at: string | null
  status: string | null
  rpe_rating: number | null
  notes: string | null
}

type Client = { id: number; name: string }

const EVENT_TYPES = ['workout', 'conditioning', 'recovery', 'rest', 'game / match', 'other']

const INPUT =
  'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 ' +
  'px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand'

function formatDate(value: string) {
  return new Date(value + 'T00:00:00').toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function statusBadgeClass(status: string | null) {
  const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium '
  if (status === 'completed') return base + 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
  if (status === 'missed' || status === 'cancelled') return base + 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
  if (status === 'scheduled') return base + 'bg-brand/20 text-gray-900 dark:text-gray-100'
  return base + 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
}

type TimeFilter = 'upcoming' | 'past' | 'all'

export default function SchedulingPage() {
  const [events, setEvents]           = useState<CalendarEvent[]>([])
  const [clientNames, setClientNames] = useState<Map<number, string>>(new Map())
  const [loading, setLoading]         = useState(true)

  // Filters
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [timeFilter, setTimeFilter]   = useState<TimeFilter>('upcoming')

  // Create form
  const [createOpen, setCreateOpen]   = useState(false)
  const [clients, setClients]         = useState<Client[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [form, setForm]               = useState({ client_id: '', date: '', event_type: 'workout', notes: '' })
  const [saving, setSaving]           = useState(false)
  const [saveError, setSaveError]     = useState<string | null>(null)

  // Delete
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting]               = useState(false)

  // ── Load events ───────────────────────────────────────────────────────────

  async function loadEvents() {
    setLoading(true)
    const res  = await fetch('/api/admin/scheduling')
    const json = await res.json()
    const list: CalendarEvent[] = json.data ?? []
    setEvents(list)

    const ids = Array.from(new Set(list.map((e) => e.client_id)))
    if (ids.length > 0) {
      const { data } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .in('id', ids)
      const map = new Map<number, string>()
      ;(data ?? []).forEach((c) => map.set(c.id, `${c.first_name} ${c.last_name}`.trim()))
      setClientNames(map)
    }
    setLoading(false)
  }

  useEffect(() => { loadEvents() }, [])

  // ── Load clients for create form ─────────────────────────────────────────

  async function openCreate() {
    setCreateOpen(true)
    setForm({ client_id: '', date: '', event_type: 'workout', notes: '' })
    setSaveError(null)
    if (clients.length > 0) return
    setClientsLoading(true)
    const { data } = await supabase
      .from('clients')
      .select('id, first_name, last_name')
      .eq('status', 'active')
      .order('last_name')
    setClients(
      (data ?? []).map((c) => ({ id: c.id, name: `${c.first_name} ${c.last_name}`.trim() }))
    )
    setClientsLoading(false)
  }

  // ── Create session ────────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client_id || !form.date) return
    setSaving(true)
    setSaveError(null)
    const res = await fetch('/api/admin/scheduling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:  Number(form.client_id),
        event_type: form.event_type,
        scheduled_date: form.date,
        notes: form.notes || null,
      }),
    })
    const json = await res.json()
    if (!res.ok) { setSaveError(json.error ?? 'Failed to create session'); setSaving(false); return }

    // Add new event to list + update client name map
    setEvents((prev) => [...prev, json.data].sort((a, b) =>
      a.scheduled_date.localeCompare(b.scheduled_date)
    ))
    const client = clients.find((c) => c.id === Number(form.client_id))
    if (client) setClientNames((prev) => new Map(prev).set(client.id, client.name))
    setCreateOpen(false)
    setSaving(false)
  }

  // ── Delete session ────────────────────────────────────────────────────────

  async function handleDelete(id: number) {
    setDeleting(true)
    await fetch(`/api/admin/scheduling/${id}`, { method: 'DELETE' })
    setEvents((prev) => prev.filter((e) => e.id !== id))
    setConfirmDeleteId(null)
    setDeleting(false)
  }

  // ── Filters ───────────────────────────────────────────────────────────────

  const statusOptions = useMemo(() => {
    const set = new Set<string>()
    events.forEach((e) => { if (e.status) set.add(e.status) })
    return Array.from(set).sort()
  }, [events])

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const filtered = events.filter((e) => {
    if (timeFilter === 'upcoming' && e.scheduled_date < today) return false
    if (timeFilter === 'past'     && e.scheduled_date >= today) return false
    if (statusFilter !== 'all'   && e.status !== statusFilter) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    const name = (clientNames.get(e.client_id) ?? '').toLowerCase()
    const type = (e.event_type ?? '').toLowerCase()
    return name.includes(q) || type.includes(q)
  })

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Scheduling</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 bg-brand text-gray-900 text-sm font-medium rounded-lg hover:opacity-90"
        >
          <Plus size={15} /> Schedule Session
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search by client or type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="all">All statuses</option>
            {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden">
            {(['upcoming', 'past', 'all'] as TimeFilter[]).map((opt) => (
              <button
                key={opt}
                onClick={() => setTimeFilter(opt)}
                className={
                  'px-3 py-2 text-sm capitalize ' +
                  (timeFilter === opt
                    ? 'bg-brand text-gray-900 font-medium'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-jj-neutral dark:hover:bg-gray-700')
                }
              >
                {opt}
              </button>
            ))}
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
            {filtered.length} event{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Create session modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Schedule Session</h2>
              <button type="button" onClick={() => setCreateOpen(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Client *</label>
                <select
                  required
                  value={form.client_id}
                  onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                  className={INPUT}
                  disabled={clientsLoading}
                >
                  <option value="">{clientsLoading ? 'Loading…' : 'Select client'}</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className={INPUT}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Event type</label>
                <select
                  value={form.event_type}
                  onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value }))}
                  className={INPUT}
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Optional"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className={INPUT}
                />
              </div>
              {saveError && <p className="text-xs text-red-500">{saveError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setCreateOpen(false)}
                  className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-brand text-gray-900 text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800 text-left text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Type</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Notes</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-jj-grey/10 dark:divide-gray-800">
              {loading && [1, 2, 3, 4].map((i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-24" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-28" /></td>
                  <td className="px-4 py-3 hidden sm:table-cell"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-16" /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-32" /></td>
                  <td className="px-4 py-3"><div className="h-5 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse w-20" /></td>
                  <td className="px-4 py-3" />
                </tr>
              ))}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No sessions found.
                  </td>
                </tr>
              )}

              {!loading && filtered.map((event) => (
                <tr key={event.id} className="hover:bg-jj-neutral/50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {formatDate(event.scheduled_date)}
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                    {clientNames.get(event.client_id) ?? 'Unknown'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300 capitalize hidden sm:table-cell">
                    {event.event_type ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden md:table-cell max-w-xs truncate">
                    {event.notes ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={statusBadgeClass(event.status)}>{event.status ?? 'unknown'}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {confirmDeleteId === event.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleDelete(event.id)}
                          disabled={deleting}
                          className="px-2 py-1 text-xs font-medium bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(event.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        title="Delete session"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
