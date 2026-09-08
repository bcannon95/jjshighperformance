'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Square, ChevronRight, Activity } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

const RunMap = dynamic(() => import('@/components/RunMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-sm text-gray-400 bg-gray-900">
      Loading map…
    </div>
  ),
})

// ── Types ───────────────────────────────────────────────────────────────────

type RunPoint = { lat: number; lng: number; recorded_at: string }

type Run = {
  id: number
  started_at: string
  finished_at: string | null
  distance_m: number
  duration_s: number
  avg_pace_s_per_km: number | null
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const φ1 = (a.lat * Math.PI) / 180
  const φ2 = (b.lat * Math.PI) / 180
  const Δφ = ((b.lat - a.lat) * Math.PI) / 180
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180
  const x =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function fmtDuration(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

function fmtPace(secPerKm: number | null): string {
  if (!secPerKm || secPerKm <= 0) return '—'
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmtDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`
  return `${(m / 1000).toFixed(2)} km`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function RunsPage() {
  const { clientId } = useAuth()

  // View state
  const [mode, setMode] = useState<'idle' | 'running'>('idle')

  // Run history
  const [runs, setRuns] = useState<Run[]>([])
  const [loadingRuns, setLoadingRuns] = useState(true)

  // Active run
  const [activePoints, setActivePoints] = useState<RunPoint[]>([])
  const [elapsed, setElapsed]           = useState(0)
  const [distanceM, setDistanceM]       = useState(0)
  const [gpsError, setGpsError]         = useState<string | null>(null)
  const [saving, setSaving]             = useState(false)

  // Selected history run (route view)
  const [selectedRunId, setSelectedRunId]       = useState<number | null>(null)
  const [selectedRunPoints, setSelectedRunPoints] = useState<RunPoint[]>([])
  const [loadingPoints, setLoadingPoints]       = useState(false)

  // Refs to avoid stale closures in callbacks
  const startTimeRef   = useRef<Date | null>(null)
  const watchIdRef     = useRef<number | null>(null)
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastPointRef   = useRef<RunPoint | null>(null)
  const distanceMRef   = useRef(0)
  const elapsedRef     = useRef(0)

  // Sync refs
  useEffect(() => { distanceMRef.current = distanceM }, [distanceM])
  useEffect(() => { elapsedRef.current = elapsed }, [elapsed])

  // ── Load run history ──────────────────────────────────────────────────────

  const loadRuns = useCallback(async () => {
    if (!clientId) return
    setLoadingRuns(true)
    const { data } = await supabase
      .from('runs')
      .select('id, started_at, finished_at, distance_m, duration_s, avg_pace_s_per_km')
      .eq('client_id', clientId)
      .not('finished_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(20)
    setRuns(data ?? [])
    setLoadingRuns(false)
  }, [clientId])

  useEffect(() => { loadRuns() }, [loadRuns])

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // ── Start run ─────────────────────────────────────────────────────────────

  function startRun() {
    if (!navigator.geolocation) {
      setGpsError('GPS is not available on this device.')
      return
    }
    setGpsError(null)
    setActivePoints([])
    setDistanceM(0)
    setElapsed(0)
    lastPointRef.current  = null
    distanceMRef.current  = 0
    elapsedRef.current    = 0

    const start = new Date()
    startTimeRef.current = start
    setMode('running')

    // Prevent screen sleep during a run (best-effort)
    if ('wakeLock' in navigator) {
      ;(navigator as any).wakeLock.request('screen').catch(() => {})
    }

    // Live timer
    timerRef.current = setInterval(() => {
      const s = Math.floor((Date.now() - start.getTime()) / 1000)
      setElapsed(s)
      elapsedRef.current = s
    }, 1000)

    // GPS watch
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point: RunPoint = {
          lat:         pos.coords.latitude,
          lng:         pos.coords.longitude,
          recorded_at: new Date().toISOString(),
        }
        setActivePoints((prev) => {
          const last = lastPointRef.current
          if (last) {
            const d = haversine(last, point)
            if (d < 5) return prev // ignore noise under 5 m
            distanceMRef.current += d
            setDistanceM(distanceMRef.current)
          }
          lastPointRef.current = point
          return [...prev, point]
        })
      },
      (err) => setGpsError(`GPS: ${err.message}`),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  // ── Stop run ──────────────────────────────────────────────────────────────

  async function stopRun() {
    if (!clientId || !startTimeRef.current) return

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    setSaving(true)
    const durationS  = elapsedRef.current
    const distM      = distanceMRef.current
    const avgPace    = distM > 0 ? Math.round((durationS / distM) * 1000) : null
    const pointsSnap = [...activePoints]

    const { data: runRow } = await supabase
      .from('runs')
      .insert({
        client_id:         clientId,
        started_at:        startTimeRef.current.toISOString(),
        finished_at:       new Date().toISOString(),
        distance_m:        Math.round(distM * 100) / 100,
        duration_s:        durationS,
        avg_pace_s_per_km: avgPace,
      })
      .select('id')
      .single()

    if (runRow && pointsSnap.length > 0) {
      await supabase.from('run_points').insert(
        pointsSnap.map((p) => ({
          run_id:      runRow.id,
          lat:         p.lat,
          lng:         p.lng,
          recorded_at: p.recorded_at,
        }))
      )
    }

    setSaving(false)
    setMode('idle')
    setActivePoints([])
    setElapsed(0)
    setDistanceM(0)
    startTimeRef.current = null
    await loadRuns()
  }

  // ── View route for a past run ─────────────────────────────────────────────

  async function toggleRunRoute(runId: number) {
    if (selectedRunId === runId) {
      setSelectedRunId(null)
      setSelectedRunPoints([])
      return
    }
    setSelectedRunId(runId)
    setLoadingPoints(true)
    const { data } = await supabase
      .from('run_points')
      .select('lat, lng, recorded_at')
      .eq('run_id', runId)
      .order('recorded_at', { ascending: true })
    setSelectedRunPoints(data ?? [])
    setLoadingPoints(false)
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const paceSecPerKm =
    elapsed > 0 && distanceM > 0 ? Math.round((elapsed / distanceM) * 1000) : null

  const mapCenter: [number, number] | null =
    activePoints.length > 0
      ? [activePoints[activePoints.length - 1].lat, activePoints[activePoints.length - 1].lng]
      : null

  // ── Running mode UI ───────────────────────────────────────────────────────

  if (mode === 'running') {
    return (
      <div className="flex flex-col h-full bg-gray-950">
        {/* Stats */}
        <div className="bg-gray-900 px-6 py-5 shrink-0">
          <div className="text-5xl font-mono font-bold text-white text-center tabular-nums mb-4">
            {fmtDuration(elapsed)}
          </div>
          <div className="flex justify-center gap-16">
            <div className="text-center">
              <div className="text-2xl font-bold text-brand">{fmtDistance(distanceM)}</div>
              <div className="text-xs text-gray-400 mt-0.5 uppercase tracking-wider">Distance</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-brand">{fmtPace(paceSecPerKm)}</div>
              <div className="text-xs text-gray-400 mt-0.5 uppercase tracking-wider">Pace /km</div>
            </div>
          </div>
          {gpsError && (
            <p className="text-xs text-red-400 text-center mt-3">{gpsError}</p>
          )}
        </div>

        {/* Map */}
        <div className="flex-1 min-h-0">
          {activePoints.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gray-900 text-gray-400">
              <MapPin size={32} className="animate-pulse text-brand" />
              <span className="text-sm">Acquiring GPS signal…</span>
            </div>
          ) : (
            <RunMap points={activePoints} center={mapCenter} />
          )}
        </div>

        {/* Stop */}
        <div className="bg-gray-900 px-6 py-5 shrink-0">
          <button
            onClick={stopRun}
            disabled={saving}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-lg transition-colors"
          >
            <Square size={20} fill="white" />
            {saving ? 'Saving…' : 'Stop Run'}
          </button>
        </div>
      </div>
    )
  }

  // ── Idle mode UI (history + start) ────────────────────────────────────────

  return (
    <div className="p-6 bg-jj-neutral dark:bg-gray-950 min-h-full">
      <h1 className="font-heading text-4xl mb-6 text-gray-900 dark:text-white">Runs</h1>

      {gpsError && (
        <p className="mb-4 text-sm text-red-500 bg-red-50 dark:bg-red-950/40 px-4 py-2.5 rounded-lg">
          {gpsError}
        </p>
      )}

      {/* Start button */}
      <button
        onClick={startRun}
        className="w-full bg-brand hover:opacity-90 text-gray-900 font-bold py-5 rounded-2xl flex items-center justify-center gap-3 text-xl mb-8 transition-opacity"
      >
        <MapPin size={24} />
        Start Run
      </button>

      {/* History */}
      <h2 className="font-heading text-2xl mb-4 text-gray-900 dark:text-white">History</h2>

      {loadingRuns ? (
        <p className="text-sm text-gray-400 dark:text-gray-600">Loading runs…</p>
      ) : runs.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-600">
          No runs yet. Hit Start to record your first one!
        </p>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => {
            const isExpanded = selectedRunId === run.id
            return (
              <div
                key={run.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-jj-grey/20 dark:border-gray-700 overflow-hidden"
              >
                <button
                  onClick={() => toggleRunRoute(run.id)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-brand/10 dark:bg-brand/20 flex items-center justify-center shrink-0">
                    <Activity size={18} className="text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-900 dark:text-white">
                      {formatDate(run.started_at)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-2 mt-0.5">
                      <span>{fmtDistance(run.distance_m)}</span>
                      <span>·</span>
                      <span>{fmtDuration(run.duration_s)}</span>
                      {run.avg_pace_s_per_km && (
                        <>
                          <span>·</span>
                          <span>{fmtPace(run.avg_pace_s_per_km)}/km</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight
                    size={18}
                    className={`text-gray-400 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </button>

                {isExpanded && (
                  <div className="h-64 border-t border-jj-grey/20 dark:border-gray-700">
                    {loadingPoints ? (
                      <div className="h-full flex items-center justify-center text-sm text-gray-400">
                        Loading route…
                      </div>
                    ) : selectedRunPoints.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-gray-400">
                        No GPS points recorded for this run.
                      </div>
                    ) : (
                      <RunMap
                        points={selectedRunPoints}
                        center={[selectedRunPoints[0].lat, selectedRunPoints[0].lng]}
                        fit
                      />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
