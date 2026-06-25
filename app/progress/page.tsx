'use client'
import { useState } from 'react'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'

export default function ProgressPage() {
  const [tab, setTab] = useState('weight')
  const metrics = [
    { label: 'Weight',      current: '72.4 kg', change: '-3.2 kg', trend: 'down', good: true  },
    { label: 'Body Fat',    current: '18.2%',   change: '-2.1%',   trend: 'down', good: true  },
    { label: 'Muscle Mass', current: '58.6 kg', change: '+1.4 kg', trend: 'up',   good: true  },
    { label: 'BMI',         current: '23.1',    change: '-0.8',    trend: 'down', good: true  },
  ]
  const weightData = [
    { week: 'Week 1', val: 75.6 },
    { week: 'Week 2', val: 74.8 },
    { week: 'Week 3', val: 74.1 },
    { week: 'Week 4', val: 73.5 },
    { week: 'Week 5', val: 73.0 },
    { week: 'Week 6', val: 72.4 },
  ]
  const maxVal = Math.max(...weightData.map(d => d.val))
  const minVal = Math.min(...weightData.map(d => d.val))
  const measurements = [
    { part: 'Chest',       start: '102 cm', current: '98 cm', change: '-4 cm' },
    { part: 'Waist',       start: '88 cm',  current: '83 cm', change: '-5 cm' },
    { part: 'Hips',        start: '96 cm',  current: '93 cm', change: '-3 cm' },
    { part: 'Left Arm',    start: '34 cm',  current: '35 cm', change: '+1 cm' },
    { part: 'Right Arm',   start: '34 cm',  current: '35 cm', change: '+1 cm' },
    { part: 'Left Thigh',  start: '58 cm',  current: '56 cm', change: '-2 cm' },
  ]

  return (
    <div className="p-8 bg-jj-neutral dark:bg-gray-950 min-h-full">
      <h1 className="font-heading text-4xl mb-6 text-gray-900 dark:text-white">Progress</h1>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-3.5 mb-8">
        {metrics.map((m, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-jj-grey/30 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{m.label}</div>
            <div className="text-2xl font-bold mb-1.5 text-gray-900 dark:text-white">{m.current}</div>
            <div className={`flex items-center gap-1 text-[13px] font-medium ${m.good ? 'text-jj-forest dark:text-green-400' : 'text-jj-coral dark:text-red-400'}`}>
              {m.trend === 'down' ? <TrendingDown size={14} /> : m.trend === 'up' ? <TrendingUp size={14} /> : <Minus size={14} />}
              {m.change} vs start
            </div>
          </div>
        ))}
      </div>

      {/* Weight chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-jj-grey/30 dark:border-gray-700 mb-6">
        <h2 className="font-heading text-2xl mb-5 text-gray-900 dark:text-white">Weight Trend (6 Weeks)</h2>
        <div className="flex items-end gap-2 h-32">
          {weightData.map((d, i) => {
            const pct = (d.val - minVal) / (maxVal - minVal || 1)
            const h = Math.max(20, Math.round((1 - pct) * 100) + 20)
            const isLast = i === weightData.length - 1
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[11px] font-semibold text-brand">{d.val}</span>
                <div
                  className={`w-full rounded-t ${isLast ? 'bg-brand' : 'bg-brand/30'}`}
                  style={{ height: h }}
                />
                <span className="text-[10px] text-gray-400 dark:text-gray-500">{d.week}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Measurements */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-jj-grey/30 dark:border-gray-700">
        <h2 className="font-heading text-2xl mb-4 text-gray-900 dark:text-white">Body Measurements</h2>
        <div className="grid grid-cols-3 gap-3">
          {measurements.map((m, i) => (
            <div key={i} className="bg-jj-neutral dark:bg-gray-900 rounded-lg p-3.5">
              <div className="font-semibold text-sm mb-2 text-gray-900 dark:text-white">{m.part}</div>
              <div className="flex justify-between text-[13px] mb-1">
                <span className="text-gray-500 dark:text-gray-400">Start</span>
                <span className="text-gray-900 dark:text-gray-200">{m.start}</span>
              </div>
              <div className="flex justify-between text-[13px] mb-1.5">
                <span className="text-gray-500 dark:text-gray-400">Now</span>
                <span className="font-semibold text-gray-900 dark:text-white">{m.current}</span>
              </div>
              <div className={`text-xs font-semibold ${m.change.startsWith('-') ? 'text-jj-forest dark:text-green-400' : 'text-jj-blue dark:text-jj-blue'}`}>
                {m.change}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
