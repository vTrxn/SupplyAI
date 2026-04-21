// frontend/src/App.tsx
import { useEffect, useState } from "react";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import { useAuth } from "./hooks/useAuth";

export default function App() {
  const [dark, setDark] = useState(localStorage.getItem("darkMode") === "true");
  const { session, loading } = useAuth();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("darkMode", String(dark));
  }, [dark]);

  // Wait for Supabase to parse the URL hash and establish the session
  if (loading) {
    return (
      <div key="loading" className="animate-fade" style={{ minHeight: "100vh", background: dark ? "#0f0f13" : "#f4f4f9", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", color: dark ? "white" : "black" }}>
        Cargando autenticación...
      </div>
    );
  }

  // Render dashboard if authenticated
  if (session || localStorage.getItem("token")) {
    // If we are in the popup window, close it immediately!
    if (window.opener && window.opener !== window) {
      window.close();
      return <div className="animate-fade" style={{ background: dark ? "#0f0f13" : "#f4f4f9", minHeight: "100vh" }} />;
    }

    // Optionally clean up the URL without reloading to remove the #access_token hash if needed
    if (window.location.hash.includes("access_token")) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    return (
      <div key="dashboard" className="animate-fade">
        <Dashboard dark={dark} setDark={setDark} />
      </div>
    );
  }

  // Not authenticated? Show Login
  return (
    <div key="login" className="animate-fade">
      <Login />
    </div>
  );
}