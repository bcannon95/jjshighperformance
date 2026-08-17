'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
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
  trainers: { first_name: string | null; last_name: string | null } | null;
  locations: { name: string | null } | null;
};

export default function AdminClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClient() {
      setLoading(true);
      const { data } = await supabase
        .from('clients')
        .select(
          'id, first_name, last_name, email, phone, status, account_type, date_of_birth, gender, last_signed_in, trainers(first_name, last_name), locations(name)'
        )
        .eq('id', params.id)
        .maybeSingle();

      setClient((data as unknown as ClientDetail) ?? null);
      setLoading(false);
    }

    if (params.id) {
      loadClient();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="text-sm text-jj-grey/60 dark:text-gray-400">
        Loading client...
      </div>
    );
  }

  if (!client) {
    return (
      <div>
        <button
          onClick={() => router.push('/admin/clients')}
          className="flex items-center gap-2 text-sm text-jj-grey/70 dark:text-gray-400 hover:text-brand mb-4"
        >
          <ArrowLeft size={16} />
          Back to clients
        </button>
        <p className="text-sm text-jj-grey/60 dark:text-gray-400">
          Client not found.
        </p>
      </div>
    );
  }

  const fullName = `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim();
  const initials = `${client.first_name?.[0] ?? ''}${client.last_name?.[0] ?? ''}`.toUpperCase();

  return (
    <div>
      <Link
        href="/admin/clients"
        className="flex items-center gap-2 text-sm text-jj-grey/70 dark:text-gray-400 hover:text-brand mb-4"
      >
        <ArrowLeft size={16} />
        Back to clients
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-lg font-semibold text-white">
          {initials || '?'}
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-jj-grey dark:text-white">
            {fullName || 'Unnamed client'}
          </h1>
          <p className="text-sm text-jj-grey/60 dark:text-gray-400">
            {client.email}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <h2 className="text-sm font-semibold text-jj-grey dark:text-white mb-4">
            Profile
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-jj-grey/60 dark:text-gray-400">Status</dt>
              <dd className="text-jj-grey dark:text-gray-200 capitalize">
                {client.status ?? 'unknown'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-jj-grey/60 dark:text-gray-400">Access level</dt>
              <dd className="text-jj-grey dark:text-gray-200 capitalize">
                {client.account_type ?? '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-jj-grey/60 dark:text-gray-400">Phone</dt>
              <dd className="text-jj-grey dark:text-gray-200">
                {client.phone ?? '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-jj-grey/60 dark:text-gray-400">Date of birth</dt>
              <dd className="text-jj-grey dark:text-gray-200">
                {client.date_of_birth
                  ? new Date(client.date_of_birth).toLocaleDateString()
                  : '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-jj-grey/60 dark:text-gray-400">Gender</dt>
              <dd className="text-jj-grey dark:text-gray-200 capitalize">
                {client.gender ?? '—'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <h2 className="text-sm font-semibold text-jj-grey dark:text-white mb-4">
            Assignment
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-jj-grey/60 dark:text-gray-400">Trainer</dt>
              <dd className="text-jj-grey dark:text-gray-200">
                {client.trainers
                  ? `${client.trainers.first_name ?? ''} ${client.trainers.last_name ?? ''}`
                  : '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-jj-grey/60 dark:text-gray-400">Location</dt>
              <dd className="text-jj-grey dark:text-gray-200">
                {client.locations?.name ?? '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-jj-grey/60 dark:text-gray-400">Last signed in</dt>
              <dd className="text-jj-grey dark:text-gray-200">
                {client.last_signed_in
                  ? new Date(client.last_signed_in).toLocaleString()
                  : '—'}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
