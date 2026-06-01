// frontend/src/components/ForecastView.tsx
import { useMemo } from "react";
import type { Product } from "../api/client";

interface ForecastViewProps {
  t: any;
  dark: boolean;
  productos: Product[];
  onNavToInventario?: () => void;
}

function calcForecast(p: Product) {
  const stock = p.current_stock ?? 0;
  const dailyRate = p.min_stock > 0 ? p.min_stock / 30 : 1;
  const daysLeft = dailyRate > 0 ? Math.floor(stock / dailyRate) : 999;
  const urgency = daysLeft <= 7 ? "critical" : daysLeft <= 15 ? "warning" : "ok";
  const reorderQty = Math.max(0, p.max_stock - stock);
  const reorderCost = reorderQty * p.cost_price;
  return { daysLeft, urgency, reorderQty, reorderCost, dailyRate: dailyRate.toFixed(1) };
}

export default function ForecastView({ t, productos, onNavToInventario }: ForecastViewProps) {
  const forecasts = useMemo(() =>
    productos
      .filter(p => p.is_active)
      .map(p => ({ ...p, forecast: calcForecast(p) }))
      .sort((a, b) => a.forecast.daysLeft - b.forecast.daysLeft),
    [productos]
  );

  const critical = forecasts.filter(f => f.forecast.urgency === "critical").length;
  const warning  = forecasts.filter(f => f.forecast.urgency === "warning").length;
  const ok       = forecasts.filter(f => f.forecast.urgency === "ok").length;
  const totalReorderCost = forecasts.reduce((sum, f) => sum + f.forecast.reorderCost, 0);

  const urgencyColor = (u: string) => u === "critical" ? "var(--error)" : u === "warning" ? "var(--warning)" : "var(--success)";
  const urgencyBg    = (u: string) => u === "critical" ? "var(--error-soft)" : u === "warning" ? "var(--warning-soft)" : "var(--success-soft)";
  const urgencyLabel = (u: string) => u === "critical" ? "Crítico" : u === "warning" ? "Advertencia" : "Saludable";

  return (
    <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <style>{`.tooltip-container:hover .tooltip-content { display: block !important; }`}</style>
      
      {/* Summary cards using the horizontal style */}
      <div className="metrics-grid">
        {[
          { label: "Críticos (≤7 días)", value: critical, color: "var(--error)", sub: "Urgente", icon: "⚠️" },
          { label: "Advertencia (≤15 días)", value: warning, color: "var(--warning)", sub: "Prevenir", icon: "⏱️" },
          { label: "Stock Estable", value: ok, color: "var(--success)", sub: "En orden", icon: "✅" },
          { label: "Inversión Pendiente", value: `$${totalReorderCost.toLocaleString("es-CO")}`, color: "var(--brand-primary)", sub: "Total reorden", icon: "👛" },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding: "20px", display: "flex", alignItems: "center", gap: 16 }}>
            <div className="metric-icon-box" style={{ background: c.color + "15", color: c.color, fontSize: 24, flexShrink: 0, width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12 }}>
              {c.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div className="metric-value" style={{ margin: 0, fontSize: "1.5rem", lineHeight: 1, color: c.color }}>{c.value}</div>
                <span className="badge" style={{ background: c.color + "15", color: c.color, fontSize: 10 }}>{c.sub}</span>
              </div>
              <div className="metric-label" style={{ margin: 0, fontSize: 13 }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Analysis Card */}
      <div className="card mobile-flat" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "24px 32px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>Proyecciones Inteligentes</h3>
              <div className="tooltip-container" style={{ position: "relative", display: "inline-flex", cursor: "help" }}>
                <span style={{ fontSize: 14, color: t.textSub }}>💡</span>
                <div className="tooltip-content" style={{
                  position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                  marginTop: 8, padding: "8px 12px", background: t.bg2, border: `1px solid ${t.border}`,
                  borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 11, color: t.textMain,
                  width: 260, zIndex: 10, display: "none"
                }}>
                  Utilizamos el <strong>Stock Mínimo</strong> configurado por producto como indicador de consumo mensual histórico para proyectar el agotamiento de tus existencias.
                </div>
              </div>
            </div>
            <p style={{ fontSize: 14, color: t.textSub, marginTop: 4 }}>Análisis de rotación y predicción de agotamiento</p>
          </div>
          <div className="badge" style={{ background: t.accentBg, color: t.accent, padding: "8px 16px" }}>
            Refrescamiento en tiempo real
          </div>
        </div>

        <div className="table-container" style={{ padding: "0 32px 32px" }}>
          {forecasts.length === 0 ? (
            <div style={{ padding: "80px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ 
                width: 80, height: 80, borderRadius: 24, 
                background: `linear-gradient(135deg, ${t.accentBg}, var(--brand-secondary-soft, rgba(14, 165, 233, 0.1)))`, 
                display: "flex", alignItems: "center", justifyContent: "center", 
                fontSize: 40, marginBottom: 24, border: `1px solid ${t.border}`,
                boxShadow: `0 0 40px ${t.accentBg}`
              }}>
                ✨
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: t.textMain }}>Esperando datos para predecir</h3>
              <p style={{ color: t.textSub, maxWidth: 420, marginBottom: 32, fontSize: 14, lineHeight: 1.6 }}>La Inteligencia Artificial requiere un historial. Agrega productos activos en el inventario para que el modelo pueda estimar la rotación y el agotamiento de stock.</p>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  if (onNavToInventario) onNavToInventario();
                  else {
                    const btn = Array.from(document.querySelectorAll('.nav-item')).find(b => b?.textContent?.includes('Inventario')) as HTMLElement;
                    if (btn) btn.click();
                  }
                }}
              >
                Ir a Inventario
              </button>
            </div>
          ) : (
            <table className="custom-table" style={{ marginTop: 24 }}>
              <thead>
                <tr>
                  {["Nivel Urgencia", "Producto", "Días Restantes", "Consumo", "Sugerencia Reorden", "Costo Proyectado"].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {forecasts.map(p => {
                  const f = p.forecast;
                  const barW = Math.min(100, Math.max(0, (f.daysLeft / 30) * 100));
                  return (
                    <tr key={p.id}>
                      <td>
                        <span className="badge" style={{ background: urgencyBg(f.urgency), color: urgencyColor(f.urgency), fontSize: 11 }}>
                          {urgencyLabel(f.urgency)}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 800 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: t.textSub, fontFamily: "JetBrains Mono" }}>{p.sku}</div>
                      </td>
                      <td style={{ minWidth: 160 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ flex: 1, height: 8, background: t.bg3, borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ width: `${barW}%`, height: "100%", background: urgencyColor(f.urgency), transition: "width 0.6s ease-out" }} />
                          </div>
                          <span style={{ fontWeight: 800, color: urgencyColor(f.urgency), fontFamily: "JetBrains Mono" }}>
                            {f.daysLeft >= 999 ? "∞" : `${f.daysLeft}d`}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{f.dailyRate}</div>
                        <div style={{ fontSize: 10, color: t.textSub }}>unid. / día</div>
                      </td>
                      <td>
                        {f.reorderQty > 0 ? (
                          <div style={{ color: t.accent, fontWeight: 800, fontFamily: "JetBrains Mono", fontSize: 15 }}>
                            +{f.reorderQty.toLocaleString()} <span style={{ fontSize: 10, fontWeight: 400 }}>{p.unit}</span>
                          </div>
                        ) : (
                          <span style={{ color: t.textDim }}>Suficiente</span>
                        )}
                      </td>
                      <td style={{ fontWeight: 800, fontFamily: "JetBrains Mono" }}>
                        {f.reorderCost > 0 ? `$${f.reorderCost.toLocaleString()}` : "--"}
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
  );
}
