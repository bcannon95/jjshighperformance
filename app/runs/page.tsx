'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Square, ChevronRight, Activity, ChevronDown, Map } from 'lucide-react'
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

type RunPoint = { lat: number; lng: number; accuracy_m: number | null; recorded_at: string }

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

function GpsAccuracyPill({ accuracy }: { accuracy: number | null }) {
  if (accuracy === null) return (
    <span className="text-[11px] text-gray-500 tabular-nums">GPS acquiring…</span>
  )
  const good   = accuracy <= 10
  const ok     = accuracy <= 30
  const colour = good ? 'text-green-400' : ok ? 'text-yellow-400' : 'text-red-400'
  const dot    = good ? 'bg-green-400' : ok ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <span className={`flex items-center gap-1 text-[11px] tabular-nums ${colour}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} animate-pulse`} />
      GPS ±{Math.round(accuracy)} m
    </span>
  )
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
  const [mode, setMode]       = useState<'idle' | 'running'>('idle')
  const [mapOpen, setMapOpen] = useState(false)

  // Run history
  const [runs, setRuns]           = useState<Run[]>([])
  const [loadingRuns, setLoadingRuns] = useState(true)

  // Active run
  const [activePoints, setActivePoints] = useState<RunPoint[]>([])
  const [elapsed, setElapsed]           = useState(0)
  const [distanceM, setDistanceM]       = useState(0)
  const [gpsAccuracy, setGpsAccuracy]   = useState<number | null>(null)
  const [gpsError, setGpsError]         = useState<string | null>(null)
  const [saving, setSaving]             = useState(false)

  // Selected history run (route view)
  const [selectedRunId, setSelectedRunId]           = useState<number | null>(null)
  const [selectedRunPoints, setSelectedRunPoints]   = useState<RunPoint[]>([])
  const [loadingPoints, setLoadingPoints]           = useState(false)

  // Recovery / error state
  const [recoveredRun, setRecoveredRun] = useState<{ startedAt: string; points: RunPoint[] } | null>(null)
  const [bgWarning, setBgWarning]       = useState(false)
  const [saveError, setSaveError]       = useState<string | null>(null)

  // Refs — avoid stale closures in GPS callbacks
  const startTimeRef    = useRef<Date | null>(null)
  const watchIdRef      = useRef<number | null>(null)
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastPointRef    = useRef<RunPoint | null>(null)
  const distanceMRef    = useRef(0)
  const elapsedRef      = useRef(0)
  const gpsStartTimeRef = useRef<Date | null>(null)  // first valid GPS lock — used for accurate pace
  const modeRef         = useRef<'idle' | 'running'>('idle')

  useEffect(() => { distanceMRef.current = distanceM }, [distanceM])
  useEffect(() => { elapsedRef.current   = elapsed   }, [elapsed])
  useEffect(() => { modeRef.current      = mode      }, [mode])

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

  // ── Recover interrupted run from localStorage ─────────────────────────────

  useEffect(() => {
    try {
      const saved = localStorage.getItem('jjs_active_run')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.points?.length > 0) setRecoveredRun(parsed)
      }
    } catch {}
  }, [])

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // ── GPS position handler ──────────────────────────────────────────────────
  // Accuracy threshold raised to 100 m so points aren't silently dropped in
  // moderate conditions. Noise filter reduced to 2 m so slow running pace
  // (≈2.8 m/s) doesn't lose movement to the filter.

  const handleGpsPosition = useCallback((pos: GeolocationPosition) => {
    const accuracy = pos.coords.accuracy
    setGpsAccuracy(Math.round(accuracy))

    // Skip only truly unusable fixes (>100 m)
    if (accuracy > 100) return

    if (!gpsStartTimeRef.current) gpsStartTimeRef.current = new Date()

    const point: RunPoint = {
      lat:         pos.coords.latitude,
      lng:         pos.coords.longitude,
      accuracy_m:  Math.round(accuracy * 10) / 10,
      recorded_at: new Date().toISOString(),
    }

    setActivePoints((prev) => {
      const last = lastPointRef.current
      if (last) {
        const d = haversine(last, point)
        if (d < 2) return prev  // filter sub-2 m noise only
        distanceMRef.current += d
        setDistanceM(distanceMRef.current)
      }
      lastPointRef.current = point

      // Persist to localStorage so data survives backgrounding
      try {
        const key     = 'jjs_active_run'
        const existing = localStorage.getItem(key)
        const stored  = existing
          ? JSON.parse(existing)
          : { startedAt: startTimeRef.current?.toISOString(), points: [] }
        stored.points.push(point)
        localStorage.setItem(key, JSON.stringify(stored))
      } catch {}

      return [...prev, point]
    })
  }, [])

  // ── Re-acquire GPS when returning from background ─────────────────────────

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState !== 'visible') return
      if (modeRef.current !== 'running') return
      setBgWarning(true)
      if (watchIdRef.current === null) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          handleGpsPosition,
          (err) => setGpsError(`GPS: ${err.message}`),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
        )
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [handleGpsPosition])

  // ── Start run ─────────────────────────────────────────────────────────────

  function startRun() {
    if (!navigator.geolocation) {
      setGpsError('GPS is not available on this device.')
      return
    }
    setGpsError(null)
    setSaveError(null)
    setBgWarning(false)
    setGpsAccuracy(null)
    setActivePoints([])
    setDistanceM(0)
    setElapsed(0)
    lastPointRef.current    = null
    distanceMRef.current    = 0
    elapsedRef.current      = 0
    gpsStartTimeRef.current = null

    try { localStorage.removeItem('jjs_active_run') } catch {}

    const start = new Date()
    startTimeRef.current = start
    try {
      localStorage.setItem('jjs_active_run', JSON.stringify({ startedAt: start.toISOString(), points: [] }))
    } catch {}
    setMapOpen(false)
    setMode('running')

    if ('wakeLock' in navigator) {
      ;(navigator as any).wakeLock.request('screen').catch(() => {})
    }

    timerRef.current = setInterval(() => {
      const s = Math.floor((Date.now() - start.getTime()) / 1000)
      setElapsed(s)
      elapsedRef.current = s
    }, 1000)

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleGpsPosition,
      (err) => setGpsError(`GPS: ${err.message}`),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  // ── Stop run ──────────────────────────────────────────────────────────────

  async function stopRun() {
    if (!startTimeRef.current) return

    // Surface auth problem instead of silently doing nothing
    if (!clientId) {
      setSaveError('Not signed in as a client — please sign out and back in.')
      return
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    setSaving(true)
    setSaveError(null)
    const durationS  = elapsedRef.current
    const distM      = distanceMRef.current
    const avgPace    = distM > 0 ? Math.round((durationS / distM) * 1000) : null
    const pointsSnap = [...activePoints]
    const startedAt  = startTimeRef.current.toISOString()

    try {
      const { data: runRow, error: runErr } = await supabase
        .from('runs')
        .insert({
          client_id:         clientId,
          started_at:        startedAt,
          finished_at:       new Date().toISOString(),
          distance_m:        Math.round(distM * 100) / 100,
          duration_s:        durationS,
          avg_pace_s_per_km: avgPace,
        })
        .select('id')
        .single()

      if (runErr) throw runErr

      if (runRow && pointsSnap.length > 0) {
        const CHUNK = 200
        for (let i = 0; i < pointsSnap.length; i += CHUNK) {
          const { error: ptsErr } = await supabase.from('run_points').insert(
            pointsSnap.slice(i, i + CHUNK).map((p) => ({
              run_id:      runRow.id,
              lat:         p.lat,
              lng:         p.lng,
              accuracy_m:  p.accuracy_m,
              recorded_at: p.recorded_at,
            }))
          )
          if (ptsErr) throw ptsErr
        }
      }

      try { localStorage.removeItem('jjs_active_run') } catch {}

      setMode('idle')
      setActivePoints([])
      setElapsed(0)
      setDistanceM(0)
      setBgWarning(false)
      startTimeRef.current    = null
      gpsStartTimeRef.current = null
      await loadRuns()
    } catch (err: any) {
      console.error('Failed to save run:', err)
      setSaveError(`Save failed: ${err?.message ?? 'unknown error'}. Your run data is safe — try again.`)
    } finally {
      setSaving(false)
    }
  }

  // ── Save a recovered (interrupted) run ───────────────────────────────────

  async function saveRecoveredRun() {
    if (!clientId) {
      setSaveError('Not signed in as a client — please sign out and back in.')
      return
    }
    if (!recoveredRun) return

    setSaving(true)
    setSaveError(null)
    try {
      const { points, startedAt } = recoveredRun
      let distM  = 0
      let lastPt: RunPoint | null = null
      for (const p of points) {
        if (lastPt) distM += haversine(lastPt, p)
        lastPt = p
      }
      const finishedAt = points[points.length - 1].recorded_at
      const durationS  = Math.round(
        (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000
      )
      const avgPace = distM > 0 ? Math.round((durationS / distM) * 1000) : null

      const { data: runRow, error: runErr } = await supabase
        .from('runs')
        .insert({
          client_id:         clientId,
          started_at:        startedAt,
          finished_at:       finishedAt,
          distance_m:        Math.round(distM * 100) / 100,
          duration_s:        durationS,
          avg_pace_s_per_km: avgPace,
        })
        .select('id')
        .single()

      if (runErr) throw runErr

      if (runRow && points.length > 0) {
        const CHUNK = 200
        for (let i = 0; i < points.length; i += CHUNK) {
          const { error: ptsErr } = await supabase.from('run_points').insert(
            points.slice(i, i + CHUNK).map((p) => ({
              run_id:      runRow.id,
              lat:         p.lat,
              lng:         p.lng,
              accuracy_m:  p.accuracy_m,
              recorded_at: p.recorded_at,
            }))
          )
          if (ptsErr) throw ptsErr
        }
      }

      try { localStorage.removeItem('jjs_active_run') } catch {}
      setRecoveredRun(null)
      await loadRuns()
    } catch (err: any) {
      console.error('Failed to save recovered run:', err)
      setSaveError(`Save failed: ${err?.message ?? 'unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  function discardRecoveredRun() {
    try { localStorage.removeItem('jjs_active_run') } catch {}
    setRecoveredRun(null)
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
      .select('lat, lng, accuracy_m, recorded_at')
      .eq('run_id', runId)
      .order('recorded_at', { ascending: true })
    setSelectedRunPoints(data ?? [])
    setLoadingPoints(false)
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  // Pace uses time from first GPS lock, not from Start press, to avoid
  // inflating pace during the GPS acquisition window (can be 30–120 s).
  const gpsElapsedS = gpsStartTimeRef.current
    ? Math.floor((Date.now() - gpsStartTimeRef.current.getTime()) / 1000)
    : 0
  const paceSecPerKm =
    gpsElapsedS > 0 && distanceM > 0 ? Math.round((gpsElapsedS / distanceM) * 1000) : null

  const mapCenter: [number, number] | null =
    activePoints.length > 0
      ? [activePoints[activePoints.length - 1].lat, activePoints[activePoints.length - 1].lng]
      : null

  // ── Running mode — full-screen map ─────────────────────────────────────────

  if (mode === 'running' && mapOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950">
        {bgWarning && (
          <div className="absolute top-0 inset-x-0 z-[1001] bg-yellow-500/20 border-b border-yellow-500/40 px-4 py-1.5 text-center">
            <span className="text-yellow-300 text-xs font-medium">
              GPS was paused while the app was in the background — resumed now.
            </span>
          </div>
        )}

        <div className="absolute inset-0">
          {activePoints.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gray-900 text-gray-400">
              <MapPin size={32} className="animate-pulse text-brand" />
              <span className="text-sm">Acquiring GPS signal…</span>
            </div>
          ) : (
            <RunMap points={activePoints} center={mapCenter} accuracyM={gpsAccuracy} />
          )}
        </div>

        {/* Stats card — floating top overlay */}
        <div
          className="absolute left-4 right-4 z-[1000]"
          style={{ top: 'calc(env(safe-area-inset-top) + 16px)' }}
        >
          <div className="bg-gray-900/85 backdrop-blur-md rounded-2xl px-5 py-4 border border-white/10 shadow-xl">
            <div className="text-4xl font-mono font-bold text-white text-center tabular-nums mb-3">
              {fmtDuration(elapsed)}
            </div>
            <div className="flex justify-center gap-8">
              <div className="text-center">
                <div className="text-xl font-bold text-brand">{fmtDistance(distanceM)}</div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wider mt-0.5">Distance</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-brand">{fmtPace(paceSecPerKm)}</div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wider mt-0.5">Pace /km</div>
              </div>
            </div>
            <div className="flex justify-center mt-2">
              {gpsError
                ? <span className="text-[11px] text-red-400">{gpsError}</span>
                : <GpsAccuracyPill accuracy={gpsAccuracy} />}
            </div>
          </div>
        </div>

        {/* Save error */}
        {saveError && (
          <div
            className="absolute left-4 right-4 z-[1000]"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 130px)' }}
          >
            <div className="bg-red-500/20 border border-red-500/40 rounded-xl px-4 py-2 text-center">
              <span className="text-red-300 text-xs">{saveError}</span>
            </div>
          </div>
        )}

        {/* Bottom controls — collapse + stop */}
        <div
          className="absolute left-0 right-0 z-[1000] px-6 flex items-center justify-between"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
        >
          <button
            onClick={() => setMapOpen(false)}
            className="w-12 h-12 rounded-full bg-gray-900/85 backdrop-blur-md border border-white/10 flex items-center justify-center text-white shadow-lg"
          >
            <ChevronDown size={20} />
          </button>

          <button
            onClick={stopRun}
            disabled={saving}
            className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 flex items-center justify-center shadow-2xl shadow-red-900/60 transition-colors"
          >
            {saving ? (
              <span className="text-white text-xs font-bold">Saving</span>
            ) : (
              <Square size={28} fill="white" color="white" />
            )}
          </button>

          <div className="w-12" />
        </div>
      </div>
    )
  }

  // ── Running mode — stats only (map minimised) ──────────────────────────────

  if (mode === 'running') {
    return (
      <div className="flex flex-col h-full bg-gray-950">
        {bgWarning && (
          <div className="bg-yellow-500/20 border-b border-yellow-500/40 px-4 py-2 text-center">
            <span className="text-yellow-300 text-xs font-medium">
              GPS was paused while the app was in the background — resumed now.
            </span>
          </div>
        )}

        {saveError && (
          <div className="bg-red-500/20 border-b border-red-500/40 px-4 py-2 text-center">
            <span className="text-red-300 text-xs">{saveError}</span>
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="text-7xl font-mono font-bold text-white tabular-nums mb-10">
            {fmtDuration(elapsed)}
          </div>
          <div className="flex gap-10 mb-10">
            <div className="text-center">
              <div className="text-3xl font-bold text-brand">{fmtDistance(distanceM)}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Distance</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-brand">{fmtPace(paceSecPerKm)}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Pace /km</div>
            </div>
          </div>

          {gpsError && <p className="text-xs text-red-400 text-center mb-4">{gpsError}</p>}

          <button
            onClick={() => setMapOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-full text-sm text-gray-300 transition-colors mb-4"
          >
            <Map size={16} className="text-brand" />
            Show Map
          </button>

          <GpsAccuracyPill accuracy={gpsAccuracy} />
        </div>

        <div className="flex justify-center" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 32px)' }}>
          <button
            onClick={stopRun}
            disabled={saving}
            className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 flex items-center justify-center shadow-xl transition-colors"
          >
            {saving ? (
              <span className="text-white text-xs font-bold">Saving</span>
            ) : (
              <Square size={28} fill="white" color="white" />
            )}
          </button>
        </div>
      </div>
    )
  }

  // ── Idle mode UI (history + start) ────────────────────────────────────────

  return (
    <div className="p-6 bg-jj-neutral dark:bg-gray-950 min-h-full">
      <h1 className="font-heading text-4xl mb-6 text-gray-900 dark:text-white">Runs</h1>

      {/* Recovered run banner */}
      {recoveredRun && (
        <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <p className="text-sm font-semibold text-yellow-400 mb-1">Interrupted run found</p>
          <p className="text-xs text-gray-400 mb-3">
            {recoveredRun.points.length} GPS points recorded before the session was interrupted.
            Save them to your history or discard.
          </p>
          <div className="flex gap-3">
            <button
              onClick={saveRecoveredRun}
              disabled={saving}
              className="flex-1 py-2 rounded-lg bg-brand text-gray-900 font-semibold text-sm disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save run'}
            </button>
            <button
              onClick={discardRecoveredRun}
              disabled={saving}
              className="flex-1 py-2 rounded-lg bg-gray-800 text-gray-300 text-sm disabled:opacity-50"
            >
              Discard
            </button>
          </div>
          {saveError && <p className="text-xs text-red-400 mt-2">{saveError}</p>}
        </div>
      )}

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
