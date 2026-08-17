'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

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

function formatDate(value: string) {
  const date = new Date(value + 'T00:00:00')
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function statusBadgeClass(status: string | null) {
  const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium '
  if (status === 'completed') return base + 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
  if (status === 'missed' || status === 'cancelled') return base + 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
  if (status === 'scheduled') return base + 'bg-brand/20 text-jj-grey dark:text-gray-100'
  return base + 'bg-jj-neutral text-jj-grey/70 dark:bg-gray-800 dark:text-gray-400'
}

type TimeFilter = 'upcoming' | 'past' | 'all'

export default function SchedulingPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [clientNames, setClientNames] = useState<Map<number, string>>(new Map())
  const [workoutNames, setWorkoutNames] = useState<Map<number, string>>(new Map())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('upcoming')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)

      const { data: eventRows } = await supabase
        .from('calendar_events')
        .select('id, client_id, event_type, workout_def_id, scheduled_date, completed_at, status, rpe_rating, notes')
        .order('scheduled_date', { ascending: true })

      const eventList = eventRows || []
      setEvents(eventList)

      const clientIds = Array.from(new Set(eventList.map((e) => e.client_id)))
      const workoutIds = Array.from(new Set(eventList.map((e) => e.workout_def_id).filter((id): id is number => id !== null)))

      const [clientsRes, workoutsRes] = await Promise.all([
        clientIds.length > 0
          ? supabase.from('clients').select('id, first_name, last_name').in('id', clientIds)
          : Promise.resolve({ data: [] as { id: number; first_name: string; last_name: string }[] }),
        workoutIds.length > 0
          ? supabase.from('workout_definitions').select('id, name').in('id', workoutIds)
          : Promise.resolve({ data: [] as { id: number; name: string }[] }),
      ])

      const clientMap = new Map<number, string>()
      ;(clientsRes.data || []).forEach((c) => clientMap.set(c.id, (c.first_name + ' ' + c.last_name).trim()))
      setClientNames(clientMap)

      const workoutMap = new Map<number, string>()
      ;(workoutsRes.data || []).forEach((w) => workoutMap.set(w.id, w.name))
      setWorkoutNames(workoutMap)

      setLoading(false)
    }

    load()
  }, [])

  const statusOptions = useMemo(() => {
    const set = new Set<string>()
    events.forEach((e) => {
      if (e.status) set.add(e.status)
    })
    return Array.from(set).sort()
  }, [events])

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const filteredEvents = events.filter((e) => {
    if (timeFilter === 'upcoming' && e.scheduled_date < today) return false
    if (timeFilter === 'past' && e.scheduled_date >= today) return false
    if (statusFilter !== 'all' && e.status !== statusFilter) return false

    const query = search.trim().toLowerCase()
    if (!query) return true

    const clientName = (clientNames.get(e.client_id) || '').toLowerCase()
    const workoutName = (e.workout_def_id !== null ? workoutNames.get(e.workout_def_id) || '' : '').toLowerCase()
    const eventType = (e.event_type || '').toLowerCase()

    return clientName.includes(query) || workoutName.includes(query) || eventType.includes(query)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-jj-grey dark:text-white">Scheduling</h1>
        <span className="text-sm text-jj-grey/60 dark:text-gray-400">
          {filteredEvents.length} event{filteredEvents.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by client or workout..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-jj-grey/30 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-jj-grey dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand w-full max-w-sm"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-jj-grey/30 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-jj-grey dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="all">All statuses</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <div className="flex rounded-lg border border-jj-grey/30 dark:border-gray-700 overflow-hidden">
          {(['upcoming', 'past', 'all'] as TimeFilter[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTimeFilter(option)}
              className={
                'px-3 py-2 text-sm capitalize ' +
                (timeFilter === option
                  ? 'bg-brand text-jj-grey font-medium'
                  : 'bg-white dark:bg-gray-800 text-jj-grey dark:text-gray-100 hover:bg-jj-neutral dark:hover:bg-gray-700')
              }
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-jj-neutral dark:bg-gray-800 text-left text-jj-grey/60 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Workout</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-jj-grey/10 dark:divide-gray-800">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-jj-grey/60 dark:text-gray-400">
                  Loading schedule...
                </td>
              </tr>
            )}

            {!loading && filteredEvents.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-jj-grey/60 dark:text-gray-400">
                  No scheduled sessions found.
                </td>
              </tr>
            )}

            {!loading &&
              filteredEvents.map((event) => (
                <tr key={event.id} className="hover:bg-jj-neutral/50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-jj-grey dark:text-gray-100 whitespace-nowrap">{formatDate(event.scheduled_date)}</td>
                  <td className="px-4 py-3 text-jj-grey dark:text-gray-100">{clientNames.get(event.client_id) || 'Unknown client'}</td>
                  <td className="px-4 py-3 text-jj-grey/70 dark:text-gray-300 capitalize">{event.event_type || String.fromCharCode(8212)}</td>
                  <td className="px-4 py-3 text-jj-grey/70 dark:text-gray-300">
                    {event.workout_def_id !== null ? workoutNames.get(event.workout_def_id) || 'Unknown workout' : String.fromCharCode(8212)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={statusBadgeClass(event.status)}>{event.status || 'unknown'}</span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-jj-grey/50 dark:text-gray-500">Admin view is read-only.</p>
    </div>
  )
}
