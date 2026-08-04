'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

type Group = {
  id: number
  name: string
  description: string | null
  icon_url: string | null
  is_private: boolean
}

type Membership = {
  group_id: number
}

export default function GroupsPage() {
  const { clientId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<Group[]>([])
  const [memberCounts, setMemberCounts] = useState<Map<number, number>>(new Map())
  const [joinedIds, setJoinedIds] = useState<Set<number>>(new Set())
  const [toggling, setToggling] = useState<number | null>(null)

  useEffect(() => {
    if (!clientId) return
    async function load() {
      setLoading(true)
      const [groupsRes, membersRes, myRes] = await Promise.all([
        supabase.from('user_groups').select('id, name, description, icon_url, is_private').order('id'),
        supabase.from('user_group_members').select('group_id'),
        supabase.from('user_group_members').select('group_id').eq('client_id', clientId),
      ])

      if (groupsRes.data) setGroups(groupsRes.data)

      if (membersRes.data) {
        const counts = new Map<number, number>()
        for (const row of membersRes.data as Membership[]) {
          counts.set(row.group_id, (counts.get(row.group_id) ?? 0) + 1)
        }
        setMemberCounts(counts)
      }

      if (myRes.data) {
        setJoinedIds(new Set((myRes.data as Membership[]).map(r => r.group_id)))
      }

      setLoading(false)
    }
    load()
  }, [clientId])

  const toggle = useCallback(async (groupId: number) => {
    if (!clientId || toggling !== null) return
    setToggling(groupId)

    const isJoined = joinedIds.has(groupId)

    if (isJoined) {
      const { error } = await supabase
        .from('user_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('client_id', clientId)

      if (!error) {
        setJoinedIds(prev => { const next = new Set(prev); next.delete(groupId); return next })
        setMemberCounts(prev => new Map(prev).set(groupId, Math.max(0, (prev.get(groupId) ?? 1) - 1)))
      }
    } else {
      const { error } = await supabase
        .from('user_group_members')
        .insert({ group_id: groupId, client_id: clientId })

      if (!error) {
        setJoinedIds(prev => new Set(prev).add(groupId))
        setMemberCounts(prev => new Map(prev).set(groupId, (prev.get(groupId) ?? 0) + 1))
      }
    }

    setToggling(null)
  }, [clientId, joinedIds, toggling])

  if (loading) {
    return (
      <div className="p-8 bg-jj-neutral dark:bg-gray-950 min-h-full flex items-center justify-center">
        <p className="text-gray-400">Loading groups...</p>
      </div>
    )
  }

  return (
    <div className="p-8 bg-jj-neutral dark:bg-gray-950 min-h-full">
      <h1 className="font-heading text-4xl mb-2 text-gray-900 dark:text-white">Groups</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Connect with others on the same journey</p>
      <div className="grid grid-cols-2 gap-4">
        {groups.map(g => {
          const isJoined = joinedIds.has(g.id)
          const isToggling = toggling === g.id
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
                  <span className="text-3xl">{g.icon_url}</span>
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white">
                      {g.name}
                      {g.is_private && <Lock size={13} className="text-jj-grey dark:text-gray-500" />}
                    </div>
                    <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-[13px] mt-0.5">
                      <Users size={13} />
                      {memberCounts.get(g.id) ?? 0} members
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toggle(g.id)}
                  disabled={isToggling}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-semibold border transition-colors disabled:opacity-50 ${
                    isJoined
                      ? 'border-brand bg-brand/10 text-gray-900 dark:text-gray-100'
                      : 'border-jj-grey/40 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-brand/50'
                  }`}
                >
                  {isToggling ? '...' : isJoined ? 'Joined' : 'Join'}
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{g.description}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
