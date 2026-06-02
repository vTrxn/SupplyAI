import { useState, useEffect } from "react";
import { getMovements, createMovement, clearMovements, type Movement, type MovementCreate, type Product } from "../api/client";

interface MovementsViewProps {
  t: any;
  dark: boolean;
  productos: Product[];
}

const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  entrada:  { label: "Entrada",  color: "var(--success)", bg: "var(--success-soft)" },
  salida:   { label: "Salida",   color: "var(--error)", bg: "var(--error-soft)" },
  ajuste:   { label: "Ajuste",   color: "var(--warning)", bg: "var(--warning-soft)" },
  traslado: { label: "Traslado", color: "var(--brand-secondary)", bg: "var(--brand-secondary-soft)" },
};

export default function HistorialView({ t, productos }: MovementsViewProps) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setMovements(await getMovements()); }
    catch { setMovements([]); }
    finally { setLoading(false); }
  }

  async function handleDownload() {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") || "";
      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const res = await fetch(`${baseUrl}/api/v1/excel/export-movements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Error o no hay datos para descargar");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Historial_Movimientos_${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      if (window.confirm("✅ Descarga completada con éxito.\\n\\n¿Te gustaría vaciar el historial de movimientos ahora para empezar de cero? (Esto NO afectará el stock actual de tus productos, seguirán teniendo las cantidades actuales)")) {
        await clearMovements();
        await load();
      }
    } catch (err: any) {
      alert("Error en la descarga: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Header Area */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: t.text }}>
            His<span style={{ color: t.accent }}>torial</span>
            <span style={{ fontSize: 10, background: t.accent, color: "white", padding: "2px 6px", borderRadius: 4, marginLeft: 8, verticalAlign: "middle", fontWeight: 800, letterSpacing: "1px" }}>BETA</span>
          </h2>
          <p style={{ color: t.textSub, fontSize: 14 }}>Rastrea entradas, salidas y ajustes de stock en tiempo real</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {movements.length > 0 && (
            <button className="btn btn-ghost" onClick={handleDownload} disabled={loading} style={{ background: "var(--bg-hover)", borderRadius: "50%", padding: 0, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} title="Descargar Historial">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* Movements Card */}
      <div className="card glass" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div className="table-container" style={{ padding: movements.length === 0 ? "0" : "0 32px 32px" }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: "center", color: t.textSub }}>
              <div className="sk" style={{ height: 40, marginBottom: 12, borderRadius: "var(--radius-md)" }} />
              <div className="sk" style={{ height: 40, marginBottom: 12, borderRadius: "var(--radius-md)" }} />
              <div className="sk" style={{ height: 40, borderRadius: "var(--radius-md)" }} />
            </div>
          ) : movements.length === 0 ? (
            <div style={{ 
              padding: "100px 40px", 
              textAlign: "center", 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center",
              background: "linear-gradient(180deg, transparent 0%, var(--bg-hover) 100%)"
            }}>
              <div style={{ 
                width: 80, height: 80, 
                background: "var(--brand-primary-soft)", 
                borderRadius: "var(--radius-full)", 
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 24, fontSize: 36, boxShadow: "0 0 40px var(--brand-primary-soft)"
              }}>📦</div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: t.text, fontFamily: 'Outfit' }}>Sin actividad reciente</h3>
              <p style={{ color: t.textSub, marginTop: 12, maxWidth: 300, lineHeight: 1.6 }}>Tu inventario está estático por ahora. Usa el escáner para registrar movimientos.</p>
            </div>
          ) : (
            <table className="custom-table" style={{ borderSpacing: "0 8px" }}>
              <thead>
                <tr>
                  {["Fecha", "Producto", "Tipo", "Cantidad", "Balance", "Motivo"].map(h => (
                    <th key={h} className={h === "Tipo" || h === "Motivo" || h === "Balance" ? "desktop-only" : ""}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movements.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(m => {
                  const meta = TYPE_META[m.type] || { label: m.type, color: t.textSub, bg: t.bg3 };
                  const prod = productos.find(p => p.id === m.product_id);
                  return (
                    <tr key={m.id}>
                      <td style={{ color: t.textSub, fontSize: 13, fontFamily: "JetBrains Mono" }}>
                        {new Date(m.date).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, color: m.type === "entrada" ? "var(--success)" : m.type === "salida" ? "var(--error)" : t.text }}>{prod?.name || "Eliminado"}</div>
                        <div style={{ fontSize: 11, color: t.textSub, fontFamily: "JetBrains Mono" }}>{prod?.sku || "N/A"}</div>
                      </td>
                      <td className="desktop-only">
                        <span className="badge" style={{ background: meta.bg, color: meta.color, fontSize: 11 }}>{meta.label}</span>
                      </td>
                      <td>
                        <span style={{ 
                          fontWeight: 800, 
                          color: m.type === "entrada" ? "var(--success)" : m.type === "salida" ? "var(--error)" : t.text, 
                          fontFamily: "JetBrains Mono", 
                          fontSize: 15 
                        }}>
                          {m.type === "salida" ? "-" : "+"}{m.quantity}
                        </span>
                      </td>
                      <td className="desktop-only">
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                          <span style={{ color: t.textSub }}>{m.previous_stock ?? 0}</span>
                          <span style={{ color: t.textDim }}>→</span>
                          <span style={{ color: t.text, fontWeight: 700 }}>{m.posterior_stock ?? 0}</span>
                        </div>
                      </td>
                      <td className="desktop-only">
                        <div style={{ fontSize: 13, color: t.textMain, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={m.reason || ""}>
                          {m.reason || "--"}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

