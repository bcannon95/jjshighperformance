'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

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

export default function AdminTeamPage() {
  const [trainers, setTrainers] = useState<TrainerRow[]>([]);
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationFilter, setLocationFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
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

    load();
  }, []);

  const trainerStats = useMemo(() => {
    const map = new Map<string, { count: number; locationNames: Set<string> }>();

    clients.forEach((client) => {
      if (!client.trainer_id) return;
      const entry = map.get(client.trainer_id) ?? { count: 0, locationNames: new Set<string>() };
      entry.count += 1;
      if (client.locations?.name) {
        entry.locationNames.add(client.locations.name);
      }
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-jj-grey dark:text-white">Team</h1>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="rounded-lg border border-jj-grey/30 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-jj-grey dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="all">All locations</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.name ?? ''}>
              {loc.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search team..."
          className="rounded-lg border border-jj-grey/30 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-jj-grey dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      <div className="rounded-xl border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-jj-neutral dark:bg-gray-800 text-left text-jj-grey/60 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Team Member</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Last Active</th>
              <th className="px-4 py-3 font-medium">Locations</th>
              <th className="px-4 py-3 font-medium">Assigned</th>
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
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                        {initials || '?'}
                      </span>
                      <div>
                        <p className="font-medium text-jj-grey dark:text-white">
                          {trainer.first_name} {trainer.last_name}
                        </p>
                        <p className="text-xs text-jj-grey/60 dark:text-gray-400">
                          {trainer.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-jj-grey/70 dark:text-gray-400 capitalize">
                    {trainer.role ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-jj-grey/70 dark:text-gray-400">
                    {trainer.last_active
                      ? new Date(trainer.last_active).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-jj-grey/70 dark:text-gray-400">
                    {stats && stats.locationNames.size > 0
                      ? Array.from(stats.locationNames).join(', ')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-jj-grey/70 dark:text-gray-400">
                    {stats?.count ?? 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {loading && (
          <div className="px-4 py-8 text-center text-sm text-jj-grey/60 dark:text-gray-400">
            Loading team...
          </div>
        )}

        {!loading && filteredTrainers.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-jj-grey/60 dark:text-gray-400">
            No team members found.
          </div>
        )}
      </div>
<p className="text-xs text-jj-grey/50 dark:text-gray-500">Admin view is read-only.</p>
    </div>
  );
}
