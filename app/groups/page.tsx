'use client'
import { useState } from 'react'
import { Users, Lock } from 'lucide-react'

export default function GroupsPage() {
  const [joined, setJoined] = useState([0, 2])
  const groups = [
    { id: 0, name: 'Weight Loss Warriors', members: 142, desc: 'Support group for sustainable weight loss journeys', icon: '⚖️', private: false },
    { id: 1, name: 'Strength & Power', members: 89, desc: 'Heavy lifting, powerlifting, and strength training focused', icon: '🏋️', private: false },
    { id: 2, name: 'JJS Health Clients', members: 34, desc: 'Private group for JJS Health & Fitness clients only', icon: '🌟', private: true },
    { id: 3, name: 'Morning Warriors', members: 67, desc: 'Early risers who train before 7am every day', icon: '🌅', private: false },
    { id: 4, name: 'Nutrition Nerds', members: 203, desc: 'Deep dive into nutrition science and meal planning', icon: '🥗', private: false },
    { id: 5, name: 'Running Club', members: 118, desc: 'Casual and competitive runners of all abilities welcome', icon: '🏃', private: false },
  ]
  const toggle = (id: number) => setJoined(j => j.includes(id) ? j.filter(x => x !== id) : [...j, id])

  return (
    <div className="p-8 bg-jj-neutral dark:bg-gray-950 min-h-full">
      <h1 className="font-heading text-4xl mb-2 text-gray-900 dark:text-white">Groups</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Connect with others on the same journey</p>
      <div className="grid grid-cols-2 gap-4">
        {groups.map((g) => {
          const isJoined = joined.includes(g.id)
          return (
            <div
              key={g.id}
              className={`bg-white dark:bg-gray-800 rounded-xl p-6 border transition-colors ${
                isJoined
                  ? 'border-2 border-brand'
                  : 'border border-jj-grey/30 dark:border-gray-700'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{g.icon}</span>
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white">
                      {g.name}
                      {g.private && <Lock size={13} className="text-jj-grey dark:text-gray-500" />}
                    </div>
                    <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-[13px] mt-0.5">
                      <Users size={13} />{g.members} members
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toggle(g.id)}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-semibold border transition-colors ${
                    isJoined
                      ? 'border-brand bg-brand/10 text-gray-900 dark:text-gray-100'
                      : 'border-jj-grey/40 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-brand/50'
                  }`}
                >
                  {isJoined ? 'Joined' : 'Join'}
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{g.desc}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
