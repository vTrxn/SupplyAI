// frontend/src/pages/Login.tsx
import { useState } from "react";
import { supabase } from "../lib/supabase";
import NetworkBackground from "../components/NetworkBackground";
export default function Login() {
  const [email,    setEmail]    = useState("");
  const [token,    setToken]    = useState("");
  const [step,     setStep]     = useState<"email"|"otp">("email");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [msg,      setMsg]      = useState("");

  const dark = true; // Forzado a fondo negro por petición del usuario
  const t = dark ? {
    bg:"#0f0f13", bg2:"#16161d", border:"rgba(255, 255, 255, 0.05)",
    text:"#e8e8f0", textSub:"#9898b8", textMid:"#6b6b85",
    accent:"#7B61FF", accent2:"#6456e8", accentBg:"#1e1a3a", accentMid:"#2d2850",
    red:"#f87171", redBg:"#2a1515",
  } : {
    bg:"#f8fafc", bg2:"#ffffff", border:"#e2e8f0",
    text:"#1e293b", textSub:"#64748b", textMid:"#94a3b8",
    accent:"#5b4de8", accent2:"#4338ca", accentBg:"#eeecfd", accentMid:"#ddd9fc",
    red:"#ef4444", redBg:"#fef2f2",
  };

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(""); setMsg("");
    // Bypass: Simulate sending OTP
    setTimeout(() => {
      setMsg("✅ Código enviado. (Simulado)");
      setStep("otp");
      setLoading(false);
    }, 600);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(""); setMsg("");
    // Bypass: Simulate verification success
    setTimeout(() => {
      localStorage.setItem("token", "dev-token-bypass");
      window.location.href = "/";
    }, 600);
  }

  async function openOAuthPopup(provider: "google" | "azure") {
    setLoading(true); setError("");
    // Bypass: Simulate OAuth success
    setTimeout(() => {
      localStorage.setItem("token", "dev-token-bypass");
      window.location.href = "/";
    }, 600);
  }

  async function handleGoogle() {
    await openOAuthPopup("google");
  }

  async function handleMicrosoft() {
    await openOAuthPopup("azure");
  }

  const inp = {
    width: "100%", padding: "11px 14px",
    border: `1.5px solid ${t.border}`, borderRadius: 10,
    fontSize: 14, color: t.text, background: t.bg,
    fontFamily: "'DM Sans',sans-serif", outline: "none",
    boxSizing: "border-box" as const,
  };

  return (
    <div style={{ minHeight:"100vh", position:"relative", overflow:"hidden", background:t.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"'DM Sans',sans-serif" }}>
      <NetworkBackground accentColor={t.accent} />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { border-color: ${t.accent} !important; }
        .oauth-btn:hover { opacity: 0.85; transform: translateY(-1px); }
      `}</style>

      <div style={{ width:"100%", maxWidth:420, display:"flex", flexDirection:"column", gap:0, position:"relative", zIndex:10 }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:t.accent, display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:14 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
          <div style={{ fontSize:26, fontWeight:800, color:t.text, letterSpacing:"-.03em" }}>
            Supply<span style={{ color:t.accent }}>AI</span>
          </div>
          <div style={{ fontSize:13, color:t.textSub, marginTop:4 }}>
            Plataforma IA de cadena de suministros
          </div>
        </div>

        {/* Card */}
        <div style={{ background:t.bg2, border:`1px solid ${t.border}`, borderRadius:18, padding:32, boxShadow:`0 8px 40px rgba(0,0,0,.12)` }}>

          {step === "email" ? (
            <>
              {/* OAuth buttons */}
              <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
                <button className="oauth-btn" onClick={handleGoogle} disabled={loading}
                  style={{ width:"100%", padding:"11px 0", borderRadius:10, border:`1px solid ${t.border}`,
                    background:t.bg, color:t.text, fontSize:13, fontWeight:600,
                    fontFamily:"'DM Sans',sans-serif", cursor:"pointer",
                    display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                    transition:"all .2s" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continuar con Google
                </button>

                <button className="oauth-btn" onClick={handleMicrosoft} disabled={loading}
                  style={{ width:"100%", padding:"11px 0", borderRadius:10, border:`1px solid ${t.border}`,
                    background:t.bg, color:t.text, fontSize:13, fontWeight:600,
                    fontFamily:"'DM Sans',sans-serif", cursor:"pointer",
                    display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                    transition:"all .2s" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
                    <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
                    <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
                    <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
                  </svg>
                  Continuar con Microsoft
                </button>
              </div>

              {/* Divisor */}
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                <div style={{ flex:1, height:1, background:t.border }}/>
                <span style={{ fontSize:12, color:t.textSub }}>o con email</span>
                <div style={{ flex:1, height:1, background:t.border }}/>
              </div>

              {/* Formulario email/password */}
              <form onSubmit={handleSendOtp} style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:600, color:t.textSub, display:"block", marginBottom:6, textTransform:"uppercase" as const, letterSpacing:".06em" }}>
                    Email
                  </label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                    placeholder="tu@empresa.com" required style={inp}/>
                </div>

                {error && (
                  <div style={{ padding:"10px 14px", background:t.redBg, border:`1px solid ${t.red}33`, borderRadius:9, fontSize:12, color:t.red }}>
                    {error}
                  </div>
                )}
                {msg && (
                  <div style={{ padding:"10px 14px", background:"#0f2a20", border:"1px solid #34d39933", borderRadius:9, fontSize:12, color:"#34d399" }}>
                    {msg}
                  </div>
                )}

                <button type="submit" disabled={loading || !email}
                  style={{ width:"100%", padding:"12px 0", borderRadius:10, border:"none",
                    background: loading || !email ? t.border : `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
                    color:"white", fontSize:14, fontWeight:700,
                    fontFamily:"'DM Sans',sans-serif", cursor:loading || !email ?"not-allowed":"pointer",
                    boxShadow:`0 4px 14px ${t.accent}44`, transition:"all .2s" }}>
                  {loading ? "Enviando..." : "Entrar con código seguro"}
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={handleVerifyOtp} style={{ display:"flex", flexDirection:"column", gap:14, animation: "mIn .3s cubic-bezier(.34,1.4,.64,1)" }}>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ width:48, height:48, borderRadius:"50%", background:t.accentBg, color:t.accent, display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:12, fontSize: 20 }}>
                  ✉️
                </div>
                <div style={{ fontSize: 13, color: t.textSub, marginBottom: 4 }}>Código enviado a</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: t.text }}>{email}</div>
                <button type="button" onClick={() => { setStep("email"); setToken(""); setError(""); setMsg(""); }} style={{ background: "none", border: "none", color: t.accent, fontSize: 12, cursor: "pointer", marginTop: 8, textDecoration: "underline", fontWeight: 600 }}>Cambiar de correo</button>
              </div>

              <div>
                <label style={{ fontSize:11, fontWeight:600, color:t.textSub, display:"block", marginBottom:6, textTransform:"uppercase" as const, letterSpacing:".06em", textAlign: "center" }}>
                  Código de verificación
                </label>
                <input type="text" value={token} onChange={e=>setToken(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="--------" required style={{ ...inp, textAlign: "center", letterSpacing: "0.5em", fontSize: 20, fontWeight: 800, padding: "16px" }} maxLength={8} autoFocus/>
              </div>

              {error && (
                <div style={{ padding:"10px 14px", background:t.redBg, border:`1px solid ${t.red}33`, borderRadius:9, fontSize:12, color:t.red }}>
                  {error}
                </div>
              )}
              {msg && (
                <div style={{ padding:"10px 14px", background:"#0f2a20", border:"1px solid #34d39933", borderRadius:9, fontSize:12, color:"#34d399" }}>
                  {msg}
                </div>
              )}

              <button type="submit" disabled={loading || token.length < 6}
                style={{ width:"100%", padding:"12px 0", borderRadius:10, border:"none",
                  background: loading || token.length < 6 ? t.border : `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
                  color: loading || token.length < 6 ? t.textMid : "white", fontSize:14, fontWeight:700,
                  fontFamily:"'DM Sans',sans-serif", cursor:loading || token.length < 6 ? "not-allowed" : "pointer",
                  boxShadow: token.length >= 6 ? `0 4px 14px ${t.accent}44` : "none", transition:"all .2s" }}>
                {loading ? "Verificando..." : "Verificar código"}
              </button>
            </form>
          )}
        </div>

        <div style={{ textAlign:"center", marginTop:20, fontSize:12, color:t.textSub }}>
          SupplyAI · Bogotá, Colombia 🇨🇴
        </div>
      </div>
    </div>
  );
}