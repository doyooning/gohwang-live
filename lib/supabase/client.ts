import { createClient as createBrowserSupabaseClient } from '@supabase/supabase-js';

let supabaseClient: ReturnType<typeof createBrowserSupabaseClient> | null =
  null;

export function createClient() {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log('[Supabase Client Init]', {
      url: url ? `${url.substring(0, 30)}...` : 'MISSING',
      key: key ? `${key.substring(0, 20)}...` : 'MISSING',
    });

    if (!url || !key) {
      throw new Error('Missing Supabase environment variables');
    }

    supabaseClient = createBrowserSupabaseClient(url, key);
  }
  return supabaseClient;
}
