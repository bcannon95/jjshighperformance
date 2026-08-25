'use client';

import { useEffect, useState } from 'react';
import { Users, UserCheck, MessageSquare, Dumbbell } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/components/admin/AdminAuthProvider';

type Stats = {
  totalClients: number | null;
  activeClients: number | null;
  totalPrograms: number | null;
  unreadMessages: number | null;
};

export default function AdminOverviewPage() {
  const { trainer } = useAdminAuth();
  const [stats, setStats] = useState<Stats>({
    totalClients: null,
    activeClients: null,
    totalPrograms: null,
    unreadMessages: null,
  });

  useEffect(() => {
    async function loadStats() {
      const [
        { count: totalClients },
        { count: activeClients },
        { count: totalPrograms },
      ] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase
          .from('clients')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase.from('programs').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        totalClients: totalClients ?? 0,
        activeClients: activeClients ?? 0,
        totalPrograms: totalPrograms ?? 0,
        unreadMessages: 0,
      });
    }

    loadStats();
  }, []);

  const cards = [
    { label: 'Total Clients', value: stats.totalClients, icon: Users },
    { label: 'Active Clients', value: stats.activeClients, icon: UserCheck },
    { label: 'Programs', value: stats.totalPrograms, icon: Dumbbell },
    { label: 'Unread Messages', value: stats.unreadMessages, icon: MessageSquare },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
        Welcome back{trainer?.first_name ? `, ${trainer.first_name}` : ''}
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Here's what's happening across your business today.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl border border-jj-grey/20 dark:border-gray-700 bg-white dark:bg-gray-900 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {card.label}
                </span>
                <Icon size={18} className="text-brand" />
              </div>
              <span className="text-2xl font-semibold text-gray-900 dark:text-white">
                {card.value ?? '—'}
              </span>
            </div>
          );
        })}
      </div>

    </div>
  );
}
