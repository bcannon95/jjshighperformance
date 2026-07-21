'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // On success, AuthProvider's onAuthStateChange fires and redirects to /
  }

  return (
    <div className="min-h-screen bg-jj-neutral dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 bg-brand rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-gray-900 font-bold text-2xl">J</span>
          </div>
        </div>

        <h1 className="font-heading text-2xl tracking-widest text-gray-900 dark:text-white text-center uppercase mb-1">
          JJ&apos;s High Performance
        </h1>
        <p className="text-sm text-jj-grey dark:text-gray-400 text-center mb-8">
          Sign in to your coaching portal
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-3 rounded-xl border border-jj-grey/30 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl border border-jj-grey/30 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-brand text-gray-900 font-heading tracking-widest uppercase text-sm font-semibold hover:bg-brand/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
