import { createClient } from '@supabase/supabase-js';

// Public client for the Next.js app. Reads credentials from environment.
// Add these to .env.local (never commit real keys):
//   NEXT_PUBLIC_SUPABASE_URL=...
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Surfaces a clear error in dev if env vars are missing.
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase env vars missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// No auth flow yet — scope all queries to a single known client for now.
// Swap this for the authenticated user's client_id once auth is wired up.
export const DEFAULT_CLIENT_ID = 20118221;

