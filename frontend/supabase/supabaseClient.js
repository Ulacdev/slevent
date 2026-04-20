import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Use a simpler lock bypass that always returns the result of the acquisition function.
    // This handles cases where the arguments might be passed in different orders by Supabase.
    lock: function() {
      const acquire = Array.from(arguments).find(arg => typeof arg === 'function');
      if (acquire) return acquire();
      return Promise.resolve({ data: { session: null }, error: null });
    }
  }
});