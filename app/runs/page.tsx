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

// ── Elevation profile chart ──────────────────────────────────────────────────

function ElevationProfile({ points }: { points: { altitude_m: number | null }[] }) {
  const alts = points.map((p) => p.altitude_m).filter((a): a is number => a !== null)
  if (alts.length < 2) return null

  const min = Math.min(...alts)
  const max = Math.max(...alts)
  const range = max - min || 1
  const W = 100
  const H = 40
  const pad = 2

  const coords = alts.map((a, i) => {
    const x = pad + (i / (alts.length - 1)) * (W - pad * 2)
    const y = pad + (1 - (a - min) / range) * (H - pad * 2)
    return `${x},${y}`
  })

  const line  = coords.join(' ')
  const area  = `${pad},${H - pad} ${line} ${W - pad},${H - pad}`
  const minAlt = Math.round(min)
  const maxAlt = Math.round(max)

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 56 }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="elev-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#d4de26" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#d4de26" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#elev-fill)" />
        <polyline points={line} fill="none" stroke="#d4de26" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      {/* Min / max labels */}
      <div className="absolute inset-x-0 top-0 flex justify-between px-0.5">
        <span className="text-[10px] text-gray-400">{minAlt} m</span>
        <span className="text-[10px] text-gray-400">{maxAlt} m</span>
      </div>
    </div>
  )
}

// ── Types ───────────────────────────────────────────────────────────────────

type RunPoint = { lat: number; lng: number; altitude_m: number | null; accuracy_m: number | null; recorded_at: string }

