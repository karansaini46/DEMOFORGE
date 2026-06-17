import { createClient } from '@supabase/supabase-js';

import { env } from './env';

const clientOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
} as const;

export const supabaseAnon = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  clientOptions,
);

export const supabaseService = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY,
  clientOptions,
);
