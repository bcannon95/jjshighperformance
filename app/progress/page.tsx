'use client'
import { useState, useEffect } from 'react'
import { TrendingDown, TrendingUp, Minus, Plus, X, Scale, Activity } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

type WeightLog = { logged_at: string; weight_kg: number }
type BiometricLog = { logged_at: string; metric: string; value: number; unit: string }
type RunSummary = { started_at: string; distance_m: number }
type MeasurementLog = {
  logged_at: string
  neck_cm: number | null
  chest_cm: number | null
  waist_cm: number | null
  hips_cm: number | null
  left_arm_cm: number | null
  right_arm_cm: number | null
  left_thigh_cm: number | null
  right_thigh_cm: number | null
  left_calf_cm: number | null
  right_calf_cm: number | null
}

const MEASUREMENT_FIELDS: { key: keyof MeasurementLog; label: string }[] = [
  { key: 'chest_cm',       label: 'Chest'       },
  { key: 'waist_cm',       label: 'Waist'       },
  { key: 'hips_cm',        label: 'Hips'        },
  { key: 'left_arm_cm',    label: 'Left Arm'    },
  { key: 'right_arm_cm',   label: 'Right Arm'   },
  { key: 'left_thigh_cm',  label: 'Left Thigh'  },
  { key: 'right_thigh_cm', label: 'Right Thigh' },
  { key: 'left_calf_cm',   label: 'Left Calf'   },
  { key: 'right_calf_cm',  label: 'Right Calf'  },
  { key: 'neck_cm',        label: 'Neck'        },
]

function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function fmtDiff(diff: number | null, suffix = ''): { text: string; positive: boolean } {
  if (diff == null) return { text: '—', positive: true }
  const sign = diff > 0 ? '+' : ''
  return { text: `${sign}${diff.toFixed(1)}${suffix}`, positive: diff > 0 }
}

// ── SVG line chart ─────────────────────────────────────────────────────────────
function LineChart({ data, color = '#d4de26' }: { data: { x: string; y: number }[]; color?: string }) {
  if (data.length < 2) return null
  const W = 400, H = 100, PAD = 4
  const ys = data.map(d => d.y)
  const min = Math.min(...ys), max = Math.max(...ys)
  const range = max - min || 1
  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2)
    const y = H - PAD - ((d.y - min) / range) * (H - PAD * 2)
    return `${x},${y}`
  })
  const lastPt = pts[pts.length - 1].split(',')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 80 }}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastPt[0]} cy={lastPt[1]} r="4" fill={color} />
    </svg>
  )
}

