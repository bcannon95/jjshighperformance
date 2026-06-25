'use client'
import { useState } from 'react'

type MealType = 'Breakfast' | 'Lunch' | 'Snack' | 'Dinner'

const typeStyles: Record<MealType, { bg: string; text: string }> = {
  Breakfast: { bg: 'bg-jj-orange/20', text: 'text-jj-orange' },
  Lunch:     { bg: 'bg-jj-blue/20',   text: 'text-jj-blue'   },
  Snack:     { bg: 'bg-brand/20',     text: 'text-gray-700 dark:text-gray-200' },
  Dinner:    { bg: 'bg-jj-coral/20',  text: 'text-jj-coral'  },
}

export default function MealPlanPage() {
  const [day, setDay] = useState(0)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const meals: Record<number, { type: MealType; name: string; cal: number; p: number; c: number; f: number; time: string }[]> = {
    0: [
      { type: 'Breakfast', name: 'Oats with Berries',   cal: 380, p: 18, c: 58, f: 9,  time: '7:00 AM'  },
      { type: 'Lunch',     name: 'Chicken & Rice Bowl', cal: 520, p: 42, c: 55, f: 8,  time: '12:30 PM' },
      { type: 'Snack',     name: 'Greek Yogurt',        cal: 150, p: 17, c: 10, f: 3,  time: '3:30 PM'  },
      { type: 'Dinner',    name: 'Salmon with Veggies', cal: 480, p: 38, c: 22, f: 22, time: '7:00 PM'  },
    ],
    1: [
      { type: 'Breakfast', name: 'Protein Pancakes', cal: 410, p: 32, c: 48, f: 8,  time: '7:00 AM'  },
      { type: 'Lunch',     name: 'Turkey Wrap',      cal: 490, p: 38, c: 46, f: 12, time: '12:30 PM' },
      { type: 'Snack',     name: 'Almonds',          cal: 170, p: 6,  c: 6,  f: 15, time: '3:30 PM'  },
      { type: 'Dinner',    name: 'Beef Stir Fry',    cal: 510, p: 36, c: 42, f: 16, time: '7:00 PM'  },
    ],
  }
  const todayMeals = meals[day] ?? meals[0]
  const totals = todayMeals.reduce((a, m) => ({ cal: a.cal + m.cal, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f }), { cal: 0, p: 0, c: 0, f: 0 })

  const macroCards = [
    { label: 'Calories', val: totals.cal, unit: 'kcal', color: 'text-jj-orange' },
    { label: 'Protein',  val: totals.p,   unit: 'g',    color: 'text-jj-blue'   },
    { label: 'Carbs',    val: totals.c,   unit: 'g',    color: 'text-brand'     },
    { label: 'Fat',      val: totals.f,   unit: 'g',    color: 'text-jj-teal'   },
  ]

  return (
    <div className="p-8 bg-jj-neutral dark:bg-gray-950 min-h-full">
      <h1 className="font-heading text-4xl mb-6 text-gray-900 dark:text-white">Meal Plan</h1>

      {/* Day picker */}
      <div className="flex gap-2 mb-7 bg-white dark:bg-gray-800 p-2 rounded-xl border border-jj-grey/30 dark:border-gray-700">
        {days.map((d, i) => (
          <button
            key={i}
            onClick={() => setDay(i)}
            className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-colors ${
              day === i
                ? 'bg-gray-900 text-brand font-bold'
                : 'text-gray-700 dark:text-gray-300 hover:bg-jj-neutral dark:hover:bg-gray-700'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Macro totals */}
      <div className="grid grid-cols-4 gap-3 mb-7">
        {macroCards.map((m, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-jj-grey/30 dark:border-gray-700 text-center">
            <div className={`text-2xl font-bold ${m.color}`}>{m.val}{m.unit}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Meal rows */}
      <div className="flex flex-col gap-3">
        {todayMeals.map((m, i) => {
          const style = typeStyles[m.type]
          return (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl px-5 py-4 border border-jj-grey/30 dark:border-gray-700 flex justify-between items-center">
              <div className="flex items-center gap-3.5">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
                  {m.type}
                </span>
                <div>
                  <div className="font-semibold text-sm text-gray-900 dark:text-white">{m.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{m.time}</div>
                </div>
              </div>
              <div className="flex gap-4 text-[13px] text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-jj-orange">{m.cal} kcal</span>
                <span>P: {m.p}g</span>
                <span>C: {m.c}g</span>
                <span>F: {m.f}g</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
