'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [staySignedIn, setStaySignedIn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      if (!staySignedIn) {
        sessionStorage.setItem('jjs_session_only', 'true');
      } else {
        localStorage.setItem('jjs_remember_me', 'true');
      }
    }
    // On success, AuthProvider's onAuthStateChange fires and redirects to /
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setResetSent(true);
    }
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
          {mode === 'login' ? 'Sign in to your coaching portal' : 'Reset your password'}
        </p>

        {mode === 'forgot' ? (
          resetSent ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Check your email for a password reset link.
              </p>
              <button
                onClick={() => { setMode('login'); setResetSent(false); }}
                className="text-sm text-brand font-medium hover:underline"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
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

              {error && (
                <p className="text-sm text-red-500 dark:text-red-400 text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-brand text-gray-900 font-heading tracking-widest uppercase text-sm font-semibold hover:bg-brand/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>

              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className="w-full text-sm text-jj-grey dark:text-gray-400 hover:underline"
              >
                Back to sign in
              </button>
            </form>
          )
        ) : (
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(null); }}
                  className="text-xs text-brand hover:underline"
                >
                  Forgot password?
                </button>
              </div>
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

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={staySignedIn}
                onChange={(e) => setStaySignedIn(e.target.checked)}
                className="w-4 h-4 rounded border-jj-grey/40 accent-brand cursor-pointer"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Stay signed in</span>
            </label>

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
        )}
      </div>
    </div>
  );
}
