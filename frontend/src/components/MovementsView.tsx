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

export default function MovementsView({ t, productos }: MovementsViewProps) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<MovementCreate>({
    product_id: "", type: "entrada", quantity: 1, reason: null, reference: null, unit_price: null, date: null,
  });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setMovements(await getMovements()); }
    catch { setMovements([]); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.product_id) { alert("Selecciona un producto"); return; }
    setSaving(true);
    try { await createMovement(form); setShowForm(false); await load(); }
    catch (err: any) { alert("Error: " + err.message); }
    finally { setSaving(false); }
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
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>Historial de Movimientos</h2>
          <p style={{ color: t.textSub, fontSize: 14 }}>{movements.length} transacciones registradas</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {movements.length > 0 && (
            <button className="btn btn-ghost" onClick={handleDownload} disabled={loading} style={{ background: "var(--bg-hover)", borderRadius: "var(--radius-full)", padding: "0 16px" }}>
              📥 Exportar
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <span style={{ fontSize: 18 }}>+</span> Registrar Movimiento
          </button>
        </div>
      </div>

      {/* Form Side Panel hidden to prevent DOM overlay nesting */}
      {showForm && (
        <>
          <div className="overlay" onClick={() => setShowForm(false)} />
          <div className="side-panel animate-slide">
            <div className="side-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                 <h3 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Outfit' }}>Nuevo Movimiento</h3>
                 <p style={{ fontSize: 13, color: t.textSub, marginTop: 4 }}>Registra una entrada, salida o ajuste</p>
              </div>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)} style={{ width: 36, height: 36, padding: 0, borderRadius: 'var(--radius-full)' }}>✕</button>
            </div>
            
            <div className="side-panel-content">
              <form id="movement-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <label className="badge" style={{ marginBottom: 8 }}>Producto</label>
                <select className="form-input" value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} required>
                  <option value="">Selecciona un producto</option>
                  {productos.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label className="badge" style={{ marginBottom: 8 }}>Tipo</label>
                  <select className="form-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}>
                    {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="badge" style={{ marginBottom: 8 }}>Cantidad</label>
                  <input className="form-input" type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: +e.target.value }))} required />
                </div>
              </div>

              <div>
                <label className="badge" style={{ marginBottom: 8 }}>Motivo / Referencia</label>
                <input className="form-input" value={form.reason || ""} onChange={e => setForm(f => ({ ...f, reason: e.target.value || null }))} placeholder="Ej: Abastecimiento semanal" />
              </div>

              </form>
            </div>

            <div className="side-panel-footer" style={{ display: "flex", gap: 12 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancelar</button>
                <button type="submit" form="movement-form" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                  {saving ? "Registrando..." : "Confirmar"}
                </button>
            </div>
          </div>
        </>
      )}

      {/* Movements Card */}
      <div id="tour-movimientos-card" className="card glass" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
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
              <p style={{ color: t.textSub, marginTop: 12, maxWidth: 300, lineHeight: 1.6 }}>Tu inventario está estático por ahora. Registra tu primer movimiento para ver cómo evoluciona.</p>
              <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ marginTop: 24 }}>
                Registrar Movimiento
              </button>
            </div>
          ) : (
            <table className="custom-table" style={{ borderSpacing: "0 8px" }}>
              <thead>
                <tr>
                  {["Fecha", "Producto", "Tipo", "Cantidad", "Balance", "Motivo"].map(h => (
                    <th key={h}>{h}</th>
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
                        <div style={{ fontWeight: 800 }}>{prod?.name || "Eliminado"}</div>
                        <div style={{ fontSize: 11, color: t.textSub, fontFamily: "JetBrains Mono" }}>{prod?.sku || "N/A"}</div>
                      </td>
                      <td>
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
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                          <span style={{ color: t.textSub }}>{m.previous_stock ?? 0}</span>
                          <span style={{ color: t.textDim }}>→</span>
                          <span style={{ fontWeight: 800 }}>{m.posterior_stock ?? 0}</span>
                        </div>
                      </td>
                      <td>
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
      
    {showForm && (
        <>
          <div className="overlay" onClick={() => setShowForm(false)} />
          <div className="side-panel animate-slide">
            <div className="side-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                 <h3 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Outfit' }}>Nuevo Movimiento</h3>
                 <p style={{ fontSize: 13, color: t.textSub, marginTop: 4 }}>Registra una entrada, salida o ajuste</p>
              </div>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)} style={{ width: 36, height: 36, padding: 0, borderRadius: 'var(--radius-full)' }}>✕</button>
            </div>
            
            <div className="side-panel-content">
              <form id="movement-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <label className="badge" style={{ marginBottom: 8 }}>Producto</label>
                <select className="form-input" value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} required>
                  <option value="">Selecciona un producto</option>
                  {productos.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label className="badge" style={{ marginBottom: 8 }}>Tipo</label>
                  <select className="form-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}>
                    {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="badge" style={{ marginBottom: 8 }}>Cantidad</label>
                  <input className="form-input" type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: +e.target.value }))} required />
                </div>
              </div>

              <div>
                <label className="badge" style={{ marginBottom: 8 }}>Motivo / Referencia</label>
                <input className="form-input" value={form.reason || ""} onChange={e => setForm(f => ({ ...f, reason: e.target.value || null }))} placeholder="Ej: Abastecimiento semanal" />
              </div>

              </form>
            </div>

            <div className="side-panel-footer" style={{ display: "flex", gap: 12 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancelar</button>
                <button type="submit" form="movement-form" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                  {saving ? "Registrando..." : "Confirmar"}
                </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
