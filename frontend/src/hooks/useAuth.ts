// frontend/src/hooks/useAuth.ts
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // BYPASS TEMPORAL: Mock de sesión para entrar directo
    const mockSession = {
      access_token: "dev-token-bypass",
      user: { id: "1", email: "demo@supplyai.com" }
    } as unknown as Session;

    setSession(mockSession);
    localStorage.setItem("token", "dev-token-bypass");
    setLoading(false);
  }, []);

  async function logout() {
    localStorage.removeItem("token");
    window.location.href = "/";
  }

  return { session, loading, logout };
}