export default function ProgressPage() {
  const { clientId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [weightLogs, setWeightLogs]           = useState<WeightLog[]>([])
  const [biometrics, setBiometrics]           = useState<BiometricLog[]>([])
  const [measurementLogs, setMeasurementLogs] = useState<MeasurementLog[]>([])
  const [runs, setRuns]                       = useState<RunSummary[]>([])

  // Modal state
  const [showWeightModal, setShowWeightModal]   = useState(false)
  const [showBioModal, setShowBioModal]         = useState(false)
  const [showMeasureModal, setShowMeasureModal] = useState(false)
  const [saving, setSaving]                     = useState(false)
  const [saveError, setSaveError]               = useState<string | null>(null)

  // Weight form
  const [weightInput, setWeightInput] = useState('')
  const [weightDate, setWeightDate]   = useState(todayLocal)

  // Biometrics form
  const [bioBodyFat, setBioBodyFat]       = useState('')
  const [bioMuscleMass, setBioMuscleMass] = useState('')
  const [bioDate, setBioDate]             = useState(todayLocal)

  // Measurements form
  const [measureDate, setMeasureDate]     = useState(todayLocal)
  const [measureInputs, setMeasureInputs] = useState<Record<string, string>>({})

  async function load() {
    if (!clientId) return
    setLoading(true)
    const [wRes, bRes, mRes, rRes] = await Promise.all([
      // Fetch last 12 by ordering DESC then reversing — fixes the "limit gets oldest" bug
      supabase
        .from('body_weight_logs')
        .select('logged_at, weight_kg')
        .eq('client_id', clientId)
        .order('logged_at', { ascending: false })
        .limit(12),
      supabase
        .from('biometric_logs')
        .select('logged_at, metric, value, unit')
        .eq('client_id', clientId)
        .order('logged_at', { ascending: true }),
      supabase
        .from('body_measurement_logs')
        .select('logged_at, neck_cm, chest_cm, waist_cm, hips_cm, left_arm_cm, right_arm_cm, left_thigh_cm, right_thigh_cm, left_calf_cm, right_calf_cm')
        .eq('client_id', clientId)
        .order('logged_at', { ascending: true }),
      supabase
        .from('runs')
        .select('started_at, distance_m')
        .eq('client_id', clientId)
        .not('finished_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(8),
    ])
    // Reverse so charts read oldest → newest
    if (wRes.data) setWeightLogs([...wRes.data].reverse())
    if (bRes.data) setBiometrics(bRes.data)
    if (mRes.data) setMeasurementLogs(mRes.data)
    if (rRes.data) setRuns([...rRes.data].reverse())
    setLoading(false)
  }

  useEffect(() => { load() }, [clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save handlers ─────────────────────────────────────────────────────────

  async function saveWeight() {
    const kg = parseFloat(weightInput)
    if (!clientId || isNaN(kg) || kg <= 0) return
    setSaving(true); setSaveError(null)
    const { error } = await supabase.from('body_weight_logs').insert({
      client_id: clientId,
      weight_kg: kg,
      logged_at: new Date(weightDate + 'T07:00:00').toISOString(),
    })
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    setShowWeightModal(false); setWeightInput(''); setWeightDate(todayLocal())
    load()
  }

  async function saveBiometrics() {
    if (!clientId) return
    const ts = new Date(bioDate + 'T07:00:00').toISOString()
    const rows = [
      bioBodyFat   !== '' ? { client_id: clientId, metric: 'body_fat_pct',   value: parseFloat(bioBodyFat),   unit: '%',  logged_at: ts } : null,
      bioMuscleMass !== '' ? { client_id: clientId, metric: 'muscle_mass_kg', value: parseFloat(bioMuscleMass), unit: ' kg', logged_at: ts } : null,
    ].filter(Boolean) as { client_id: number; metric: string; value: number; unit: string; logged_at: string }[]
    if (!rows.length) return
    setSaving(true); setSaveError(null)
    const { error } = await supabase.from('biometric_logs').insert(rows)
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    setShowBioModal(false); setBioBodyFat(''); setBioMuscleMass(''); setBioDate(todayLocal())
    load()
  }

  async function saveMeasurements() {
    if (!clientId) return
    const row: Record<string, unknown> = {
      client_id: clientId,
      logged_at: new Date(measureDate + 'T07:00:00').toISOString(),
    }
    MEASUREMENT_FIELDS.forEach(({ key }) => {
      const v = measureInputs[key]
      row[key] = v !== undefined && v !== '' ? parseFloat(v) : null
    })
    if (!MEASUREMENT_FIELDS.some(({ key }) => row[key] != null)) return
    setSaving(true); setSaveError(null)
    const { error } = await supabase.from('body_measurement_logs').insert(row)
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    setShowMeasureModal(false); setMeasureInputs({}); setMeasureDate(todayLocal())
    load()
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const firstWeight  = weightLogs[0]?.weight_kg ?? null
  const latestWeight = weightLogs[weightLogs.length - 1]?.weight_kg ?? null
  const weightDiff   = firstWeight != null && latestWeight != null ? latestWeight - firstWeight : null

  const bodyFatKeys = ['body_fat_pct', 'body_fat', 'body_fat_percent']
  const muscleKeys  = ['muscle_mass_kg', 'muscle_mass', 'lean_mass_kg']
  const latestBF    = [...biometrics].reverse().find(b => bodyFatKeys.includes(b.metric)) ?? null
  const firstBF     = biometrics.find(b => bodyFatKeys.includes(b.metric)) ?? null
  const latestMM    = [...biometrics].reverse().find(b => muscleKeys.includes(b.metric)) ?? null
  const firstMM     = biometrics.find(b => muscleKeys.includes(b.metric)) ?? null

  const firstMeasurement  = measurementLogs[0] ?? null
  const latestMeasurement = measurementLogs[measurementLogs.length - 1] ?? null

  const totalDistM = runs.reduce((s, r) => s + Number(r.distance_m), 0)

  function fmtDist(m: number) {
    return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`
  }
  function fmtDistShort(m: number) {
    return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`
  }

  // ── Shared input style ────────────────────────────────────────────────────
  const inputCls = "w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-jj-blue"

  if (loading) {
    return (
      <div className="p-6 bg-jj-neutral dark:bg-gray-950 min-h-full">
        <h1 className="font-heading text-3xl mb-6 text-gray-900 dark:text-white">Progress</h1>
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-white dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 bg-jj-neutral dark:bg-gray-950 min-h-full space-y-4">
      <h1 className="font-heading text-3xl text-gray-900 dark:text-white">Progress</h1>

      {/* ── Top stat cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">

        {/* Body Weight */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 col-span-2">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Body Weight</p>
              {latestWeight != null ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">{latestWeight}</span>
                  <span className="text-base text-gray-400">kg</span>
                </div>
              ) : (
                <span className="text-3xl font-bold text-gray-200 dark:text-gray-700">—</span>
              )}
              {weightDiff != null && (() => {
                const { text, positive } = fmtDiff(weightDiff, ' kg')
                const down = !positive
                return (
                  <div className={`flex items-center gap-1 text-xs mt-1 font-medium ${down ? 'text-green-500' : 'text-jj-coral'}`}>
                    {down ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
                    {text} since start
                  </div>
                )
              })()}
            </div>
            <button
              onClick={() => { setSaveError(null); setWeightInput(''); setWeightDate(todayLocal()); setShowWeightModal(true) }}
              className="flex items-center gap-1 px-3 py-1.5 bg-jj-blue text-white text-xs font-semibold rounded-lg"
            >
              <Plus size={13} /> Log
            </button>
          </div>
          {weightLogs.length >= 2 ? (
            <LineChart data={weightLogs.map(w => ({ x: w.logged_at, y: w.weight_kg }))} />
          ) : weightLogs.length === 1 ? (
            <p className="text-xs text-gray-400 mt-2">Log more entries to see your trend.</p>
          ) : (
            <p className="text-xs text-gray-400 mt-2">No weight entries yet.</p>
          )}
          {weightLogs.length > 0 && (
            <div className="flex justify-between mt-2">
              <span className="text-[11px] text-gray-400">{formatDate(weightLogs[0].logged_at)}</span>
              <span className="text-[11px] text-gray-400">{formatDate(weightLogs[weightLogs.length - 1].logged_at)}</span>
            </div>
          )}
        </div>

        {/* Body Fat */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Body Fat</p>
          {latestBF ? (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{latestBF.value}</span>
                <span className="text-sm text-gray-400">{latestBF.unit || '%'}</span>
              </div>
              {firstBF && latestBF !== firstBF && (() => {
                const { text, positive } = fmtDiff(latestBF.value - firstBF.value, latestBF.unit || '%')
                return <p className={`text-xs mt-1 font-medium ${!positive ? 'text-green-500' : 'text-jj-coral'}`}>{text}</p>
              })()}
            </>
          ) : (
            <span className="text-2xl font-bold text-gray-200 dark:text-gray-700">—</span>
          )}
        </div>

        {/* Muscle Mass */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Muscle Mass</p>
          {latestMM ? (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{latestMM.value}</span>
                <span className="text-sm text-gray-400">{latestMM.unit || 'kg'}</span>
              </div>
              {firstMM && latestMM !== firstMM && (() => {
                const { text, positive } = fmtDiff(latestMM.value - firstMM.value, latestMM.unit || ' kg')
                return <p className={`text-xs mt-1 font-medium ${positive ? 'text-green-500' : 'text-jj-coral'}`}>{text}</p>
              })()}
            </>
          ) : (
            <span className="text-2xl font-bold text-gray-200 dark:text-gray-700">—</span>
          )}
        </div>

        {/* Log biometrics CTA */}
        <div className="col-span-2 flex justify-end -mt-1">
          <button
            onClick={() => { setSaveError(null); setBioBodyFat(''); setBioMuscleMass(''); setBioDate(todayLocal()); setShowBioModal(true) }}
            className="flex items-center gap-1.5 text-xs text-jj-blue font-medium"
          >
            <Plus size={13} /> Log biometrics
          </button>
        </div>
      </div>

      {/* ── Running ───────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">Running</p>
          <Activity size={16} className="text-gray-300 dark:text-gray-600" />
        </div>
        {runs.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-400">No runs recorded yet.</p>
            <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Use the Runs tab to track a GPS run.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-jj-neutral dark:bg-gray-900 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Total Runs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{runs.length}</p>
              </div>
              <div className="bg-jj-neutral dark:bg-gray-900 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Total Distance</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmtDist(totalDistM)}</p>
              </div>
            </div>
            {/* Run distance bars */}
            {runs.length >= 2 && (
              <>
                <p className="text-xs text-gray-400 mb-2">Last {runs.length} runs</p>
                <div className="flex items-end gap-1.5 h-20">
                  {(() => {
                    const maxDist = Math.max(...runs.map(r => Number(r.distance_m)))
                    return runs.map((r, i) => {
                      const pct = Number(r.distance_m) / maxDist
                      const isLast = i === runs.length - 1
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                          <span className="text-[9px] font-medium text-brand truncate w-full text-center">{fmtDistShort(Number(r.distance_m))}</span>
                          <div
                            className={`w-full rounded-t-sm ${isLast ? 'bg-brand' : 'bg-brand/30'}`}
                            style={{ height: `${Math.max(8, Math.round(pct * 60))}px` }}
                          />
                          <span className="text-[9px] text-gray-400 truncate w-full text-center">{formatDate(r.started_at)}</span>
                        </div>
                      )
                    })
                  })()}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* ── Body Measurements ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">Measurements</p>
          <button
            onClick={() => { setSaveError(null); setMeasureInputs({}); setMeasureDate(todayLocal()); setShowMeasureModal(true) }}
            className="flex items-center gap-1 text-xs text-jj-blue font-medium"
          >
            <Plus size={13} /> Log
          </button>
        </div>
        {!latestMeasurement ? (
          <div className="text-center py-6">
            <Scale size={24} className="mx-auto text-gray-200 dark:text-gray-700 mb-2" />
            <p className="text-sm text-gray-400">No measurements logged yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {MEASUREMENT_FIELDS.map(({ key, label }) => {
              const latest = latestMeasurement[key] as number | null
              const first  = firstMeasurement?.[key] as number | null
              if (latest == null) return null
              const diff = latest != null && first != null && first !== latest ? latest - first : null
              return (
                <div key={key} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
                  <div className="flex items-center gap-3">
                    {diff != null && (
                      <span className={`text-xs font-medium ${diff < 0 ? 'text-green-500' : 'text-jj-coral'}`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)} cm
                      </span>
                    )}
                    <span className="text-sm font-semibold text-gray-900 dark:text-white w-16 text-right">{latest} cm</span>
                  </div>
                </div>
              )
            }).filter(Boolean)}
          </div>
        )}
      </div>

      {/* ── Log Weight Modal ──────────────────────────────────────────────── */}
      {showWeightModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900 dark:text-white">Log Weight</h2>
              <button onClick={() => setShowWeightModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Weight (kg)</label>
                <input type="number" step="0.1" min="0" value={weightInput} onChange={e => setWeightInput(e.target.value)}
                  placeholder="e.g. 89.5" autoFocus className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Date</label>
                <input type="date" value={weightDate} onChange={e => setWeightDate(e.target.value)} className={inputCls} />
              </div>
              {saveError && <p className="text-xs text-red-500">{saveError}</p>}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowWeightModal(false)}
                className="flex-1 py-2.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-xl">
                Cancel
              </button>
              <button onClick={saveWeight} disabled={saving || weightInput === '' || isNaN(parseFloat(weightInput))}
                className="flex-1 py-2.5 text-sm font-semibold bg-jj-blue text-white rounded-xl disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Log Biometrics Modal ──────────────────────────────────────────── */}
      {showBioModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900 dark:text-white">Log Biometrics</h2>
              <button onClick={() => setShowBioModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Body Fat (%)</label>
                <input type="number" step="0.1" min="0" max="60" value={bioBodyFat} onChange={e => setBioBodyFat(e.target.value)}
                  placeholder="e.g. 18.5" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Muscle Mass (kg)</label>
                <input type="number" step="0.1" min="0" value={bioMuscleMass} onChange={e => setBioMuscleMass(e.target.value)}
                  placeholder="e.g. 72.0" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Date</label>
                <input type="date" value={bioDate} onChange={e => setBioDate(e.target.value)} className={inputCls} />
              </div>
              {saveError && <p className="text-xs text-red-500">{saveError}</p>}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowBioModal(false)}
                className="flex-1 py-2.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-xl">
                Cancel
              </button>
              <button onClick={saveBiometrics} disabled={saving || (bioBodyFat === '' && bioMuscleMass === '')}
                className="flex-1 py-2.5 text-sm font-semibold bg-jj-blue text-white rounded-xl disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Log Measurements Modal ────────────────────────────────────────── */}
      {showMeasureModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
              <h2 className="font-semibold text-gray-900 dark:text-white">Log Measurements</h2>
              <button onClick={() => setShowMeasureModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="px-6 pb-2 space-y-3 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Date</label>
                <input type="date" value={measureDate} onChange={e => setMeasureDate(e.target.value)} className={inputCls} />
              </div>
              <p className="text-xs text-gray-400">Leave blank any you don&apos;t have.</p>
              {MEASUREMENT_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{label} (cm)</label>
                  <input type="number" step="0.1" min="0" placeholder="—"
                    value={measureInputs[key] ?? ''}
                    onChange={e => setMeasureInputs(prev => ({ ...prev, [key]: e.target.value }))}
                    className={inputCls} />
                </div>
              ))}
              {saveError && <p className="text-xs text-red-500 pb-2">{saveError}</p>}
            </div>
            <div className="flex gap-2 px-6 py-4 shrink-0">
              <button onClick={() => setShowMeasureModal(false)}
                className="flex-1 py-2.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-xl">
                Cancel
              </button>
              <button
                onClick={saveMeasurements}
                disabled={saving || !MEASUREMENT_FIELDS.some(({ key }) => (measureInputs[key] ?? '') !== '')}
                className="flex-1 py-2.5 text-sm font-semibold bg-jj-blue text-white rounded-xl disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
