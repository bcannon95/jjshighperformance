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

  const [mode, setMode] = useState<'signin' | 'forgot'>('signin');
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

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

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);

    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password?admin=1`,
    });

    setResetLoading(false);

    if (resetErr) {
      setResetError(resetErr.message || 'Something went wrong. Please try again.');
      return;
    }

    setResetSent(true);
  }

  function backToSignIn() {
    setMode('signin');
    setResetSent(false);
    setResetError('');
    setResetEmail('');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-jj-neutral dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 border border-jj-grey/20 dark:border-gray-700 p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-jj-grey dark:text-white mb-1">
          JJ Admin
        </h1>

        {mode === 'signin' && (
          <>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-jj-grey dark:text-gray-200">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-xs text-brand hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
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
          </>
        )}

        {mode === 'forgot' && !resetSent && (
          <>
            <p className="text-sm text-jj-grey/60 dark:text-gray-400 mb-6">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-jj-grey dark:text-gray-200 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full rounded-lg border border-jj-grey/30 dark:border-gray-700 bg-jj-neutral dark:bg-gray-800 px-3 py-2 text-sm text-jj-grey dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              {resetError && <p className="text-sm text-red-500">{resetError}</p>}

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full rounded-lg bg-brand text-white text-sm font-medium py-2.5 disabled:opacity-60"
              >
                {resetLoading ? 'Sending...' : 'Send reset link'}
              </button>

              <button
                type="button"
                onClick={backToSignIn}
                className="w-full text-center text-xs text-jj-grey/60 dark:text-gray-400 hover:underline"
              >
                Back to sign in
              </button>
            </form>
          </>
        )}

        {mode === 'forgot' && resetSent && (
          <div className="text-center">
            <p className="text-sm text-jj-grey/70 dark:text-gray-300 mb-6">
              If an account exists for that email, a password reset link is on its way. Check your inbox.
            </p>
            <button
              type="button"
              onClick={backToSignIn}
              className="text-xs text-brand hover:underline"
            >
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
