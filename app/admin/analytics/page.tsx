'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Breakdown {
  label: string;
  count: number;
}

interface Stats {
  totalClients: number;
  activeClients: number;
  totalTrainers: number;
  totalPrograms: number;
  totalAssignments: number;
  totalWorkouts: number;
}

interface ActivityCounts {
  scheduledSessions: number;
  runSessions: number;
  creditRecords: number;
  groupMembers: number;
}

function humanize(value: string | null | undefined) {
  if (!value) return 'Unspecified';
  const spaced = value.replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function buildBreakdown(values: (string | null)[]): Breakdown[] {
  const map = new Map<string, number>();
  values.forEach((v) => {
    const label = humanize(v);
    map.set(label, (map.get(label) ?? 0) + 1);
  });
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function BreakdownCard({ title, items }: { title: string; items: Breakdown[] }) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="rounded-xl border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden p-4">
      <h2 className="mb-4 text-sm font-semibold text-jj-grey dark:text-white">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-jj-grey/60 dark:text-gray-400">No data yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="w-36 shrink-0 truncate text-sm text-jj-grey dark:text-gray-300">{item.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-jj-neutral dark:bg-gray-800">
                <div className="h-full bg-brand" style={{ width: (item.count / max) * 100 + '%' }} />
              </div>
              <span className="w-8 shrink-0 text-right text-sm font-medium text-jj-grey dark:text-gray-100">{item.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden p-4">
      <p className="text-xs text-jj-grey/60 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-jj-grey dark:text-white">{value}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityCounts | null>(null);
  const [clientStatus, setClientStatus] = useState<Breakdown[]>([]);
  const [clientAccountType, setClientAccountType] = useState<Breakdown[]>([]);
  const [trainerRoles, setTrainerRoles] = useState<Breakdown[]>([]);
  const [programStatus, setProgramStatus] = useState<Breakdown[]>([]);

  useEffect(() => {
    async function load() {
      const [
        totalClientsRes,
        activeClientsRes,
        totalTrainersRes,
        totalProgramsRes,
        totalAssignmentsRes,
        totalWorkoutsRes,
        scheduledSessionsRes,
        runSessionsRes,
        creditRecordsRes,
        groupMembersRes,
        clientsRes,
        trainersRes,
        assignmentsRes,
      ] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('trainers').select('*', { count: 'exact', head: true }),
        supabase.from('programs').select('*', { count: 'exact', head: true }),
        supabase.from('client_programs').select('*', { count: 'exact', head: true }),
        supabase.from('workout_definitions').select('*', { count: 'exact', head: true }),
        supabase.from('calendar_events').select('*', { count: 'exact', head: true }),
        supabase.from('run_sessions').select('*', { count: 'exact', head: true }),
        supabase.from('session_credits').select('*', { count: 'exact', head: true }),
        supabase.from('user_group_members').select('*', { count: 'exact', head: true }),
        supabase.from('clients').select('status, account_type'),
        supabase.from('trainers').select('role'),
        supabase.from('client_programs').select('status'),
      ]);

      setStats({
        totalClients: totalClientsRes.count ?? 0,
        activeClients: activeClientsRes.count ?? 0,
        totalTrainers: totalTrainersRes.count ?? 0,
        totalPrograms: totalProgramsRes.count ?? 0,
        totalAssignments: totalAssignmentsRes.count ?? 0,
        totalWorkouts: totalWorkoutsRes.count ?? 0,
      });

      setActivity({
        scheduledSessions: scheduledSessionsRes.count ?? 0,
        runSessions: runSessionsRes.count ?? 0,
        creditRecords: creditRecordsRes.count ?? 0,
        groupMembers: groupMembersRes.count ?? 0,
      });

      const clientRows = clientsRes.data ?? [];
      setClientStatus(buildBreakdown(clientRows.map((r: any) => r.status)));
      setClientAccountType(buildBreakdown(clientRows.map((r: any) => r.account_type)));
      setTrainerRoles(buildBreakdown((trainersRes.data ?? []).map((r: any) => r.role)));
      setProgramStatus(buildBreakdown((assignmentsRes.data ?? []).map((r: any) => r.status)));

      setLoading(false);
    }

    load();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-jj-grey dark:text-white">Analytics</h1>

      {loading || !stats || !activity ? (
        <p className="px-4 py-8 text-center text-sm text-jj-grey/60 dark:text-gray-400">Loading analytics...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Total Clients" value={stats.totalClients} />
            <StatCard label="Active Clients" value={stats.activeClients} />
            <StatCard label="Total Trainers" value={stats.totalTrainers} />
            <StatCard label="Programs in Catalog" value={stats.totalPrograms} />
            <StatCard label="Program Assignments" value={stats.totalAssignments} />
            <StatCard label="Workout Library" value={stats.totalWorkouts} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BreakdownCard title="Client Status" items={clientStatus} />
            <BreakdownCard title="Client Account Type" items={clientAccountType} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BreakdownCard title="Trainer Roles" items={trainerRoles} />
            <BreakdownCard title="Program Assignment Status" items={programStatus} />
          </div>

          <div className="rounded-xl border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden p-4">
            <h2 className="mb-2 text-sm font-semibold text-jj-grey dark:text-white">Activity &amp; Engagement</h2>
            <p className="mb-4 text-sm text-jj-grey/60 dark:text-gray-400">
              These metrics will grow as clients start scheduling sessions, logging runs, and using session credits.
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard label="Scheduled Sessions" value={activity.scheduledSessions} />
              <StatCard label="Logged Runs" value={activity.runSessions} />
              <StatCard label="Credit Records" value={activity.creditRecords} />
              <StatCard label="Group Members" value={activity.groupMembers} />
            </div>
          </div>
        </>
      )}

      <p className="text-xs text-jj-grey/50 dark:text-gray-500">Admin view is read-only.</p>
    </div>
  );
}
