import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type KeyType = 'anon' | 'service';

type ClientOptions = {
  type?: KeyType;
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function resolveKey(type: KeyType) {
  if (type === 'service') {
    return SUPABASE_SERVICE_ROLE_KEY;
  }
  return SUPABASE_ANON_KEY;
}

export function createSupabaseServerClient({ type = 'anon' }: ClientOptions = {}): SupabaseClient | null {
  const key = resolveKey(type);

  if (!SUPABASE_URL || !key) {
    return null;
  }

  return createClient(SUPABASE_URL, key, {
    auth: {
      persistSession: false,
    },
  });
}
