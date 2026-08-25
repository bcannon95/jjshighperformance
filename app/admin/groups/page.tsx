'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Group = {
  id: number
  name: string
  description: string | null
  icon_url: string | null
  program_id: number | null
  leader_id: number | null
  created_at: string
}

type Member = {
  group_id: number
  client_id: number
  role: string | null
  joined_at: string
}

function initials(name: string) {
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

function formatDate(value: string) {
  const date = new Date(value)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [programNames, setProgramNames] = useState<Map<number, string>>(new Map())
  const [trainerNames, setTrainerNames] = useState<Map<number, string>>(new Map())
  const [clientNames, setClientNames] = useState<Map<number, string>>(new Map())
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)

      const { data: groupRows } = await supabase
        .from('user_groups')
        .select('id, name, description, icon_url, program_id, leader_id, created_at')
        .order('created_at', { ascending: false })

      const groupList = groupRows || []
      setGroups(groupList)

      const groupIds = groupList.map((g) => g.id)
      const programIds = Array.from(new Set(groupList.map((g) => g.program_id).filter((id): id is number => id !== null)))
      const leaderIds = Array.from(new Set(groupList.map((g) => g.leader_id).filter((id): id is number => id !== null)))

      const [programsRes, trainersRes, membersRes] = await Promise.all([
        programIds.length > 0
          ? supabase.from('programs').select('id, name').in('id', programIds)
          : Promise.resolve({ data: [] as { id: number; name: string }[] }),
        leaderIds.length > 0
          ? supabase.from('trainers').select('id, first_name, last_name').in('id', leaderIds)
          : Promise.resolve({ data: [] as { id: number; first_name: string; last_name: string }[] }),
        groupIds.length > 0
          ? supabase.from('user_group_members').select('group_id, client_id, role, joined_at').in('group_id', groupIds)
          : Promise.resolve({ data: [] as Member[] }),
      ])

      const programMap = new Map<number, string>()
      ;(programsRes.data || []).forEach((p) => programMap.set(p.id, p.name))
      setProgramNames(programMap)

      const trainerMap = new Map<number, string>()
      ;(trainersRes.data || []).forEach((t) => trainerMap.set(t.id, (t.first_name + ' ' + t.last_name).trim()))
      setTrainerNames(trainerMap)

      const memberList = membersRes.data || []
      setMembers(memberList)

      const clientIds = Array.from(new Set(memberList.map((m) => m.client_id)))
      const clientMap = new Map<number, string>()
      if (clientIds.length > 0) {
        const { data: clientRows } = await supabase
          .from('clients')
          .select('id, first_name, last_name')
          .in('id', clientIds)
        ;(clientRows || []).forEach((c) => clientMap.set(c.id, (c.first_name + ' ' + c.last_name).trim()))
      }
      setClientNames(clientMap)

      setLoading(false)
    }

    load()
  }, [])

  const filteredGroups = groups.filter((g) => {
    const query = search.trim().toLowerCase()
    if (!query) return true
    return g.name.toLowerCase().includes(query) || (g.description || '').toLowerCase().includes(query)
  })

  function membersFor(groupId: number) {
    return members.filter((m) => m.group_id === groupId)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Groups</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {groups.length} group{groups.length === 1 ? '' : 's'}
        </span>
      </div>

      <input
        type="text"
        placeholder="Search groups..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand w-full max-w-sm"
      />

      <div className="space-y-4">
        {loading && (
          <div className="rounded-xl border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading groups...
          </div>
        )}

        {!loading && filteredGroups.length === 0 && (
          <div className="rounded-xl border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No groups found.
          </div>
        )}

        {!loading &&
          filteredGroups.map((group) => {
            const groupMembers = membersFor(group.id)
            const isExpanded = expandedId === group.id
            const programName = group.program_id !== null ? programNames.get(group.program_id) : undefined
            const leaderName = group.leader_id !== null ? trainerNames.get(group.leader_id) : undefined

            return (
              <div
                key={group.id}
                className="rounded-xl border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : group.id)}
                  className="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-jj-neutral/50 dark:hover:bg-gray-800/50"
                >
                  {group.icon_url ? (
                    <img src={group.icon_url} alt={group.name} className="h-10 w-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white shrink-0">
                      {initials(group.name)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900 dark:text-white">{group.name}</p>
                    {group.description && (
                      <p className="truncate text-sm text-gray-500 dark:text-gray-400">{group.description}</p>
                    )}
                  </div>

                  <div className="hidden shrink-0 items-center gap-6 text-sm text-gray-500 dark:text-gray-400 sm:flex">
                    <span>{programName || 'No program'}</span>
                    <span>{leaderName || 'No leader'}</span>
                    <span>{groupMembers.length} member{groupMembers.length === 1 ? '' : 's'}</span>
                    <span>{formatDate(group.created_at)}</span>
                  </div>

                  <span className="shrink-0 text-gray-400 dark:text-gray-500">{isExpanded ? String.fromCharCode(9650) : String.fromCharCode(9660)}</span>
                </button>

                {isExpanded && (
                  <div className="border-t border-jj-grey/10 dark:border-gray-800">
                    {groupMembers.length === 0 ? (
                      <p className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        No members in this group yet.
                      </p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-800 text-left text-gray-500 dark:text-gray-400">
                          <tr>
                            <th className="px-4 py-3 font-medium">Client</th>
                            <th className="px-4 py-3 font-medium">Role</th>
                            <th className="px-4 py-3 font-medium">Joined</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-jj-grey/10 dark:divide-gray-800">
                          {groupMembers.map((member) => (
                            <tr key={member.client_id} className="hover:bg-jj-neutral/50 dark:hover:bg-gray-800/50">
                              <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                                {clientNames.get(member.client_id) || 'Unknown client'}
                              </td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{member.role || String.fromCharCode(8212)}</td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatDate(member.joined_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )
          })}
      </div>

      
    </div>
  )
}
