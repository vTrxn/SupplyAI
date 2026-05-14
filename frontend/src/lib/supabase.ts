import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Usamos valores falsos en caso de que estén vacíos para que la app no se rompa (bypass de auth)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://dummy-url.supabase.co";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "dummy-key";

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});