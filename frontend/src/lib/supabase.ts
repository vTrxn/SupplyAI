import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Mantenemos la configuración de Auth en su estado natural (true)
// para que el inicio de sesión con Google (OAuth) funcione perfectamente.
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true, // CRÍTICO para que lea la respuesta de Google
    persistSession: true,
  },
});