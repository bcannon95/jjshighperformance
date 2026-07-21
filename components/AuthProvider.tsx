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
    .from('profiles')
    .select('client_id')
    .eq('id', userId)
    .single();
  return data?.client_id ?? null;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        const cid = await fetchClientId(session.user.id);
        setClientId(cid);
      }
      setLoading(false);
    });

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
    if (!session && pathname !== '/login') {
      router.replace('/login');
    } else if (session && pathname === '/login') {
      router.replace('/');
    }
  }, [session, loading, pathname, router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, clientId, loading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
