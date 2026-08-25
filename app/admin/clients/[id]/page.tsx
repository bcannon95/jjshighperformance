'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, X, Check, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type ClientDetail = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  account_type: string | null;
  date_of_birth: string | null;
  gender: string | null;
  last_signed_in: string | null;
  trainer_id: number | null;
  location_id: number | null;
  trainers: { first_name: string | null; last_name: string | null } | null;
  locations: { name: string | null } | null;
};

type AssignedProgram = {
  id: number;
  program_id: number;
  status: string | null;
  is_main: boolean | null;
  assigned_at: string | null;
  programs: { name: string | null; description: string | null } | null;
};

type ProgramOption = { id: number; name: string | null };
type TrainerOption = { id: number; first_name: string | null; last_name: string | null };
type LocationOption = { id: number; name: string | null };

const INPUT = 'w-full rounded-lg border border-jj-grey/30 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-jj-grey dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand';

export default function AdminClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ClientDetail>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [assignedPrograms, setAssignedPrograms] = useState<AssignedProgram[]>([]);
  const [programOptions, setProgramOptions] = useState<ProgramOption[]>([]);
  const [trainers, setTrainers] = useState<TrainerOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);

  const [showAssignProgram, setShowAssignProgram] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [isMain, setIsMain] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  async function loadClient() {
    setLoading(true);
    const { data } = await supabase
      .from('clients')
      .select('id, first_name, last_name, email, phone, status, account_type, date_of_birth, gender, last_signed_in, trainer_id, location_id, trainers(first_name, last_name), locations(name)')
      .eq('id', params.id)
      .maybeSingle();
    setClient((data as unknown as ClientDetail) ?? null);
    setLoading(false);
  }

  async function loadPrograms() {
    const { data } = await supabase
      .from('client_programs')
      .select('id, program_id, status, is_main, assigned_at, programs(name, description)')
      .eq('client_id', params.id)
      .order('assigned_at', { ascending: false });
    setAssignedPrograms((data as unknown as AssignedProgram[]) ?? []);
  }

  useEffect(() => {
    if (!params.id) return;
    loadClient();
    loadPrograms();

    Promise.all([
      supabase.from('programs').select('id, name').order('name'),
      supabase.from('trainers').select('id, first_name, last_name').order('first_name'),
      supabase.from('locations').select('id, name').order('name'),
    ]).then(([{ data: progs }, { data: trs }, { data: locs }]) => {
      setProgramOptions((progs as unknown as ProgramOption[]) ?? []);
      setTrainers((trs as unknown as TrainerOption[]) ?? []);
      setLocations((locs as unknown as LocationOption[]) ?? []);
    });
  }, [params.id]);

  function startEditing() {
    if (!client) return;
    setEditForm({
      first_name: client.first_name ?? '',
      last_name: client.last_name ?? '',
      email: client.email ?? '',
      phone: client.phone ?? '',
      date_of_birth: client.date_of_birth ?? '',
      gender: client.gender ?? '',
      status: client.status ?? 'active',
      account_type: client.account_type ?? 'standard',
      trainer_id: client.trainer_id,
      location_id: client.location_id,
    });
    setSaveError(null);
    setEditing(true);
  }

  async function saveEdit() {
    setSaving(true);
    setSaveError(null);
    const res = await fetch(`/api/admin/clients/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    const json = await res.json();
    if (!res.ok) {
      setSaveError(json.error ?? 'Save failed');
      setSaving(false);
      return;
    }
    setSaving(false);
    setEditing(false);
    await loadClient();
  }

  async function handleAssignProgram() {
    if (!selectedProgramId) return;
    setAssigning(true);
    setAssignError(null);
    const res = await fetch(`/api/admin/clients/${params.id}/programs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ program_id: parseInt(selectedProgramId), is_main: isMain }),
    });
    const json = await res.json();
    if (!res.ok) {
      setAssignError(json.error ?? 'Assignment failed');
      setAssigning(false);
      return;
    }
    setAssigning(false);
    setShowAssignProgram(false);
    setSelectedProgramId('');
    setIsMain(false);
    await loadPrograms();
  }

  async function handleRemoveProgram(programId: number) {
    await fetch(`/api/admin/clients/${params.id}/programs?program_id=${programId}`, { method: 'DELETE' });
    await loadPrograms();
  }

  if (loading) return <div className="text-sm text-jj-grey/60 dark:text-gray-400">Loading client...</div>;

  if (!client) {
    return (
      <div>
        <button onClick={() => router.push('/admin/clients')} className="flex items-center gap-2 text-sm text-jj-grey/70 dark:text-gray-400 hover:text-brand mb-4">
          <ArrowLeft size={16} /> Back to clients
        </button>
        <p className="text-sm text-jj-grey/60 dark:text-gray-400">Client not found.</p>
      </div>
    );
  }

  const fullName = `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim();
  const initials = `${client.first_name?.[0] ?? ''}${client.last_name?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="space-y-6">
      <Link href="/admin/clients" className="flex items-center gap-2 text-sm text-jj-grey/70 dark:text-gray-400 hover:text-brand">
        <ArrowLeft size={16} /> Back to clients
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-lg font-semibold text-white">
            {initials || '?'}
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-jj-grey dark:text-white">{fullName || 'Unnamed client'}</h1>
            <p className="text-sm text-jj-grey/60 dark:text-gray-400">{client.email}</p>
          </div>
        </div>
        {!editing && (
          <button onClick={startEditing} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-jj-grey/30 dark:border-gray-700 text-jj-grey dark:text-gray-200 hover:bg-jj-neutral dark:hover:bg-gray-800">
            <Pencil size={15} /> Edit
          </button>
        )}
      </div>

      {/* Profile Card */}
      <div className="rounded-xl border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
        <h2 className="text-sm font-semibold text-jj-grey dark:text-white mb-4">Profile</h2>

        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-jj-grey/60 dark:text-gray-400 mb-1">First Name</label>
                <input className={INPUT} value={editForm.first_name ?? ''} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-jj-grey/60 dark:text-gray-400 mb-1">Last Name</label>
                <input className={INPUT} value={editForm.last_name ?? ''} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-jj-grey/60 dark:text-gray-400 mb-1">Email</label>
              <input type="email" className={INPUT} value={editForm.email ?? ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-jj-grey/60 dark:text-gray-400 mb-1">Phone</label>
              <input className={INPUT} value={editForm.phone ?? ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-jj-grey/60 dark:text-gray-400 mb-1">Date of Birth</label>
                <input type="date" className={INPUT} value={editForm.date_of_birth ?? ''} onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-jj-grey/60 dark:text-gray-400 mb-1">Gender</label>
                <select className={INPUT} value={editForm.gender ?? ''} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}>
                  <option value="">—</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-jj-grey/60 dark:text-gray-400 mb-1">Status</label>
                <select className={INPUT} value={editForm.status ?? ''} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="deactivated">Deactivated</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-jj-grey/60 dark:text-gray-400 mb-1">Account Type</label>
                <select className={INPUT} value={editForm.account_type ?? ''} onChange={(e) => setEditForm({ ...editForm, account_type: e.target.value })}>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="vip">VIP</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-jj-grey/60 dark:text-gray-400 mb-1">Trainer</label>
                <select className={INPUT} value={editForm.trainer_id ?? ''} onChange={(e) => setEditForm({ ...editForm, trainer_id: e.target.value ? parseInt(e.target.value) : null })}>
                  <option value="">— None —</option>
                  {trainers.map((t) => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-jj-grey/60 dark:text-gray-400 mb-1">Location</label>
                <select className={INPUT} value={editForm.location_id ?? ''} onChange={(e) => setEditForm({ ...editForm, location_id: e.target.value ? parseInt(e.target.value) : null })}>
                  <option value="">— None —</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>

            {saveError && <p className="text-sm text-red-500 dark:text-red-400">{saveError}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={saveEdit} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50">
                <Check size={15} /> {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button onClick={() => setEditing(false)} className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-jj-grey/30 dark:border-gray-700 text-jj-grey dark:text-gray-200">
                <X size={15} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {[
              ['Status', <span className={`capitalize font-medium ${client.status === 'active' ? 'text-green-600 dark:text-green-400' : 'text-jj-grey dark:text-gray-200'}`}>{client.status ?? '—'}</span>],
              ['Account Type', <span className="capitalize text-jj-grey dark:text-gray-200">{client.account_type ?? '—'}</span>],
              ['Phone', client.phone ?? '—'],
              ['Date of Birth', client.date_of_birth ? new Date(client.date_of_birth).toLocaleDateString() : '—'],
              ['Gender', client.gender ?? '—'],
              ['Trainer', client.trainers ? `${client.trainers.first_name ?? ''} ${client.trainers.last_name ?? ''}` : '—'],
              ['Location', client.locations?.name ?? '—'],
              ['Last Signed In', client.last_signed_in ? new Date(client.last_signed_in).toLocaleString() : '—'],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between border-b border-jj-grey/10 dark:border-gray-800 pb-2">
                <dt className="text-jj-grey/60 dark:text-gray-400">{label}</dt>
                <dd className="text-jj-grey dark:text-gray-200 text-right">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* Programs Card */}
      <div className="rounded-xl border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-jj-grey dark:text-white">Programs</h2>
          <button
            onClick={() => { setShowAssignProgram(true); setAssignError(null); setSelectedProgramId(''); setIsMain(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand text-white rounded-lg hover:opacity-90"
          >
            <Plus size={13} /> Assign Program
          </button>
        </div>

        {showAssignProgram && (
          <div className="mb-4 p-4 rounded-lg border border-jj-grey/20 dark:border-gray-700 bg-jj-neutral dark:bg-gray-800 space-y-3">
            <div>
              <label className="block text-xs text-jj-grey/60 dark:text-gray-400 mb-1">Select Program</label>
              <select className={INPUT} value={selectedProgramId} onChange={(e) => setSelectedProgramId(e.target.value)}>
                <option value="">— Choose a program —</option>
                {programOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-jj-grey dark:text-gray-200 cursor-pointer">
              <input type="checkbox" checked={isMain} onChange={(e) => setIsMain(e.target.checked)} className="accent-brand" />
              Set as main program
            </label>
            {assignError && <p className="text-sm text-red-500 dark:text-red-400">{assignError}</p>}
            <div className="flex gap-2">
              <button onClick={handleAssignProgram} disabled={assigning || !selectedProgramId} className="px-4 py-1.5 bg-brand text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50">
                {assigning ? 'Assigning…' : 'Assign'}
              </button>
              <button onClick={() => setShowAssignProgram(false)} className="px-4 py-1.5 text-sm rounded-lg border border-jj-grey/30 dark:border-gray-700 text-jj-grey dark:text-gray-200">
                Cancel
              </button>
            </div>
          </div>
        )}

        {assignedPrograms.length === 0 ? (
          <p className="text-sm text-jj-grey/60 dark:text-gray-400">No programs assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {assignedPrograms.map((ap) => (
              <div key={ap.id} className="flex items-center justify-between p-3 rounded-lg border border-jj-grey/10 dark:border-gray-700">
                <div>
                  <p className="text-sm font-medium text-jj-grey dark:text-white">
                    {ap.programs?.name ?? 'Unknown program'}
                    {ap.is_main && <span className="ml-2 text-xs bg-brand/20 text-brand px-2 py-0.5 rounded-full">Main</span>}
                  </p>
                  <p className="text-xs text-jj-grey/60 dark:text-gray-400 capitalize">
                    {ap.status ?? 'active'} · Assigned {ap.assigned_at ? new Date(ap.assigned_at).toLocaleDateString() : '—'}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveProgram(ap.program_id)}
                  className="p-1.5 text-jj-grey/30 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  title="Remove program"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
