// frontend/src/hooks/useAuth.ts
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener sesion actual
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        localStorage.setItem("token", data.session.access_token);
      }
      setLoading(false);
    });

    // Escuchar cambios de sesion
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        localStorage.setItem("token", session.access_token);
      } else {
        localStorage.removeItem("token");
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    localStorage.removeItem("token");
    window.location.href = "/";
  }

  return { session, loading, logout };
}