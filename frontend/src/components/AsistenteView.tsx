// frontend/src/components/AsistenteView.tsx
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import type { Product, Alert } from "../api/client";
import BubAvatar from "./BubAvatar";

interface AsistenteViewProps {
  t: any;
  dark: boolean;
  productos: Product[];
  alertas: Alert[];
  onInventarioUpdate: () => void;
}

interface Msg { role: "user" | "ai"; text: string; ts: Date; }

function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.substring(0, i));
      i += 3;
      if (i > text.length + 3) clearInterval(interval);
    }, 10);
    return () => clearInterval(interval);
  }, [text]);
  return (
    <ReactMarkdown 
      components={{
        p: ({node, ...props}: any) => <p style={{ margin: "0 0 8px 0" }} {...props} />,
        strong: ({node, ...props}: any) => <strong style={{ fontWeight: "bold" }} {...props} />,
        ul: ({node, ...props}: any) => <ul style={{ paddingLeft: 20, margin: "0 0 8px 0" }} {...props} />
      }}
    >{displayed}</ReactMarkdown>
  );
}

export default function AsistenteView({ t, productos, alertas }: AsistenteViewProps) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "ai", text: `¡Hola! Soy Bub, tu Inteligencia Artificial en SupplyAI.\n\nPuedo ayudarte con:\n• Análisis de tu inventario\n• Recomendaciones de reorden\n• Explicar alertas activas\n• Estrategias de supply chain\n\nTienes ${productos.length} productos y ${alertas.length} alertas activas. ¿En qué te ayudo?`, ts: new Date() },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);

  async function sendDirect(textMsg: string) {
    if (!textMsg) return;
    setMsgs(prev => [...prev, { role: "user", text: textMsg, ts: new Date() }]);
    setLoading(true);
    try {
      const token = localStorage.getItem("token") || "";
      const alertStr = alertas.slice(0, 8).map(a => `- [${a.severity.toUpperCase()}] ${a.message} (Prod-ID: ${a.sku}, Stock actual: ${a.current_stock})`).join("\\n");
      const context = `Total productos: ${productos.length}. Total alertas generales: ${alertas.length}.\\n🚨 RESUMEN DE LAS ALERTAS ACTIVAS MÁS IMPORTANTES:\\n${alertStr || 'No hay alertas'}`;
      const res = await fetch("http://localhost:8000/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: textMsg, context }),
      });
      const data = await res.json();
      setMsgs(prev => [...prev, { role: "ai", text: data.response || data.message || "Sin respuesta del servidor.", ts: new Date() }]);
    } catch {
      setMsgs(prev => [...prev, { role: "ai", text: "⚠️ No pude conectar con el asistente. Verifica que el backend esté activo en http://localhost:8000", ts: new Date() }]);
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    await sendDirect(text);
  }

  const SUGERENCIAS = ["¿Qué productos debo reordenar?", "Resumen de alertas activas", "¿Cómo optimizar mi inventario?", "Analiza mi stock crítico"];

  return (
    <div className="card animate-fade" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 300px)", minHeight: 500, padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "24px 32px", borderBottom: `1px solid ${t.border}`, flexShrink: 0, display: "flex", alignItems: "center", gap: 16, background: "var(--bg-card)" }}>
        <BubAvatar size={44} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Bub</div>
          <div style={{ fontSize: 12, color: "var(--success)", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)" }} />
            IA Conectada • Analizando {productos.length} productos
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px", display: "flex", flexDirection: "column", gap: 24, background: "var(--bg-page)" }}>
        {msgs.map((m, i) => {
          const isLatestAi = m.role === "ai" && i === msgs.length - 1 && i > 0;
          return (
            <div key={i} style={{ display: "flex", gap: 16, justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              {m.role === "ai" && (
                <div style={{ alignSelf: "flex-end", display: "flex" }}><BubAvatar size={36} /></div>
              )}
              <div style={{ maxWidth: "80%" }}>
                <div style={{
                  padding: "16px 20px",
                  borderRadius: m.role === "user" ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                  background: m.role === "user" ? "var(--brand-primary)" : "var(--bg-card)",
                  color: m.role === "user" ? "white" : "var(--text-main)",
                  fontSize: 14,
                  lineHeight: 1.6,
                  border: m.role === "ai" ? "1px solid var(--border)" : "none",
                  boxShadow: "var(--shadow-sm)",
                }}>
                  {m.role === "user" ? (
                    <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
                  ) : isLatestAi ? (
                    <TypewriterText text={m.text} />
                  ) : (
                    <ReactMarkdown 
                      components={{
                        p: ({node, ...props}) => <p style={{ margin: "0 0 8px 0" }} {...props} />,
                        strong: ({node, ...props}) => <strong style={{ fontWeight: "bold" }} {...props} />,
                        ul: ({node, ...props}) => <ul style={{ paddingLeft: 20, margin: "0 0 8px 0" }} {...props} />
                      }}
                    >{m.text}</ReactMarkdown>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 6, textAlign: m.role === "user" ? "right" : "left", fontWeight: 600 }}>
                  {m.ts.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
        {loading && (
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ alignSelf: "flex-end", display: "flex" }}><BubAvatar size={36} /></div>
            <div className="card" style={{ padding: "12px 20px", display: "flex", gap: 8, alignItems: "center", border: "1px solid var(--border)", background: "var(--bg-card)" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>Escribiendo</span>
              <div style={{ display: "flex", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--brand-primary)", animation: "bounce 0.8s infinite" }} />
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--brand-primary)", animation: "bounce 0.8s infinite 0.2s" }} />
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--brand-primary)", animation: "bounce 0.8s infinite 0.4s" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Footer / Input Area */}
      <div style={{ padding: "24px 32px", background: "var(--bg-card)", borderTop: `1px solid ${t.border}` }}>
        {msgs.length <= 1 && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
            {SUGERENCIAS.map(s => (
              <button 
                key={s} 
                onClick={() => sendDirect(s)} 
                disabled={loading}
                className="btn btn-ghost" 
                style={{ borderRadius: 20, fontSize: 12, padding: "8px 16px", background: "var(--bg-hover)", cursor: loading ? "default" : "pointer" }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 12 }}>
          <input
            className="search-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Escribe tu consulta aquí..."
            style={{ flex: 1, height: 48 }}
          />
          <button 
            className="btn btn-primary" 
            onClick={send} 
            disabled={loading || !input.trim()}
            style={{ height: 48, width: 48, padding: 0 }}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}

