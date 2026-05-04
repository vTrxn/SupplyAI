// frontend/src/components/ChatPanel.tsx
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import type { Product, Alert } from "../api/client";
import BubAvatar from "./BubAvatar";

interface ChatPanelProps {
  dark: boolean;
  productos: Product[];
  alertas: Alert[];
  initialMessage?: string;
  onClose: () => void;
}

function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.substring(0, i));
      i++;
      if (i > text.length) clearInterval(interval);
    }, 15);
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

export default function ChatPanel({ initialMessage, onClose, productos, alertas }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string; ts: Date }[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialMessage && !initialized.current) {
      initialized.current = true;
      sendDirect(initialMessage);
    }
  }, [initialMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendDirect(textMsg: string) {
    if (!textMsg) return;
    setMessages(prev => [...prev, { role: "user", text: textMsg, ts: new Date() }]);
    setLoading(true);
    try {
      const token = localStorage.getItem("token") || "";
      const alertStr = alertas.slice(0, 20).map(a => `- [${a.severity.toUpperCase()}] ${a.message} (Prod-ID: ${a.sku}, Stock actual: ${a.current_stock})`).join("\\n");
      const context = `Total productos: ${productos.length}. Total alertas generales: ${alertas.length}.\\n🚨 RESUMEN DE LAS ALERTAS ACTIVAS MÁS IMPORTANTES:\\n${alertStr || 'No hay alertas'}`;
      
      const history = messages.slice(-20).map(m => ({ role: m.role, content: m.text }));
      
      const res = await fetch("http://localhost:8000/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: textMsg, context, history }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "ai", text: data.response || data.message || "Sin respuesta del servidor.", ts: new Date() }]);
    } catch {
      setMessages(prev => [...prev, { role: "ai", text: "⚠️ Error al conectar con el asistente. Verifica tu conexión.", ts: new Date() }]);
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    const msg = input.trim();
    if (!msg) return;
    setInput("");
    await sendDirect(msg);
  }

  return (
    <>
      <div className="sov" onClick={onClose} style={{ zIndex: 60 }} />
      <div className="animate-fade card" style={{
        position: "fixed", 
        bottom: 32, 
        right: 32, 
        zIndex: 70,
        width: 400, 
        height: 600, 
        maxWidth: "calc(100vw - 64px)",
        maxHeight: "calc(100vh - 64px)",
        display: "flex", 
        flexDirection: "column",
        padding: 0,
        overflow: "hidden",
        boxShadow: "var(--shadow-xl)",
        border: "1px solid var(--border)"
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-card)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <BubAvatar size={36} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Bub</div>
              <div style={{ fontSize: 11, color: "var(--success)", fontWeight: 700 }}>En línea</div>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: 8, fontSize: 18 }}>✕</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 16, background: "var(--bg-page)" }}>
          {messages.length === 0 && !loading && (
            <div style={{ textAlign: "center", marginTop: 80, padding: "0 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
              <h4 style={{ fontWeight: 800, marginBottom: 8, fontSize: 16 }}>¿Cómo puedo ayudarte hoy?</h4>
              <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5 }}>
                Puedes preguntarme sobre el stock, pedirme consejos para optimizar tus rutas o analizar tus alertas.
              </p>
            </div>
          )}
          {messages.map((m, i) => {
            const isLatestAi = m.role === "ai" && i === messages.length - 1;
            return (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 10 }}>
                {m.role === "ai" && (
                  <div style={{ alignSelf: "flex-end", display: "flex" }}><BubAvatar size={28} /></div>
                )}
                <div style={{ maxWidth: "85%" }}>
                  <div style={{
                    padding: "12px 16px",
                    borderRadius: m.role === "user" ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                    background: m.role === "user" ? "var(--brand-primary)" : "var(--bg-card)",
                    color: m.role === "user" ? "white" : "var(--text-main)",
                    fontSize: 13,
                    lineHeight: 1.5,
                    boxShadow: "var(--shadow-sm)",
                    border: m.role === "ai" ? "1px solid var(--border)" : "none",
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
                </div>
              </div>
            );
          })}
          {loading && (
            <div style={{ display: "flex", gap: 10 }}>
               <div style={{ alignSelf: "flex-end", display: "flex" }}><BubAvatar size={28} /></div>
               <div className="card" style={{ padding: "10px 16px", display: "flex", gap: 6, alignItems: "center", background: "var(--bg-card)" }}>
                 <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>Escribiendo</span>
                 <div style={{ display: "flex", gap: 4 }}>
                   <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--brand-primary)", animation: "bounce 0.8s infinite" }} />
                   <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--brand-primary)", animation: "bounce 0.8s infinite 0.2s" }} />
                   <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--brand-primary)", animation: "bounce 0.8s infinite 0.4s" }} />
                 </div>
               </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "20px 24px", background: "var(--bg-card)", borderTop: "1px solid var(--border)" }}>
          {messages.length === 0 && !loading && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {["¿Qué productos debo reordenar?", "Resumen de alertas", "¿Cómo optimizar mi stock?"].map(s => (
                <button 
                  key={s} 
                  onClick={() => sendDirect(s)} 
                  disabled={loading}
                  className="btn btn-ghost" 
                  style={{ borderRadius: 20, fontSize: 11, padding: "6px 12px", background: "var(--bg-hover)", cursor: loading ? "default" : "pointer" }}
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
              placeholder="Escribe un mensaje..."
              style={{ flex: 1, height: 44 }}
            />
            <button 
              className="btn btn-primary" 
              onClick={send} 
              disabled={loading || !input.trim()}
              style={{ padding: "0 16px", height: 44 }}
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
