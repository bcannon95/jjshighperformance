'use client'
import { useState, useEffect } from 'react'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

type WeightLog = { logged_at: string; weight_kg: number }
type BiometricLog = { logged_at: string; metric: string; value: number; unit: string }
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

// Known metric names from Trainerize biometric_logs and their display config
const BIOMETRIC_MAP: Record<string, { label: string; lowerIsBetter: boolean }> = {
  body_fat_pct:      { label: 'Body Fat',     lowerIsBetter: true  },
  body_fat:          { label: 'Body Fat',     lowerIsBetter: true  },
  body_fat_percent:  { label: 'Body Fat',     lowerIsBetter: true  },
  muscle_mass_kg:    { label: 'Muscle Mass',  lowerIsBetter: false },
  muscle_mass:       { label: 'Muscle Mass',  lowerIsBetter: false },
  lean_mass_kg:      { label: 'Lean Mass',    lowerIsBetter: false },
  bmi:               { label: 'BMI',          lowerIsBetter: true  },
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

function fmt(val: number | null | undefined, suffix = ''): string {
  if (val == null) return '—'
  return `${val}${suffix}`
}

function fmtChange(diff: number | null, suffix = ''): { text: string; positive: boolean } {
  if (diff == null) return { text: '—', positive: true }
  const sign = diff > 0 ? '+' : ''
  return { text: `${sign}${diff.toFixed(1)}${suffix}`, positive: diff > 0 }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-24 text-sm text-gray-400 dark:text-gray-600 italic">
      {message}
    </div>
  )
}

