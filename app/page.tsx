'use client';
import { useState } from 'react';
import {
  Settings,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Utensils,
  Trophy,
} from 'lucide-react';

const progressWidgets = [
  { label: 'Steps', value: null, unit: '', date: null },
  { label: 'Sleep', value: null, unit: '', date: null },
  { label: 'Caloric Burn', value: null, unit: '', date: null },
  { label: 'Body Weight', value: 65, unit: 'kg', date: '4 Feb 2026' },
  { label: 'Body Fat', value: null, unit: '', date: null },
  { label: 'Photos', value: null, unit: '', date: null },
  { label: 'Caloric Intake', value: null, unit: '', date: null },
  { label: 'Resting HR', value: null, unit: '', date: null },
  { label: 'Blood Pressure', value: null, unit: '', date: null },
  { label: 'Lean Mass', value: null, unit: '', date: null },
];

const macros = [
  { label: 'Calories', target: 2600, consumed: 0 },
  { label: 'Protein', target: 195, consumed: 0 },
  { label: 'Carbs', target: 260, consumed: 0 },
  { label: 'Fat', target: 87, consumed: 0 },
];

export default function Dashboard() {
  const [done, setDone] = useState(false);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold tracking-widest text-gray-700 uppercase">
            Things To Do Today
          </h2>
          <div className="flex items-center gap-2 text-blue-400">
            <button className="hover:text-blue-600 p-1">
              <Plus size={16} />
            </button>
            <button className="hover:text-blue-600 p-1">
              <Calendar size={16} />
            </button>
            <button className="hover:text-blue-600 p-1">
              <ChevronLeft size={16} />
            </button>
            <button className="hover:text-blue-600 p-1">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <button
            onClick={() => setDone(!done)}
            className="w-6 h-6 rounded-full border-2 border-gray-300 mt-1 shrink-0 flex items-center justify-center"
          >
            {done && <div className="w-3 h-3 rounded-full bg-green-500" />}
          </button>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium text-sm text-gray-700">
                Hit your daily nutrition goal
              </p>
              <Utensils size={16} className="text-gray-400" />
            </div>
            <div className="space-y-3">
              {macros.map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>
                      {m.label} {m.target}
                    </span>
                    <span>{m.target - m.consumed} remaining</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold tracking-widest text-gray-700 uppercase">
            Progress
          </h2>
          <div className="flex gap-2 text-blue-500">
            <button>
              <TrendingUp size={18} />
            </button>
            <button>
              <Settings size={18} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {progressWidgets.map((w) => (
            <div
              key={w.label}
              className="border border-gray-100 rounded-lg p-4 min-h-24"
            >
              <p className="text-sm font-medium text-gray-700">{w.label}</p>
              {w.date && (
                <p className="text-xs text-gray-400 mt-0.5">{w.date}</p>
              )}
              {w.value !== null ? (
                <div className="mt-2">
                  <span className="text-3xl font-bold text-gray-800">
                    {w.value}
                  </span>
                  <span className="text-sm text-gray-400 ml-1">{w.unit}</span>
                </div>
              ) : (
                <p className="text-gray-200 text-xl mt-3">···</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold tracking-widest text-gray-700 uppercase">
            Achievements
          </h2>
          <Trophy size={18} className="text-blue-500" />
        </div>
        <div className="flex flex-col items-center py-10 text-center">
          <div className="w-16 h-16 rounded-full border-2 border-gray-200 flex items-center justify-center mb-3">
            <Trophy size={24} className="text-gray-300" />
          </div>
          <p className="font-medium text-gray-600">
            No personal best or goals hit yet!
          </p>
          <p className="text-sm text-gray-400 mt-1 max-w-xs">
            Start tracking a few workouts or logging some activity to create
            your first personal best.
          </p>
        </div>
      </div>
    </div>
  );
}
