'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X } from 'lucide-react';

type TrainerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string | null;
  last_active: string | null;
};

type ClientLite = {
  trainer_id: string | null;
  locations: { name: string | null } | null;
};

type LocationOption = {
  id: number;
  name: string | null;
};

const ROLES = ['trainer', 'admin', 'coach', 'nutritionist'];

export default function AdminTeamPage() {
  const [trainers, setTrainers] = useState<TrainerRow[]>([]);
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationFilter, setLocationFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', role: 'trainer' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: trainerData }, { data: clientData }, { data: locationData }] =
      await Promise.all([
        supabase
          .from('trainers')
          .select('id, first_name, last_name, email, role, last_active')
          .order('first_name', { ascending: true }),
        supabase.from('clients').select('trainer_id, locations(name)'),
        supabase.from('locations').select('id, name').order('name', { ascending: true }),
      ]);

    setTrainers((trainerData as unknown as TrainerRow[]) ?? []);
    setClients((clientData as unknown as ClientLite[]) ?? []);
    setLocations((locationData as unknown as LocationOption[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const trainerStats = useMemo(() => {
    const map = new Map<string, { count: number; locationNames: Set<string> }>();
    clients.forEach((client) => {
      if (!client.trainer_id) return;
      const entry = map.get(client.trainer_id) ?? { count: 0, locationNames: new Set<string>() };
      entry.count += 1;
      if (client.locations?.name) entry.locationNames.add(client.locations.name);
      map.set(client.trainer_id, entry);
    });
    return map;
  }, [clients]);

  const filteredTrainers = trainers.filter((trainer) => {
    const stats = trainerStats.get(trainer.id);
    const matchesLocation =
      locationFilter === 'all' || (stats?.locationNames.has(locationFilter) ?? false);
    const fullName = `${trainer.first_name ?? ''} ${trainer.last_name ?? ''}`.toLowerCase();
    const matchesSearch =
      !search.trim() ||
      fullName.includes(search.toLowerCase()) ||
      (trainer.email ?? '').toLowerCase().includes(search.toLowerCase());
    return matchesLocation && matchesSearch;
  });

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to invite team member');
      setSuccess(true);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setSaving(false);
    }
  }

  function openModal() {
    setForm({ first_name: '', last_name: '', email: '', role: 'trainer' });
    setError(null);
    setSuccess(false);
    setShowModal(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Team</h1>
        <button
          onClick={openModal}
          className="rounded-lg bg-brand text-white text-sm font-medium px-4 py-2 hover:opacity-90"
        >
          + Invite Team Member
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="all">All locations</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.name ?? ''}>{loc.name}</option>
          ))}
        </select>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search team..."
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      <div className="rounded-xl border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-800 text-left text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Team Member</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Last Active</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Locations</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Assigned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-jj-grey/10 dark:divide-gray-800">
            {!loading && filteredTrainers.map((trainer) => {
              const stats = trainerStats.get(trainer.id);
              const initials = `${trainer.first_name?.[0] ?? ''}${trainer.last_name?.[0] ?? ''}`.toUpperCase();
              return (
                <tr key={trainer.id} className="hover:bg-jj-neutral/50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white shrink-0">
                        {initials || '?'}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {trainer.first_name} {trainer.last_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{trainer.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 capitalize">
                    {trainer.role ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                    {trainer.last_active ? new Date(trainer.last_active).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                    {stats && stats.locationNames.size > 0
                      ? Array.from(stats.locationNames).join(', ')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                    {stats?.count ?? 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {loading && (
          <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading team...
          </div>
        )}
        {!loading && filteredTrainers.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No team members found.
          </div>
        )}
      </div>

      {/* Invite modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl">
            {success ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">✓</div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Invite sent!</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  An invite email has been sent. They can set their password and access the admin portal once accepted.
                </p>
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-lg bg-brand text-white text-sm font-medium px-4 py-2 hover:opacity-90"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Invite Team Member</h2>
                  <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleInvite} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">First name *</label>
                      <input
                        type="text"
                        required
                        value={form.first_name}
                        onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Last name *</label>
                      <input
                        type="text"
                        required
                        value={form.last_name}
                        onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                      ))}
                    </select>
                  </div>

                  {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg bg-brand text-white text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-60"
                    >
                      {saving ? 'Sending…' : 'Send Invite'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
