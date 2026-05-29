// frontend/src/components/RutasView.tsx
import React, { useState } from "react";

interface Props {
  t: any;
  dark?: boolean;
}

interface Parada {
  id: string;
  nombre: string;
  direccion: string;
  notas?: string;
}

type EstadoPedido = "pendiente" | "confirmado" | "en_transito" | "entregado" | "cancelado";

interface Pedido {
  id: string;
  proveedor: string;
  producto: string;
  cantidad: number;
  unidad: string;
  fecha: string;
  estado: EstadoPedido;
  notas?: string;
  monto?: number;
}

const EJEMPLOS_PARADAS: Parada[] = [
  { id: "p1", nombre: "Punto de Entrega Chapinero", direccion: "Carrera 13 #45-50, Bogotá", notas: "Entrega urgente antes del mediodía" },
  { id: "p2", nombre: "Sucursal Usaquén", direccion: "Calle 119 #6-30, Bogotá" },
  { id: "p3", nombre: "Cliente VIP Suba", direccion: "Avenida Suba #115-60, Bogotá", notas: "Llamar al cliente 10 minutos antes" },
];

const ESTADO_CONFIG: Record<EstadoPedido, { label: string; color: string; icono: string; paso: number }> = {
  pendiente: { label: "Pendiente", color: "#9999b8", icono: "⏳", paso: 0 },
  confirmado: { label: "Confirmado", color: "#60a5fa", icono: "✅", paso: 1 },
  en_transito: { label: "En tránsito", color: "#fbbf24", icono: "🚚", paso: 2 },
  entregado: { label: "Entregado", color: "#34d399", icono: "📦", paso: 3 },
  cancelado: { label: "Cancelado", color: "#f87171", icono: "❌", paso: -1 },
};

const PASOS_PEDIDO = ["pendiente", "confirmado", "en_transito", "entregado"] as EstadoPedido[];

const PEDIDOS_EJEMPLO: Pedido[] = [
  { id: "P001", proveedor: "Makro Bogotá Norte", producto: "Arroz Diana x50kg", cantidad: 10, unidad: "bultos", fecha: "2026-03-15", estado: "en_transito", monto: 850000, notas: "Entrega entre 8am-12pm" },
  { id: "P002", proveedor: "Plaza España", producto: "Azúcar Manuelita", cantidad: 20, unidad: "kg", fecha: "2026-03-17", estado: "confirmado", monto: 120000 },
  { id: "P003", proveedor: "Almacén El Dorado", producto: "Aceite Vegetal", cantidad: 5, unidad: "cajas", fecha: "2026-03-10", estado: "entregado", monto: 230000 },
  { id: "P004", proveedor: "Distribuidora SAS", producto: "Harina de trigo", cantidad: 8, unidad: "bultos", fecha: "2026-03-19", estado: "pendiente", monto: 180000 },
];

