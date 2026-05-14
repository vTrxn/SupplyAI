// frontend/src/App.tsx
import { useEffect, useState } from "react";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

export default function App() {
  const [dark, setDark] = useState(localStorage.getItem("darkMode") === "true");
  const token = localStorage.getItem("token");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("darkMode", String(dark));
  }, [dark]);

  if (!token) {
    return (
      <div key="login" className="animate-fade">
        <Login />
      </div>
    );
  }

  return (
    <div key="dashboard" className="animate-fade">
      <Dashboard dark={dark} setDark={setDark} />
    </div>
  );
}