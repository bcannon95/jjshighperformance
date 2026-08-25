'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, X } from 'lucide-react';
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

type TrainerOption = { id: number; first_name: string | null; last_name: string | null };
type LocationOption = { id: number; name: string | null };

const statusTabs = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Pending', value: 'pending' },
  { label: 'Deactivated', value: 'deactivated' },
];

const defaultForm = {
  first_name: '',
  last_name: '',
  email: '',
  trainer_id: '',
  location_id: '',
  status: 'active',
  account_type: 'standard',
};

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [trainers, setTrainers] = useState<TrainerOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function loadClients() {
      setLoading(true);
      let query = supabase
        .from('clients')
        .select('id, first_name, last_name, email, status, account_type, last_signed_in, trainers(first_name, last_name)')
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

  useEffect(() => {
    async function loadOptions() {
      const [{ data: trainerData }, { data: locationData }] = await Promise.all([
        supabase.from('trainers').select('id, first_name, last_name').order('first_name'),
        supabase.from('locations').select('id, name').order('name'),
      ]);
      setTrainers((trainerData as unknown as TrainerOption[]) ?? []);
      setLocations((locationData as unknown as LocationOption[]) ?? []);
    }
    loadOptions();
  }, []);

  const filteredClients = clients.filter((client) => {
    if (!search.trim()) return true;
    const fullName = `${client.first_name ?? ''} ${client.last_name ?? ''}`.toLowerCase();
    return fullName.includes(search.toLowerCase()) || (client.email ?? '').toLowerCase().includes(search.toLowerCase());
  });

  function openModal() {
    setForm(defaultForm);
    setSaveError(null);
    setSaveSuccess(false);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        trainer_id: form.trainer_id ? parseInt(form.trainer_id) : null,
        location_id: form.location_id ? parseInt(form.location_id) : null,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setSaveError(json.error ?? 'Something went wrong');
      setSaving(false);
      return;
    }

    setSaveSuccess(true);
    setSaving(false);

    // Refresh client list
    const { data } = await supabase
      .from('clients')
      .select('id, first_name, last_name, email, status, account_type, last_signed_in, trainers(first_name, last_name)')
      .order('first_name', { ascending: true });
    setClients((data as unknown as ClientRow[]) ?? []);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Clients</h1>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:opacity-90"
        >
          <Plus size={16} /> Add Client
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                statusFilter === tab.value
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
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
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      <div className="rounded-xl border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-800 text-left text-gray-500 dark:text-gray-400">
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
                  <Link href={`/admin/clients/${client.id}`} className="font-medium text-gray-900 dark:text-white hover:text-brand">
                    {client.first_name} {client.last_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{client.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                    client.status === 'active'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : client.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}>
                    {client.status ?? 'unknown'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 capitalize">{client.account_type ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {client.trainers ? `${client.trainers.first_name ?? ''} ${client.trainers.last_name ?? ''}` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {client.last_signed_in ? new Date(client.last_signed_in).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading clients...</div>}
        {!loading && filteredClients.length === 0 && <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No clients found.</div>}
      </div>

      {/* Add Client Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-jj-grey/10 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Add New Client</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white">
                <X size={20} />
              </button>
            </div>

            {saveSuccess ? (
              <div className="px-6 py-8 text-center">
                <p className="text-base font-semibold text-gray-900 dark:text-white mb-2">Client added!</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  An invitation email has been sent to <strong>{form.email}</strong> so they can set their password.
                </p>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:opacity-90"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">First Name *</label>
                    <input
                      required
                      value={form.first_name}
                      onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Last Name *</label>
                    <input
                      required
                      value={form.last_name}
                      onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email *</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="deactivated">Deactivated</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Account Type</label>
                    <select
                      value={form.account_type}
                      onChange={(e) => setForm({ ...form, account_type: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      <option value="standard">Standard</option>
                      <option value="premium">Premium</option>
                      <option value="vip">VIP</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Trainer</label>
                  <select
                    value={form.trainer_id}
                    onChange={(e) => setForm({ ...form, trainer_id: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="">— No trainer assigned —</option>
                    {trainers.map((t) => (
                      <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Location</label>
                  <select
                    value={form.location_id}
                    onChange={(e) => setForm({ ...form, location_id: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="">— No location —</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                {saveError && (
                  <p className="text-sm text-red-500 dark:text-red-400">{saveError}</p>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? 'Sending invite…' : 'Add & Invite'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
