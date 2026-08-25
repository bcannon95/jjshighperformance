'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Location = {
  id: number;
  name: string | null;
  type: string | null;
  city: string | null;
  country: string | null;
};

export default function AdminBusinessPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLocations() {
      const { data } = await supabase
        .from('locations')
        .select('id, name, type, city, country')
        .order('name', { ascending: true });

      setLocations((data as Location[]) ?? []);
      setLoading(false);
    }

    loadLocations();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
          Business
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Locations and business profile information.
        </p>
      </div>

      <div className="rounded-xl border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Business Name
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-200">JJ's High Performance</p>
      </div>

      <div className="rounded-xl border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-jj-grey/10 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Locations
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-800 text-left text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">City</th>
              <th className="px-4 py-3 font-medium">Country</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-jj-grey/10 dark:divide-gray-800">
            {locations.map((location) => (
              <tr
                key={location.id}
                className="hover:bg-jj-neutral/50 dark:hover:bg-gray-800/50"
              >
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                  {location.name ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200 capitalize">
                  {location.type ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                  {location.city ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                  {location.country ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && (
          <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading locations...
          </div>
        )}

        {!loading && locations.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No locations found.
          </div>
        )}
      </div>

      
    </div>
  );
}
