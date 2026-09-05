import { createClient } from '@supabase/supabase-js';

export function createCasuarDb() {
  const url = process.env.CASUAR_SUPABASE_URL;
  const key = process.env.CASUAR_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing CASUAR_SUPABASE_URL or CASUAR_SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
