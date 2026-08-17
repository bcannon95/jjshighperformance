'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !data.session) {
      setError('Invalid email or password.');
      setLoading(false);
      return;
    }

    const { data: trainerRow } = await supabase
      .from('trainers')
      .select('id')
      .eq('auth_user_id', data.session.user.id)
      .maybeSingle();

    if (!trainerRow) {
      setError("This account isn't set up for admin access.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    router.replace('/admin');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-jj-neutral dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 border border-jj-grey/20 dark:border-gray-700 p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-jj-grey dark:text-white mb-1">
          JJ Admin
        </h1>
        <p className="text-sm text-jj-grey/60 dark:text-gray-400 mb-6">
          Sign in to manage your clients and team.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-jj-grey dark:text-gray-200 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-jj-grey/30 dark:border-gray-700 bg-jj-neutral dark:bg-gray-800 px-3 py-2 text-sm text-jj-grey dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-jj-grey dark:text-gray-200 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-jj-grey/30 dark:border-gray-700 bg-jj-neutral dark:bg-gray-800 px-3 py-2 text-sm text-jj-grey dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand text-white text-sm font-medium py-2.5 disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
