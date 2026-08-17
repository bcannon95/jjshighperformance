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
  loading: boolean;
  signOut: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextType>({
  session: null,
  trainer: null,
  loading: true,
  signOut: async () => {},
});

export function useAdminAuth() {
  return useContext(AdminAuthContext);
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;

      setSession(data.session ?? null);

      if (data.session) {
        const trainerRecord = await fetchTrainer(data.session.user.id);
        if (isMounted) setTrainer(trainerRecord);
      }

      if (isMounted) setLoading(false);
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);

        if (newSession) {
          const trainerRecord = await fetchTrainer(newSession.user.id);
          if (isMounted) setTrainer(trainerRecord);
        } else {
          setTrainer(null);
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
    window.location.href = '/admin/login';
  }

  return (
    <AdminAuthContext.Provider value={{ session, trainer, loading, signOut }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