export default function RutasView({ t, dark = true }: Props) {
  const [tipo, setTipo] = useState<"entrega" | "reabastecimiento">("entrega");

  // Estados Rutas de Entrega
  const [origen, setOrigen] = useState<Parada>({
    id: "origen",
    nombre: "Bodega Principal",
    direccion: "Calle 72 #10-07, Bogotá",
  });
  
  const [destino, setDestino] = useState<Parada>({
    id: "destino",
    nombre: "Destino de Retorno",
    direccion: "Avenida Carrera 19 #127-10, Bogotá",
  });

  const [paradas, setParadas] = useState<Parada[]>([]);
  const [appNavegacion, setAppNavegacion] = useState<"google_maps" | "waze" | "apple_maps">("google_maps");

  // Estados Pedidos Reabastecimiento
  const [pedidos, setPedidos] = useState<Pedido[]>(PEDIDOS_EJEMPLO);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nuevoPedido, setNuevoPedido] = useState<Partial<Pedido>>({ estado: "pendiente", unidad: "unidades" });

  function agregarParada() {
    setParadas(prev => [...prev, { id: Date.now().toString(), nombre: "", direccion: "", notas: "" }]);
  }

  function actualizarParada(id: string, campo: keyof Parada, valor: string) {
    setParadas(prev => prev.map(p => p.id === id ? { ...p, [campo]: valor } : p));
  }

  function eliminarParada(id: string) {
    setParadas(prev => prev.filter(p => p.id !== id));
  }

  function cargarEjemplos() {
    setOrigen({ id: "origen", nombre: "Bodega Principal SupplyAI", direccion: "Calle 72 #10-07, Bogotá" });
    setParadas(EJEMPLOS_PARADAS);
    setDestino({ id: "destino", nombre: "Punto de Acopio Final", direccion: "Carrera 7 #127-10, Bogotá" });
  }

  function abrirNavegacion() {
    const originAddr = encodeURIComponent(origen.direccion.trim());
    const destAddr = encodeURIComponent(destino.direccion.trim());
    
    if (!origen.direccion.trim() || !destino.direccion.trim()) {
      alert("Por favor, ingresa al menos la dirección del Punto de partida y del Destino final.");
      return;
    }

    if (appNavegacion === "google_maps") {
      const waypoints = paradas
        .map(p => encodeURIComponent(p.direccion.trim()))
        .filter(Boolean)
        .join("%7C"); // pipe character |
      
      const url = `https://www.google.com/maps/dir/?api=1&origin=${originAddr}&destination=${destAddr}${waypoints ? `&waypoints=${waypoints}` : ""}&travelmode=driving`;
      window.open(url, "_blank");
    } else if (appNavegacion === "apple_maps") {
      const waypointsPart = paradas
        .map(p => encodeURIComponent(p.direccion.trim()))
        .filter(Boolean)
        .map(w => `${w}+to:`)
        .join("");
        
      const url = `http://maps.apple.com/?saddr=${originAddr}&daddr=${waypointsPart}${destAddr}`;
      window.open(url, "_blank");
    } else if (appNavegacion === "waze") {
      const url = `https://waze.com/ul?q=${destAddr}&navigate=yes`;
      window.open(url, "_blank");
    }
  }

  function cambiarEstadoPedido(id: string, estado: EstadoPedido) {
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado } : p));
  }

  function agregarPedido() {
    if (!nuevoPedido.proveedor || !nuevoPedido.producto) return;
    const pedido: Pedido = {
      id: `P${String(pedidos.length + 1).padStart(3, "0")}`,
      proveedor: nuevoPedido.proveedor || "",
      producto: nuevoPedido.producto || "",
      cantidad: Number(nuevoPedido.cantidad) || 1,
      bold: undefined,
      unidad: nuevoPedido.unidad || "unidades",
      fecha: new Date().toISOString().slice(0, 10),
      estado: "pendiente",
      monto: Number(nuevoPedido.monto) || 0,
      notes: undefined,
      notas: nuevoPedido.notas,
    };
    setPedidos(prev => [pedido, ...prev]);
    setNuevoPedido({ estado: "pendiente", unidad: "unidades" });
    setMostrarForm(false);
  }

  const inpStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 8,
    border: `1px solid ${t.border}`,
    background: t.bg,
    color: t.text,
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none"
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, height: "100%" }}>
      {/* Segmented Control */}
      <div style={{ display: "flex" }}>
        <div style={{ display: "inline-flex", background: t.bg2, padding: 6, borderRadius: 12, border: `1px solid ${t.border}`, gap: 4 }}>
          {(["entrega", "reabastecimiento"] as const).map(tp => (
            <button 
              key={tp} 
              onClick={() => setTipo(tp)}
              style={{
                padding: "10px 24px", 
                borderRadius: 8, 
                border: "none",
                background: tipo === tp ? t.accentBg : "transparent", 
                color: tipo === tp ? t.accent : t.textSub,
                fontSize: 13, 
                fontWeight: 700, 
                fontFamily: "inherit", 
                cursor: "pointer", 
                transition: "all 0.2s"
              }}
            >
              {tp === "entrega" ? "🚚 Rutas de entrega" : "🏪 Reabastecimiento"}
            </button>
          ))}
        </div>
      </div>

      {/* ── ENTREGAS ── */}
      {tipo === "entrega" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, height: "calc(100vh - 340px)", overflow: "hidden" }}>
          {/* Panel Lateral Izquierdo: Formulario */}
          <div className="ascroll" style={{ display: "flex", flexDirection: "column", gap: 20, overflowY: "auto", paddingRight: 8 }}>
            {/* Punto de Partida */}
            <div style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: t.green, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>Bodega / Punto de Partida</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input style={inpStyle} placeholder="Nombre del punto (ej. Bodega Principal)" value={origen.nombre} onChange={e => setOrigen(prev => ({ ...prev, nombre: e.target.value }))} />
                <input style={inpStyle} placeholder="Dirección física" value={origen.direccion} onChange={e => setOrigen(prev => ({ ...prev, direccion: e.target.value }))} />
              </div>
            </div>

            {/* Listado de Paradas */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: t.textSub, textTransform: "uppercase", letterSpacing: ".06em" }}>Paradas intermedias ({paradas.length})</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={cargarEjemplos} className="btn btn-ghost" style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>Cargar Ejemplo</button>
                  <button onClick={agregarParada} className="btn btn-primary" style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: t.accent }}>+ Añadir Parada</button>
                </div>
              </div>

              {paradas.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: t.textSub, fontSize: 13, background: t.bg2, borderRadius: 16, border: `1px dashed ${t.border}` }}>
                  Sin paradas aún. Añade una para trazar la ruta.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {paradas.map((p, index) => (
                    <div key={p.id} style={{ padding: 20, background: t.bg2, borderRadius: 16, border: `1px solid ${t.border}`, position: "relative" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 24, height: 24, borderRadius: "50%", background: t.accentBg, color: t.accent, display: "flex", alignItems: "center", justifyCenter: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>
                            {index + 1}
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 800 }}>Parada {index + 1}</span>
                        </div>
                        <button onClick={() => eliminarParada(p.id)} className="btn btn-ghost" style={{ color: t.red, padding: "4px 8px", minWidth: 0, fontSize: 12 }}>✕</button>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <input style={inpStyle} placeholder="Nombre de parada" value={p.nombre} onChange={e => actualizarParada(p.id, "nombre", e.target.value)} />
                        <input style={inpStyle} placeholder="Dirección física" value={p.direccion} onChange={e => actualizarParada(p.id, "direccion", e.target.value)} />
                        <input style={inpStyle} placeholder="Notas (opcional)" value={p.notas || ""} onChange={e => actualizarParada(p.id, "notas", e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Destino Final */}
            <div style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: t.accent, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>Punto / Destino Final</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input style={inpStyle} placeholder="Nombre de destino (ej. Retorno o Punto Final)" value={destino.nombre} onChange={e => setDestino(prev => ({ ...prev, nombre: e.target.value }))} />
                <input style={inpStyle} placeholder="Dirección física" value={destino.direccion} onChange={e => setDestino(prev => ({ ...prev, direccion: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Panel Derecho: Selector de Aplicación de Navegación y Línea de Tiempo */}
          <div className="ascroll" style={{ display: "flex", flexDirection: "column", gap: 20, overflowY: "auto", background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 16, padding: 24 }}>
            {/* Configuración de Redirección */}
            <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: "0 0 12px 0", fontSize: 16, color: t.text }}>Servicio de Navegación</h3>
              <p style={{ margin: "0 0 16px 0", fontSize: 13, color: t.textSub, lineHeight: 1.4 }}>
                Selecciona la aplicación en la que deseas trazar tu ruta. Al presionar el botón se abrirá el mapa externo optimizado con todas las paradas en secuencia.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                {[
                  { id: "google_maps", label: "Google Maps", desc: "Trazado completo multi-paradas nativo (Recomendado)" },
                  { id: "apple_maps", label: "Apple Maps", desc: "Trazado multi-paradas integrado para iOS y macOS" },
                  { id: "waze", label: "Waze", desc: "Navegación en tiempo real al destino final" }
                ].map(opt => (
                  <label 
                    key={opt.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: 12,
                      borderRadius: 8,
                      border: `1px solid ${appNavegacion === opt.id ? t.accentMid : t.border}`,
                      background: appNavegacion === opt.id ? t.accentBg : "transparent",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    <input 
                      type="radio" 
                      name="appNavegacion" 
                      checked={appNavegacion === opt.id}
                      onChange={() => setAppNavegacion(opt.id as any)}
                      style={{ marginTop: 3, accentColor: t.accent }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: t.textSub, marginTop: 2 }}>{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              <button 
                onClick={abrirNavegacion}
                className="btn btn-primary"
                style={{ width: "100%", padding: "12px 0", fontSize: 14, fontWeight: 700, background: t.accent, border: "none" }}
              >
                Abrir en Navegador
              </button>
            </div>

            {/* Línea de Tiempo de Ruta */}
            <div style={{ flex: 1, padding: "8px 12px" }}>
              <h3 style={{ margin: "0 0 20px 0", fontSize: 15, color: t.textSub, textTransform: "uppercase", letterSpacing: ".06em" }}>Línea de Tiempo de Ruta Sugerida</h3>
              
              <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
                {/* Línea de fondo vertical */}
                <div style={{
                  position: "absolute",
                  left: 17,
                  top: 15,
                  bottom: 15,
                  width: 2,
                  background: t.border,
                  borderLeft: `2px dashed ${t.border}`,
                  zIndex: 1
                }} />

                {/* Paso 1: Origen */}
                <div style={{ display: "flex", gap: 16, marginBottom: 24, position: "relative", zIndex: 2 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: t.greenBg, color: t.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, border: `2px solid ${t.bg2}` }}>
                    🏭
                  </div>
                  <div style={{ flex: 1, paddingTop: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: t.text }}>{origen.nombre || "Punto de Partida"}</div>
                    <div style={{ fontSize: 12, color: t.textSub, marginTop: 2 }}>{origen.direccion || "Ingresa una dirección..."}</div>
                  </div>
                </div>

                {/* Paradas Intermedias */}
                {paradas.map((p, index) => (
                  <div key={p.id} style={{ display: "flex", gap: 16, marginBottom: 24, position: "relative", zIndex: 2 }}>
                    <div style={{ 
                      width: 36, height: 36, borderRadius: "50%", 
                      background: t.accentBg, color: t.accent, 
                      display: "flex", alignItems: "center", justifyContent: "center", 
                      fontSize: 13, fontWeight: 800, border: `2px solid ${t.bg2}` 
                    }}>
                      {index + 1}
                    </div>
                    <div style={{ flex: 1, paddingTop: 6 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: t.text }}>{p.nombre || `Parada ${index + 1}`}</div>
                      <div style={{ fontSize: 12, color: t.textSub, marginTop: 2 }}>{p.direccion || "Ingresa una dirección..."}</div>
                      {p.notes && <div style={{ fontSize: 11, color: t.accent, marginTop: 4, fontStyle: "italic" }}>{p.notes}</div>}
                    </div>
                  </div>
                ))}

                {/* Paso Final: Destino */}
                <div style={{ display: "flex", gap: 16, position: "relative", zIndex: 2 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: t.accentBg, color: t.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, border: `2px solid ${t.bg2}` }}>
                    🏁
                  </div>
                  <div style={{ flex: 1, paddingTop: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: t.text }}>{destino.nombre || "Destino Final"}</div>
                    <div style={{ fontSize: 12, color: t.textSub, marginTop: 2 }}>{destino.direccion || "Ingresa una dirección..."}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REABASTECIMIENTO ── */}
      {tipo === "reabastecimiento" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Header con stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
            {[
              { label: "Total pedidos", val: pedidos.length, color: t.accent },
              { label: "En tránsito", val: pedidos.filter(p => p.estado === "en_transito").length, color: t.warn },
              { label: "Pendientes", val: pedidos.filter(p => p.estado === "pendiente").length, color: t.textSub },
              { label: "Entregados", val: pedidos.filter(p => p.estado === "entregado").length, color: t.green },
            ].map((s, i) => (
              <div key={i} style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 14, padding: "14px 18px" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "inherit" }}>{s.val}</div>
                <div style={{ fontSize: 11, color: t.textSub, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Botón nuevo pedido */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button 
              onClick={() => setMostrarForm(f => !f)}
              className="btn btn-primary"
              style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: t.accent, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              {mostrarForm ? "Cancelar" : "Nuevo pedido"}
            </button>
          </div>

          {/* Formulario nuevo pedido */}
          {mostrarForm && (
            <div style={{ background: t.bg2, border: `1.5px solid ${t.accentMid}`, borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 14 }}>Nuevo pedido de reabastecimiento</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div><label style={{ fontSize: 10, fontWeight: 600, color: t.textSub, display: "block", marginBottom: 4 }}>PROVEEDOR *</label>
                  <input style={inpStyle} placeholder="Ej: Makro Bogotá" value={nuevoPedido.proveedor || ""} onChange={e => setNuevoPedido(p => ({ ...p, proveedor: e.target.value }))} /></div>
                <div><label style={{ fontSize: 10, fontWeight: 600, color: t.textSub, display: "block", marginBottom: 4 }}>PRODUCTO *</label>
                  <input style={inpStyle} placeholder="Ej: Arroz Diana 50kg" value={nuevoPedido.producto || ""} onChange={e => setNuevoPedido(p => ({ ...p, producto: e.target.value }))} /></div>
                <div><label style={{ fontSize: 10, fontWeight: 600, color: t.textSub, display: "block", marginBottom: 4 }}>CANTIDAD</label>
                  <input type="number" style={inpStyle} value={nuevoPedido.cantidad || ""} onChange={e => setNuevoPedido(p => ({ ...p, cantidad: Number(e.target.value) }))} /></div>
                <div><label style={{ fontSize: 10, fontWeight: 600, color: t.textSub, display: "block", marginBottom: 4 }}>UNIDAD</label>
                  <input style={inpStyle} placeholder="kg, bultos, cajas..." value={nuevoPedido.unidad || ""} onChange={e => setNuevoPedido(p => ({ ...p, unidad: e.target.value }))} /></div>
                <div><label style={{ fontSize: 10, fontWeight: 600, color: t.textSub, display: "block", marginBottom: 4 }}>MONTO (COP)</label>
                  <input type="number" style={inpStyle} value={nuevoPedido.monto || ""} onChange={e => setNuevoPedido(p => ({ ...p, monto: Number(e.target.value) }))} /></div>
                <div><label style={{ fontSize: 10, fontWeight: 600, color: t.textSub, display: "block", marginBottom: 4 }}>NOTAS</label>
                  <input style={inpStyle} placeholder="Opcional" value={nuevoPedido.notas || ""} onChange={e => setNuevoPedido(p => ({ ...p, notas: e.target.value }))} /></div>
              </div>
              <button 
                onClick={agregarPedido}
                className="btn btn-primary"
                style={{ padding: "9px 24px", borderRadius: 9, border: "none", background: t.accent, color: "white", fontSize: 13, fontWeight: 600 }}
              >
                Crear pedido
              </button>
            </div>
          )}

          {/* Lista de pedidos */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pedidos.map(pedido => {
              const cfg = ESTADO_CONFIG[pedido.estado];
              const paso = cfg.paso;
              return (
                <div key={pedido.id} style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 14, padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: t.textSub, fontFamily: "inherit" }}>#{pedido.id}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: `${cfg.color}22`, color: cfg.color }}>
                          {cfg.icono} {cfg.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>{pedido.producto}</div>
                      <div style={{ fontSize: 12, color: t.textSub, marginTop: 2 }}>
                        {pedido.proveedor} · {pedido.cantidad} {pedido.unidad}
                        {pedido.monto ? ` · $${pedido.monto.toLocaleString("es-CO")}` : ""}
                      </div>
                      {pedido.notas && <div style={{ fontSize: 11, color: t.accent, marginTop: 2 }}>{pedido.notas}</div>}
                    </div>
                    <div style={{ fontSize: 11, color: t.textSub, textAlign: "right" }}>
                      <div>{new Date(pedido.fecha + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</div>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  {pedido.estado !== "cancelado" && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        {PASOS_PEDIDO.map((p, i) => {
                          const activo = i <= paso;
                          const pCfg = ESTADO_CONFIG[p];
                          return (
                            <div key={p} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: "50%", border: `2px solid ${activo ? cfg.color : t.border}`,
                                background: activo ? `${cfg.color}22` : "transparent", display: "flex", alignItems: "center",
                                justifyContent: "center", fontSize: 13, transition: "all .3s"
                              }}>
                                {activo ? pCfg.icono : <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.border, display: "block" }} />}
                              </div>
                              <span style={{ fontSize: 9, color: activo ? cfg.color : t.textSub, fontWeight: activo ? 600 : 400, textAlign: "center" }}>
                                {pCfg.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {/* Línea de progreso */}
                      <div style={{ height: 3, background: t.border, borderRadius: 3, margin: "0 14px", position: "relative" }}>
                        <div style={{
                          height: "100%", borderRadius: 3, background: cfg.color,
                          width: `${Math.max(0, paso / (PASOS_PEDIDO.length - 1)) * 100}%`, transition: "width .5s"
                        }} />
                      </div>
                    </div>
                  )}

                  {/* Botones cambiar estado */}
                  {pedido.estado !== "entregado" && pedido.estado !== "cancelado" && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {pedido.estado === "pendiente" && (
                        <button onClick={() => cambiarEstadoPedido(pedido.id, "confirmado")}
                          className="btn btn-ghost"
                          style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${t.accent}44`, background: t.accentBg, color: t.accent, fontSize: 11, fontWeight: 600 }}>
                          Confirmar pedido
                        </button>
                      )}
                      {pedido.estado === "confirmado" && (
                        <button onClick={() => cambiarEstadoPedido(pedido.id, "en_transito")}
                          className="btn btn-ghost"
                          style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${t.warn}44`, background: t.warnBg, color: t.warn, fontSize: 11, fontWeight: 600 }}>
                          Marcar en tránsito
                        </button>
                      )}
                      {pedido.estado === "en_transito" && (
                        <button onClick={() => cambiarEstadoPedido(pedido.id, "entregado")}
                          className="btn btn-ghost"
                          style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${t.green}44`, background: t.greenBg, color: t.green, fontSize: 11, fontWeight: 600 }}>
                          Marcar entregado
                        </button>
                      )}
                      <button onClick={() => cambiarEstadoPedido(pedido.id, "cancelado")}
                        className="btn btn-ghost"
                        style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${t.red}33`, background: t.redBg, color: t.red, fontSize: 11, fontWeight: 600 }}>
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}