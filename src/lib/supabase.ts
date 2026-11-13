import { createClient } from '@supabase/supabase-js';

/** The Supabase client. Its URL and publishable key come from `.env`. */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { flowType: 'pkce' } },
);
