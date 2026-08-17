'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type ClientRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  status: string | null;
  account_type: string | null;
  last_signed_in: string | null;
  trainers: { first_name: string | null; last_name: string | null } | null;
};

const statusTabs = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Pending', value: 'pending' },
  { label: 'Deactivated', value: 'deactivated' },
];

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadClients() {
      setLoading(true);

      let query = supabase
        .from('clients')
        .select(
          'id, first_name, last_name, email, status, account_type, last_signed_in, trainers(first_name, last_name)'
        )
        .order('first_name', { ascending: true });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data } = await query;
      setClients((data as unknown as ClientRow[]) ?? []);
      setLoading(false);
    }

    loadClients();
  }, [statusFilter]);

  const filteredClients = clients.filter((client) => {
    if (!search.trim()) return true;
    const fullName = `${client.first_name ?? ''} ${client.last_name ?? ''}`.toLowerCase();
    return (
      fullName.includes(search.toLowerCase()) ||
      (client.email ?? '').toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-jj-grey dark:text-white">
          Clients
        </h1>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-1 rounded-lg bg-jj-neutral dark:bg-gray-800 p-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                statusFilter === tab.value
                  ? 'bg-white dark:bg-gray-700 text-jj-grey dark:text-white shadow-sm'
                  : 'text-jj-grey/60 dark:text-gray-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients..."
          className="rounded-lg border border-jj-grey/30 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-jj-grey dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      <div className="rounded-xl border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-jj-neutral dark:bg-gray-800 text-left text-jj-grey/60 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Access</th>
              <th className="px-4 py-3 font-medium">Trainer</th>
              <th className="px-4 py-3 font-medium">Last Signed In</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-jj-grey/10 dark:divide-gray-800">
            {!loading && filteredClients.map((client) => (
              <tr key={client.id} className="hover:bg-jj-neutral/50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/clients/${client.id}`}
                    className="font-medium text-jj-grey dark:text-white hover:text-brand"
                  >
                    {client.first_name} {client.last_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-jj-grey/70 dark:text-gray-400">
                  {client.email}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-jj-neutral dark:bg-gray-800 text-jj-grey dark:text-gray-300 capitalize">
                    {client.status ?? 'unknown'}
                  </span>
                </td>
                <td className="px-4 py-3 text-jj-grey/70 dark:text-gray-400 capitalize">
                  {client.account_type ?? '—'}
                </td>
                <td className="px-4 py-3 text-jj-grey/70 dark:text-gray-400">
                  {client.trainers
                    ? `${client.trainers.first_name ?? ''} ${client.trainers.last_name ?? ''}`
                    : '—'}
                </td>
                <td className="px-4 py-3 text-jj-grey/70 dark:text-gray-400">
                  {client.last_signed_in
                    ? new Date(client.last_signed_in).toLocaleDateString()
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && (
          <div className="px-4 py-8 text-center text-sm text-jj-grey/60 dark:text-gray-400">
            Loading clients...
          </div>
        )}

        {!loading && filteredClients.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-jj-grey/60 dark:text-gray-400">
            No clients found.
          </div>
        )}
      </div>
    </div>
  );
}
