'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

type Badge = {
  id: number
  name: string
  description: string | null
  icon_url: string | null
}

type ClientBadge = {
  badge_id: number
  earned_at: string
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function BadgesPage() {
  const { clientId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [allBadges, setAllBadges] = useState<Badge[]>([])
  const [earnedMap, setEarnedMap] = useState<Map<number, string>>(new Map())

  useEffect(() => {
    if (!clientId) return
    async function load() {
      setLoading(true)
      const [badgesRes, earnedRes] = await Promise.all([
        supabase.from('badges').select('id, name, description, icon_url').order('id'),
        supabase
          .from('client_badges')
          .select('badge_id, earned_at')
          .eq('client_id', clientId),
      ])
      if (badgesRes.data) setAllBadges(badgesRes.data)
      if (earnedRes.data) {
        setEarnedMap(new Map(earnedRes.data.map((r: ClientBadge) => [r.badge_id, r.earned_at])))
      }
      setLoading(false)
    }
    load()
  }, [clientId])

  const earned = allBadges.filter(b => earnedMap.has(b.id))
  const locked = allBadges.filter(b => !earnedMap.has(b.id))

  if (loading) {
    return (
      <div className="p-8 bg-jj-neutral dark:bg-gray-950 min-h-full flex items-center justify-center">
        <p className="text-gray-400">Loading badges...</p>
      </div>
    )
  }

  return (
    <div className="p-8 bg-jj-neutral dark:bg-gray-950 min-h-full">
      <h1 className="font-heading text-4xl mb-2 text-gray-900 dark:text-white">Badges</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        You have earned {earned.length} of {allBadges.length} badges
      </p>

      {earned.length > 0 && (
        <>
          <h2 className="font-heading text-2xl mb-4 text-gray-900 dark:text-white">Earned Badges</h2>
          <div className="grid grid-cols-3 gap-4 mb-10">
            {earned.map(b => (
              <div
                key={b.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center border-2 border-brand"
                style={{ boxShadow: '0 2px 8px rgba(212,222,38,0.15)' }}
              >
                <div className="text-4xl mb-3">{b.icon_url}</div>
                <div className="font-bold mb-1.5 text-gray-900 dark:text-white">{b.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{b.description}</div>
                <div className="text-[11px] text-brand font-semibold">
                  Earned {formatDate(earnedMap.get(b.id)!)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="font-heading text-2xl mb-4 text-gray-900 dark:text-white">Locked Badges</h2>
      {locked.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500 italic">All badges earned!</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {locked.map(b => (
            <div
              key={b.id}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center border border-jj-grey/30 dark:border-gray-700 opacity-60"
            >
              <div className="text-4xl mb-3 grayscale">{b.icon_url}</div>
              <div className="font-bold mb-1.5 text-gray-900 dark:text-white">{b.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{b.description}</div>
              <div className="text-[11px] text-jj-grey dark:text-gray-500 mt-2">Locked</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