type Run = {
  id: number
  started_at: string
  finished_at: string | null
  distance_m: number
  duration_s: number
  avg_pace_s_per_km: number | null
  elevation_gain_m: number | null
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

function fmtElevation(m: number): string {
  return `+${Math.round(m)} m`
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
      GPS ±{accuracy} m
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
  const [runs, setRuns] = useState<Run[]>([])
  const [loadingRuns, setLoadingRuns] = useState(true)

  // Active run
  const [activePoints, setActivePoints]     = useState<RunPoint[]>([])
  const [elapsed, setElapsed]               = useState(0)
  const [distanceM, setDistanceM]           = useState(0)
  const [elevationGainM, setElevationGainM] = useState(0)
  const [gpsAccuracy, setGpsAccuracy]       = useState<number | null>(null)
  const [gpsError, setGpsError]             = useState<string | null>(null)
  const [saving, setSaving]                 = useState(false)

  // Selected history run (route view)
  const [selectedRunId, setSelectedRunId]       = useState<number | null>(null)
  const [selectedRunPoints, setSelectedRunPoints] = useState<RunPoint[]>([])
  const [loadingPoints, setLoadingPoints]       = useState(false)

  // Refs to avoid stale closures in callbacks
  const startTimeRef      = useRef<Date | null>(null)
  const watchIdRef        = useRef<number | null>(null)
  const timerRef          = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastPointRef      = useRef<RunPoint | null>(null)
  const distanceMRef      = useRef(0)
  const elapsedRef        = useRef(0)
  const elevationGainMRef = useRef(0)
  const lastAltitudeRef   = useRef<number | null>(null)

  // Sync refs
  useEffect(() => { distanceMRef.current = distanceM }, [distanceM])
  useEffect(() => { elapsedRef.current = elapsed }, [elapsed])

  // ── Load run history ──────────────────────────────────────────────────────

  const loadRuns = useCallback(async () => {
    if (!clientId) return
    setLoadingRuns(true)
    const { data } = await supabase
      .from('runs')
      .select('id, started_at, finished_at, distance_m, duration_s, avg_pace_s_per_km, elevation_gain_m')
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
    setGpsAccuracy(null)
    setActivePoints([])
    setDistanceM(0)
    setElapsed(0)
    setElevationGainM(0)
    lastPointRef.current      = null
    distanceMRef.current      = 0
    elapsedRef.current        = 0
    elevationGainMRef.current = 0
    lastAltitudeRef.current   = null

    const start = new Date()
    startTimeRef.current = start
    setMapOpen(false)
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
        const accuracy = pos.coords.accuracy
        const altitude = pos.coords.altitude
        setGpsAccuracy(Math.round(accuracy))

        // Discard points with very poor accuracy (> 50 m radius)
        if (accuracy > 50) return

        const point: RunPoint = {
          lat:         pos.coords.latitude,
          lng:         pos.coords.longitude,
          altitude_m:  altitude !== null ? Math.round(altitude * 10) / 10 : null,
          accuracy_m:  Math.round(accuracy * 10) / 10,
          recorded_at: new Date().toISOString(),
        }

        // Elevation gain: only count rises > 2 m to filter GPS noise
        if (altitude !== null) {
          if (lastAltitudeRef.current !== null) {
            const rise = altitude - lastAltitudeRef.current
            if (rise > 2) {
              elevationGainMRef.current += rise
              setElevationGainM(Math.round(elevationGainMRef.current))
            }
          }
          lastAltitudeRef.current = altitude
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
    const elevGain   = elevationGainMRef.current
    const avgPace    = distM > 0 ? Math.round((durationS / distM) * 1000) : null
    const pointsSnap = [...activePoints]

    const { data: runRow } = await supabase
      .from('runs')
      .insert({
        client_id:          clientId,
        started_at:         startTimeRef.current.toISOString(),
        finished_at:        new Date().toISOString(),
        distance_m:         Math.round(distM * 100) / 100,
        duration_s:         durationS,
        avg_pace_s_per_km:  avgPace,
        elevation_gain_m:   Math.round(elevGain * 100) / 100,
      })
      .select('id')
      .single()

    if (runRow && pointsSnap.length > 0) {
      await supabase.from('run_points').insert(
        pointsSnap.map((p) => ({
          run_id:      runRow.id,
          lat:         p.lat,
          lng:         p.lng,
          altitude_m:  p.altitude_m,
          accuracy_m:  p.accuracy_m,
          recorded_at: p.recorded_at,
        }))
      )
    }

    setSaving(false)
    setMode('idle')
    setActivePoints([])
    setElapsed(0)
    setDistanceM(0)
    setElevationGainM(0)
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

  // ── Running mode — full-screen map (Google/Apple Maps style) ───────────────

  if (mode === 'running' && mapOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950">
        {/* Full-screen map */}
        <div className="absolute inset-0">
          {activePoints.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gray-900 text-gray-400">
              <MapPin size={32} className="animate-pulse text-brand" />
              <span className="text-sm">Acquiring GPS signal…</span>
            </div>
          ) : (
            <RunMap points={activePoints} center={mapCenter} />
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
              <div className="text-center">
                <div className="text-xl font-bold text-brand">{fmtElevation(elevationGainM)}</div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wider mt-0.5">Elevation</div>
              </div>
            </div>
            <div className="flex justify-center mt-2">
              {gpsError
                ? <span className="text-[11px] text-red-400">{gpsError}</span>
                : <GpsAccuracyPill accuracy={gpsAccuracy} />}
            </div>
          </div>
        </div>

        {/* Elevation profile — floating strip above bottom controls */}
        {activePoints.some((p) => p.altitude_m !== null) && (
          <div
            className="absolute left-4 right-4 z-[1000]"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 124px)' }}
          >
            <div className="bg-gray-900/80 backdrop-blur-md rounded-xl px-3 pt-3 pb-2 border border-white/10">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Elevation</div>
              <ElevationProfile points={activePoints} />
            </div>
          </div>
        )}

        {/* Bottom controls — collapse + stop */}
        <div
          className="absolute left-0 right-0 z-[1000] px-6 flex items-center justify-between"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
        >
          {/* Collapse map */}
          <button
            onClick={() => setMapOpen(false)}
            className="w-12 h-12 rounded-full bg-gray-900/85 backdrop-blur-md border border-white/10 flex items-center justify-center text-white shadow-lg"
          >
            <ChevronDown size={20} />
          </button>

          {/* Stop button */}
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

          {/* Spacer for symmetry */}
          <div className="w-12" />
        </div>
      </div>
    )
  }

  // ── Running mode — stats only (map minimised) ──────────────────────────────

  if (mode === 'running') {
    return (
      <div className="flex flex-col h-full bg-gray-950">
        {/* Stats */}
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
            <div className="text-center">
              <div className="text-3xl font-bold text-brand">{fmtElevation(elevationGainM)}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Elevation</div>
            </div>
          </div>

          {gpsError && <p className="text-xs text-red-400 text-center mb-4">{gpsError}</p>}

          {/* Show map button */}
          <button
            onClick={() => setMapOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-full text-sm text-gray-300 transition-colors mb-4"
          >
            <Map size={16} className="text-brand" />
            Show Map
          </button>

          <GpsAccuracyPill accuracy={gpsAccuracy} />
        </div>

        {/* Stop button */}
        <div className="flex justify-center pb-10" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 32px)' }}>
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
                      {run.elevation_gain_m != null && run.elevation_gain_m > 0 && (
                        <>
                          <span>·</span>
                          <span>{fmtElevation(run.elevation_gain_m)}</span>
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
                  <>
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
                    {selectedRunPoints.some((p) => p.altitude_m !== null) && (
                      <div className="border-t border-jj-grey/20 dark:border-gray-700 px-4 pt-3 pb-4 bg-white dark:bg-gray-800">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Elevation Profile</div>
                        <ElevationProfile points={selectedRunPoints} />
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
