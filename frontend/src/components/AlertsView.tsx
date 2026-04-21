// frontend/src/components/AlertsView.tsx
import { type Alert } from "../api/client";

interface AlertsViewProps {
  t: any;
  dark: boolean;
  alerts: Alert[];
  onOpenChatAlert: (alert: Alert) => void;
}

export default function AlertsView({ t, dark, alerts, onOpenChatAlert }: AlertsViewProps) {
  const critical = alerts.filter(a => a.severity === "critical");
  const warnings = alerts.filter(a => a.severity === "warning");

  return (
    <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Header Area */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>Centro de Notificaciones</h2>
          <p style={{ color: t.textSub, fontSize: 14 }}>
            {alerts.length} eventos monitoreados por SupplyAI
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
        <div className="card glass hover-card" style={{ padding: 24, display: "flex", alignItems: "center", gap: 16, borderLeft: `4px solid ${t.red}` }}>
          <div style={{ width: 48, height: 48, borderRadius: "var(--radius-full)", background: t.redBg, color: t.red, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
            🚨
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: t.text, fontFamily: "'Outfit'" }}>{critical.length}</div>
            <div style={{ fontSize: 13, color: t.textSub, fontWeight: 600 }}>Alertas Críticas</div>
          </div>
        </div>
        <div className="card glass hover-card" style={{ padding: 24, display: "flex", alignItems: "center", gap: 16, borderLeft: `4px solid ${t.warn}` }}>
          <div style={{ width: 48, height: 48, borderRadius: "var(--radius-full)", background: t.warnBg, color: t.warn, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
            ⚠️
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: t.text, fontFamily: "'Outfit'" }}>{warnings.length}</div>
            <div style={{ fontSize: 13, color: t.textSub, fontWeight: 600 }}>Advertencias Activas</div>
          </div>
        </div>
        <div className="card glass hover-card" style={{ padding: 24, display: "flex", alignItems: "center", gap: 16, borderLeft: `4px solid ${t.accent}` }}>
          <div style={{ width: 48, height: 48, borderRadius: "var(--radius-full)", background: t.accentBg, color: t.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
            🔔
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: t.text, fontFamily: "'Outfit'" }}>{alerts.length}</div>
            <div style={{ fontSize: 13, color: t.textSub, fontWeight: 600 }}>Notificaciones Totales</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="card glass" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 400 }}>
        {alerts.length === 0 ? (
           <div style={{ 
            padding: "100px 40px", 
            textAlign: "center", 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center",
            background: "linear-gradient(180deg, transparent 0%, var(--bg-hover) 100%)",
            flex: 1
          }}>
            <div style={{ 
              width: 80, height: 80, 
              background: "var(--success-soft)", 
              color: "var(--success)",
              borderRadius: "var(--radius-full)", 
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 24, fontSize: 36, boxShadow: "0 0 40px var(--success-soft)"
            }}>✓</div>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: t.text, fontFamily: 'Outfit' }}>Todo está operando de manera óptima</h3>
            <p style={{ color: t.textSub, marginTop: 12, maxWidth: 350, lineHeight: 1.6 }}>Nuestra IA no ha detectado anomalías recientes en tu inventario. No tienes alertas pendientes.</p>
          </div>
        ) : (
          <div className="table-container" style={{ padding: "32px 32px 32px" }}>
             <table className="custom-table" style={{ borderSpacing: "0 8px" }}>
              <thead>
                <tr>
                  <th>Nivel</th>
                  <th>Producto</th>
                  <th>Mensaje Inteligente</th>
                  <th>Métrica</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a, i) => {
                  const isCrit = a.severity === "critical";
                  const color = isCrit ? t.red : t.warn;
                  const bg = isCrit ? t.redBg : t.warnBg;
                  return (
                    <tr key={i}>
                      <td>
                        <span className="badge" style={{ background: bg, color: color, padding: "6px 12px", fontSize: 10 }}>
                          {a.type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, color: t.text, fontSize: 15 }}>{a.product_name || "Producto desconocido"}</div>
                        <div style={{ fontSize: 12, color: t.textMid, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>{a.sku}</div>
                      </td>
                      <td style={{ maxWidth: 350 }}>
                        <div style={{ fontSize: 13, color: t.text, lineHeight: 1.5, background: t.bg3, padding: "8px 12px", borderRadius: "var(--radius-sm)", borderLeft: `2px solid ${color}` }}>
                          {a.message}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                           <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: color }}>
                             Stock: {a.current_stock}
                           </span>
                           <span style={{ fontSize: 12, color: t.textSub, fontFamily: "'JetBrains Mono', monospace" }}>
                             Umbral: {a.threshold}
                           </span>
                        </div>
                      </td>
                      <td>
                        <button className="btn" style={{ background: t.accent, color: "white", padding: "8px 16px" }} onClick={() => onOpenChatAlert(a)}>
                          <span style={{ fontSize: 15 }}>✨</span> Analizar con IA
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