export default function ProgressPage() {
  const { clientId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [weightLogs, setWeightLogs]       = useState<WeightLog[]>([])
  const [biometrics, setBiometrics]       = useState<BiometricLog[]>([])
  const [measurementLogs, setMeasurementLogs] = useState<MeasurementLog[]>([])

  useEffect(() => {
    if (!clientId) return
    async function load() {
      setLoading(true)
      const [wRes, bRes, mRes] = await Promise.all([
        supabase
          .from('body_weight_logs')
          .select('logged_at, weight_kg')
          .eq('client_id', clientId)
          .order('logged_at', { ascending: true })
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
      ])
      if (wRes.data) setWeightLogs(wRes.data)
      if (bRes.data) setBiometrics(bRes.data)
      if (mRes.data) setMeasurementLogs(mRes.data)
      setLoading(false)
    }
    load()
  }, [clientId])

  // ── Derived: weight ────────────────────────────────────────────────────────
  const firstWeight  = weightLogs[0]?.weight_kg ?? null
  const latestWeight = weightLogs[weightLogs.length - 1]?.weight_kg ?? null
  const weightDiff   = firstWeight != null && latestWeight != null ? latestWeight - firstWeight : null

  // ── Derived: biometrics (latest & first per metric) ───────────────────────
  function latestBiometric(keys: string[]) {
    const rows = biometrics.filter((b) => keys.includes(b.metric))
    return rows[rows.length - 1] ?? null
  }
  function firstBiometric(keys: string[]) {
    const rows = biometrics.filter((b) => keys.includes(b.metric))
    return rows[0] ?? null
  }

  const bodyFatKeys    = ['body_fat_pct', 'body_fat', 'body_fat_percent']
  const muscleKeys     = ['muscle_mass_kg', 'muscle_mass', 'lean_mass_kg']
  const bmiKeys        = ['bmi']

  const latestBF   = latestBiometric(bodyFatKeys)
  const firstBF    = firstBiometric(bodyFatKeys)
  const bfDiff     = latestBF && firstBF ? latestBF.value - firstBF.value : null

  const latestMM   = latestBiometric(muscleKeys)
  const firstMM    = firstBiometric(muscleKeys)
  const mmDiff     = latestMM && firstMM ? latestMM.value - firstMM.value : null

  const latestBMI  = latestBiometric(bmiKeys)
  const firstBMI   = firstBiometric(bmiKeys)
  const bmiDiff    = latestBMI && firstBMI ? latestBMI.value - firstBMI.value : null

  // ── Derived: measurements ──────────────────────────────────────────────────
  const firstMeasurement  = measurementLogs[0] ?? null
  const latestMeasurement = measurementLogs[measurementLogs.length - 1] ?? null

  // ── Weight chart ───────────────────────────────────────────────────────────
  const chartData = weightLogs.slice(-8)
  const chartMax  = chartData.length ? Math.max(...chartData.map((d) => d.weight_kg)) : 1
  const chartMin  = chartData.length ? Math.min(...chartData.map((d) => d.weight_kg)) : 0
  const chartRange = chartMax - chartMin || 1

  // ── Metric cards config ────────────────────────────────────────────────────
  const metricCards = [
    {
      label:   'Weight',
      current: fmt(latestWeight, ' kg'),
      change:  fmtChange(weightDiff, ' kg'),
      lowerIsBetter: true,
      hasData: latestWeight != null,
    },
    {
      label:   'Body Fat',
      current: latestBF ? `${latestBF.value}${latestBF.unit || '%'}` : '—',
      change:  fmtChange(bfDiff, latestBF?.unit || '%'),
      lowerIsBetter: true,
      hasData: latestBF != null,
    },
    {
      label:   latestMM ? (BIOMETRIC_MAP[latestMM.metric]?.label ?? 'Muscle Mass') : 'Muscle Mass',
      current: latestMM ? `${latestMM.value}${latestMM.unit || ' kg'}` : '—',
      change:  fmtChange(mmDiff, latestMM?.unit || ' kg'),
      lowerIsBetter: false,
      hasData: latestMM != null,
    },
    {
      label:   'BMI',
      current: latestBMI ? `${latestBMI.value}` : '—',
      change:  fmtChange(bmiDiff, ''),
      lowerIsBetter: true,
      hasData: latestBMI != null,
    },
  ]

  if (loading) {
    return (
      <div className="p-8 bg-jj-neutral dark:bg-gray-950 min-h-full">
        <h1 className="font-heading text-4xl mb-6 text-gray-900 dark:text-white">Progress</h1>
        <div className="text-sm text-gray-400 dark:text-gray-600">Loading…</div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-jj-neutral dark:bg-gray-950 min-h-full">
      <h1 className="font-heading text-4xl mb-6 text-gray-900 dark:text-white">Progress</h1>

      {/* ── Metric cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3.5 mb-8">
        {metricCards.map((m) => {
          const diff = m.change.text
          const noChange = diff === '—' || diff === '+0.0' || diff === '0.0'
          const isGood = noChange
            ? null
            : m.lowerIsBetter
              ? m.change.positive === false  // went down = good
              : m.change.positive === true   // went up = good
          return (
            <div key={m.label} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-jj-grey/30 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{m.label}</div>
              <div className="text-2xl font-bold mb-1.5 text-gray-900 dark:text-white">{m.current}</div>
              {m.hasData && !noChange ? (
                <div className={`flex items-center gap-1 text-[13px] font-medium ${
                  isGood === true  ? 'text-jj-forest dark:text-green-400' :
                  isGood === false ? 'text-jj-coral dark:text-red-400' :
                  'text-gray-400 dark:text-gray-500'
                }`}>
                  {m.change.positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {m.change.text} vs start
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[13px] text-gray-400 dark:text-gray-600">
                  <Minus size={14} /> No data
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Weight trend chart ────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-jj-grey/30 dark:border-gray-700 mb-6">
        <h2 className="font-heading text-2xl mb-5 text-gray-900 dark:text-white">
          Weight Trend {chartData.length > 0 && `(${chartData.length} entries)`}
        </h2>
        {chartData.length === 0 ? (
          <EmptyState message="No weight entries logged yet." />
        ) : (
          <div className="flex items-end gap-2 h-32">
            {chartData.map((d, i) => {
              const pct = (d.weight_kg - chartMin) / chartRange
              const barH = Math.max(16, Math.round((1 - pct) * 100) + 16)
              const isLast = i === chartData.length - 1
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-brand">{d.weight_kg}</span>
                  <div
                    className={`w-full rounded-t ${isLast ? 'bg-brand' : 'bg-brand/30'}`}
                    style={{ height: barH }}
                  />
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 text-center leading-tight">
                    {formatDate(d.logged_at)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Body measurements ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-jj-grey/30 dark:border-gray-700">
        <h2 className="font-heading text-2xl mb-4 text-gray-900 dark:text-white">Body Measurements</h2>
        {!latestMeasurement ? (
          <EmptyState message="No measurements logged yet." />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {MEASUREMENT_FIELDS.map(({ key, label }) => {
              const latest = latestMeasurement[key] as number | null
              const first  = firstMeasurement?.[key] as number | null
              if (latest == null && first == null) return null
              const diff = latest != null && first != null ? latest - first : null
              const { text: changeText, positive } = fmtChange(diff, ' cm')
              const isGood = diff == null ? null : diff < 0  // smaller measurements generally good
              return (
                <div key={key} className="bg-jj-neutral dark:bg-gray-900 rounded-lg p-3.5">
                  <div className="font-semibold text-sm mb-2 text-gray-900 dark:text-white">{label}</div>
                  {first != null && (
                    <div className="flex justify-between text-[13px] mb-1">
                      <span className="text-gray-500 dark:text-gray-400">Start</span>
                      <span className="text-gray-900 dark:text-gray-200">{fmt(first, ' cm')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[13px] mb-1.5">
                    <span className="text-gray-500 dark:text-gray-400">Now</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{fmt(latest, ' cm')}</span>
                  </div>
                  {diff != null && (
                    <div className={`text-xs font-semibold ${
                      isGood ? 'text-jj-forest dark:text-green-400' : 'text-jj-coral dark:text-red-400'
                    }`}>
                      {changeText}
                    </div>
                  )}
                </div>
              )
            }).filter(Boolean)}
          </div>
        )}
      </div>
    </div>
  )
}
