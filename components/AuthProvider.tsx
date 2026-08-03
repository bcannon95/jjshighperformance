'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  clientId: number | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  clientId: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

async function fetchClientId(userId: string): Promise<number | null> {
  const { data } = await supabase
    .from('clients')
    .select('id')
    .eq('auth_user_id', userId)
    .single();
  return data?.id ?? null;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Skip getSession() on the reset-password page — the recovery session is
    // established via the PASSWORD_RECOVERY auth event instead. Calling
    // getSession() here can trigger a token-refresh network call that holds the
    // Supabase auth lock, causing updateUser() to queue behind it and hang.
    if (window.location.pathname === '/reset-password') {
      setLoading(false);
    } else {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Auth init timed out after 8s')), 8000)
      );

      Promise.race([supabase.auth.getSession(), timeout])
        .then(async ({ data: { session } }: Awaited<ReturnType<typeof supabase.auth.getSession>>) => {
          // If the user didn't choose "stay signed in", only allow the session
          // within the same browser session (sessionStorage survives navigation but
          // not a fresh browser open).
          if (
            session &&
            localStorage.getItem('jjs_remember_me') !== 'true' &&
            sessionStorage.getItem('jjs_session_only') !== 'true'
          ) {
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
          setSession(session);
          if (session) {
            try {
              const cid = await fetchClientId(session.user.id);
              setClientId(cid);
            } catch (err) {
              console.error('Failed to fetch client ID:', err);
            }
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error('Auth init failed:', err);
          setLoading(false);
        });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session) {
          const cid = await fetchClientId(session.user.id);
          setClientId(cid);
        } else {
          setClientId(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;
    const publicPaths = ['/login', '/reset-password'];
    if (!session && !publicPaths.includes(pathname)) {
      router.replace('/login');
    } else if (session && pathname === '/login') {
      router.replace('/');
    }
  }, [session, loading, pathname, router]);

  async function signOut() {
    localStorage.removeItem('jjs_remember_me');
    sessionStorage.removeItem('jjs_session_only');
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, clientId, loading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
