'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type PageState = 'waiting' | 'ready' | 'success' | 'invalid';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>('waiting');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Detect whether this reset link was requested from the admin login page.
    const adminFlag = new URLSearchParams(window.location.search).get('admin') === '1';
    setIsAdmin(adminFlag);

    // Check immediately for an error in the URL hash (e.g. expired token).
    const hash = window.location.hash;
    if (hash.includes('error=')) {
      const params = new URLSearchParams(hash.slice(1));
      const desc = params.get('error_description') ?? 'This reset link is invalid or has expired.';
      setError(decodeURIComponent(desc.replace(/\+/g, ' ')));
      setPageState('invalid');
      return;
    }

    // Supabase processes the recovery token from the URL hash and fires
    // PASSWORD_RECOVERY via onAuthStateChange.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPageState('ready');
      }
    });

    // Fallback: if no recovery event fires within 5s, the link is invalid/expired.
    const timer = setTimeout(() => {
      setPageState((s) => s === 'waiting' ? 'invalid' : s);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        console.error('[ResetPassword] updateUser error:', error);
        setError(error.message || 'Failed to update password. Please try again.');
      } else {
        setPageState('success');
        setTimeout(() => { window.location.href = isAdmin ? '/admin/login' : '/'; }, 2000);
      }
    } catch (err) {
      console.error('[ResetPassword] unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
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

        {pageState === 'waiting' && (
          <p className="text-sm text-jj-grey dark:text-gray-400 text-center mt-4">
            Verifying reset link…
          </p>
        )}

        {pageState === 'invalid' && (
          <div className="text-center mt-4 space-y-4">
            <p className="text-sm text-red-500 dark:text-red-400">
              This reset link is invalid or has expired.
            </p>
            <button
              onClick={() => router.replace(isAdmin ? '/admin/login' : '/login')}
              className="text-sm text-brand font-medium hover:underline"
            >
              Back to sign in
            </button>
          </div>
        )}

        {pageState === 'ready' && (
          <>
            <p className="text-sm text-jj-grey dark:text-gray-400 text-center mb-8">
              Choose a new password
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full px-4 py-3 rounded-xl border border-jj-grey/30 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
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
                {loading ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </>
        )}

        {pageState === 'success' && (
          <div className="text-center mt-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {isAdmin ? 'Password updated. Taking you to admin sign in…' : 'Password updated. Taking you home…'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
