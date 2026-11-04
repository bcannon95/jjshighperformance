'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type Trainer = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string | null;
};

type AdminAuthContextType = {
  session: Session | null;
  trainer: Trainer | null;
  isClient: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextType>({
  session: null,
  trainer: null,
  isClient: false,
  loading: true,
  signOut: async () => {},
});

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}

async function fetchIsClient(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('clients')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle();
  return !!data;
}

async function fetchTrainer(userId: string): Promise<Trainer | null> {
  const { data, error } = await supabase
    .from('trainers')
    .select('id, first_name, last_name, email, role')
    .eq('auth_user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Trainer;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;

      setSession(data.session ?? null);

      if (data.session) {
        const [trainerRecord, clientFlag] = await Promise.all([
          fetchTrainer(data.session.user.id),
          fetchIsClient(data.session.user.id),
        ]);
        if (isMounted) {
          setTrainer(trainerRecord);
          setIsClient(clientFlag);
        }
      }

      if (isMounted) setLoading(false);
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!isMounted) return;

        // INITIAL_SESSION is handled by init() above — skip it here to avoid
        // double-fetching the trainer and interfering with the loading state.
        if (_event === 'INITIAL_SESSION') return;

        setSession(newSession);

        if (newSession) {
          // Keep the shell in loading state until the trainer record is fetched,
          // otherwise AdminShell briefly sees session≠null + trainer=null and
          // renders the "Access not available" error screen.
          // Defer the query so the callback stays synchronous (awaiting inside
          // onAuthStateChange deadlocks via fetchTrainer → getSession → auth).
          setLoading(true);
          setTimeout(async () => {
            const [trainerRecord, clientFlag] = await Promise.all([
              fetchTrainer(newSession.user.id),
              fetchIsClient(newSession.user.id),
            ]);
            if (isMounted) {
              setTrainer(trainerRecord);
              setIsClient(clientFlag);
              setLoading(false);
            }
          }, 0);
        } else {
          setTrainer(null);
          setIsClient(false);
        }
      }
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setTrainer(null);
    setIsClient(false);
    window.location.href = '/admin/login';
  }

  return (
    <AdminAuthContext.Provider value={{ session, trainer, isClient, loading, signOut }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
