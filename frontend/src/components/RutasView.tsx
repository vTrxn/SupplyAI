// frontend/src/components/RutasView.tsx
import { useState, useEffect, useRef } from "react";

interface Props { t: any; dark?: boolean; }

interface Parada {
  id: string;
  nombre: string;
  direccion: string;
  lat?: number;
  lng?: number;
  notas?: string;
}

interface Estadisticas {
  distancia_km: number;
  duracion_min: number;
  duracion_str: string;
  num_paradas: number;
  combustible_l: number;
}

interface ResultadoRuta {
  origen: Parada;
  paradas: Parada[];
  geometria: number[][];
  pasos: Array<{ instruccion: string; distancia_m: number; duracion_s: number }>;
  estadisticas: Estadisticas;
  optimizado: boolean;
  tipo: string;
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

const BOGOTA_CENTER: [number, number] = [4.7110, -74.0721];

const EJEMPLOS_ENTREGA: Parada[] = [
  { id: "e1", nombre: "Cliente 1 - Chapinero", direccion: "Carrera 13 #45-50, Chapinero, Bogotá" },
  { id: "e2", nombre: "Cliente 2 - Usaquén", direccion: "Calle 119 #6-30, Usaquén, Bogotá" },
  { id: "e3", nombre: "Cliente 3 - Suba", direccion: "Avenida Suba #115-60, Suba, Bogotá" },
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
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);
  const mapObjRef = useRef<any>(null);
  const rutaLayerRef = useRef<any>(null);

  const [tipo, setTipo] = useState<"entrega" | "reabastecimiento">("entrega");
  const [origen, setOrigen] = useState<Parada>({ id: "origen", nombre: "Mi bodega", direccion: "Calle 72 #10-07, Bogotá" });
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [resultado, setResultado] = useState<ResultadoRuta | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [tabActiva, setTabActiva] = useState<"mapa" | "pasos">("mapa");

  // Estado pedidos reabastecimiento
  const [pedidos, setPedidos] = useState<Pedido[]>(PEDIDOS_EJEMPLO);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nuevoPedido, setNuevoPedido] = useState<Partial<Pedido>>({ estado: "pendiente", unidad: "unidades" });

  const token = () => localStorage.getItem("token") || "";

  useEffect(() => {
    if ((window as any).L) { iniciarMapa(); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = iniciarMapa;
    document.head.appendChild(script);
  }, []);

  function iniciarMapa() {
    if (!mapRef.current) return;
    const L = (window as any).L;
    leafletRef.current = L;

    if (!mapObjRef.current) {
      const map = L.map(mapRef.current, { zoomControl: true }).setView(BOGOTA_CENTER, 12);
      mapObjRef.current = map;
    }

    const map = mapObjRef.current;

    // Clear old tile layers
    map.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const tileUrl = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    L.tileLayer(tileUrl, {
      attribution: "© OpenStreetMap contributors © CARTO",
      maxZoom: 19,
    }).addTo(map);

    setTimeout(() => map.invalidateSize(), 100);
    setTimeout(() => map.invalidateSize(), 300);
    setTimeout(() => map.invalidateSize(), 600);
  }

  // Effect to handle dark mode toggle without reloading map instance
  useEffect(() => {
    if (mapObjRef.current && leafletRef.current) {
      iniciarMapa();
    }
  }, [dark]);

  useEffect(() => {
    function onResize() {
      if (mapObjRef.current) {
        setTimeout(() => mapObjRef.current.invalidateSize(), 100);
      }
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (mapObjRef.current) {
      setTimeout(() => mapObjRef.current.invalidateSize(), 150);
      setTimeout(() => mapObjRef.current.invalidateSize(), 400);
    }
  }, [tipo]);

  function dibujarRuta(res: ResultadoRuta) {
    const L = leafletRef.current;
    const map = mapObjRef.current;
    if (!L || !map) return;
    if (rutaLayerRef.current) rutaLayerRef.current.forEach((l: any) => map.removeLayer(l));
    const capas: any[] = [];

    if (res.geometria?.length > 0) {
      const latlngs = res.geometria.map((c: number[]) => [c[1], c[0]]);
      const poly = L.polyline(latlngs, { color: "#5b4de8", weight: 5, opacity: .85 }).addTo(map);
      capas.push(poly);
      map.fitBounds(poly.getBounds(), { padding: [40, 40] });
    }

    const iconOrigen = L.divIcon({
      html: `<div style="background:#34d399;width:30px;height:30px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,.4)">🏭</div>`,
      className: "", iconAnchor: [15, 15],
    });
    if (res.origen.lat && res.origen.lng) {
      capas.push(L.marker([res.origen.lat, res.origen.lng], { icon: iconOrigen })
        .bindPopup(`<b>${res.origen.nombre}</b><br>${res.origen.direccion}`).addTo(map));
    }
    res.paradas.forEach((p: any, i: number) => {
      if (!p.lat || !p.lng) return;
      const icon = L.divIcon({
        html: `<div style="background:#7c6ef7;width:30px;height:30px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:white;box-shadow:0 2px 8px rgba(0,0,0,.4)">${i + 1}</div>`,
        className: "", iconAnchor: [15, 15],
      });
      capas.push(L.marker([p.lat, p.lng], { icon })
        .bindPopup(`<b>${i + 1}. ${p.nombre}</b><br>${p.direccion}${p.notas ? `<br><i>${p.notas}</i>` : ""}`).addTo(map));
    });
    rutaLayerRef.current = capas;
  }

  useEffect(() => {
    if (resultado) setTimeout(() => dibujarRuta(resultado), 300);
  }, [resultado]);

  async function planificar() {
    if (!paradas.length) { setError("Agrega al menos una parada"); return; }
    setCargando(true); setError(""); setResultado(null);
    try {
      const res = await fetch("http://localhost:8000/api/v1/routes/planificar", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token()}` },
        body: JSON.stringify({ origen, paradas, tipo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);
      setResultado(data);
      setTabActiva("mapa");
    } catch (e: any) { setError(e.message); }
    finally { setCargando(false); }
  }

  function agregarParada() {
    setParadas(p => [...p, { id: Date.now().toString(), nombre: "", direccion: "", notas: "" }]);
  }
  function actualizarParada(id: string, campo: keyof Parada, valor: string) {
    setParadas(p => p.map(x => x.id === id ? { ...x, [campo]: valor } : x));
  }
  function eliminarParada(id: string) { setParadas(p => p.filter(x => x.id !== id)); }
  function cargarEjemplos() { setParadas(EJEMPLOS_ENTREGA); }

  function cambiarEstadoPedido(id: string, estado: EstadoPedido) {
    setPedidos(p => p.map(x => x.id === id ? { ...x, estado } : x));
  }
  function agregarPedido() {
    if (!nuevoPedido.proveedor || !nuevoPedido.producto) return;
    const pedido: Pedido = {
      id: `P${String(pedidos.length + 1).padStart(3, "0")}`,
      proveedor: nuevoPedido.proveedor || "",
      producto: nuevoPedido.producto || "",
      cantidad: Number(nuevoPedido.cantidad) || 1,
      unidad: nuevoPedido.unidad || "unidades",
      fecha: new Date().toISOString().slice(0, 10),
      estado: "pendiente",
      monto: Number(nuevoPedido.monto) || 0,
      notas: nuevoPedido.notas,
    };
    setPedidos(p => [pedido, ...p]);
    setNuevoPedido({ estado: "pendiente", unidad: "unidades" });
    setMostrarForm(false);
  }

  const inp = { width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.bg, color: t.text, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: "none" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, height: "100%" }}>

      {/* Segmented Control tipo de ruta */}
      <div style={{ display: "flex" }}>
        <div style={{ display: "inline-flex", background: t.bg2, padding: 6, borderRadius: 12, border: `1px solid ${t.border}`, gap: 4 }}>
          {(["entrega", "reabastecimiento"] as const).map(tp => (
            <button key={tp} onClick={() => { setTipo(tp); setResultado(null); }}
              style={{
                padding: "10px 24px", borderRadius: 8, border: "none",
                background: tipo === tp ? t.accentBg : "transparent", color: tipo === tp ? t.accent : t.textSub,
                fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", cursor: "pointer", transition: "all 0.2s"
              }}>
              {tp === "entrega" ? "🚚 Rutas de entrega" : "🏪 Reabastecimiento"}
            </button>
          ))}
        </div>
      </div>

      {/* ── ENTREGA ── */}
      <div style={{ display: tipo === "entrega" ? "flex" : "none", flexDirection: "row", gap: 24, alignItems: "stretch", height: "calc(100vh - 340px)" }}>

        {/* Panel lateral izquierdo full height */}
        <div className="ascroll" style={{ width: 400, display: "flex", flexDirection: "column", gap: 20, flexShrink: 0, overflowY: "auto", paddingRight: 8 }}>
          <div style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: t.green, textTransform: "uppercase" as const, letterSpacing: ".06em", marginBottom: 12 }}>🏭 Origen / Bodega</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input style={inp} placeholder="Nombre" value={origen.nombre} onChange={e => setOrigen(o => ({ ...o, nombre: e.target.value }))} />
              <input style={inp} placeholder="Dirección en Bogotá" value={origen.direccion} onChange={e => setOrigen(o => ({ ...o, direccion: e.target.value }))} />
            </div>
          </div>

          <div style={{ background: "transparent", borderRadius: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: t.textSub, textTransform: "uppercase" as const, letterSpacing: ".06em" }}>📍 Destinos ({paradas.length})</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={cargarEjemplos} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.bg2, color: t.textMain, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>Ejemplos</button>
                <button onClick={agregarParada} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: t.accent, color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>+ Añadir</button>
              </div>
            </div>

            {paradas.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: t.textSub, fontSize: 13, background: t.bg2, borderRadius: 16, border: `1px dashed ${t.border}` }}>Sin paradas aún.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {paradas.map((p, i) => (
                  <div key={p.id} style={{ padding: 20, background: t.bg2, borderRadius: 16, border: `1px solid ${t.border}`, boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: t.accentBg, color: t.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{i + 1}</div>
                        <span style={{ fontSize: 15, fontWeight: 800, color: t.text }}>Parada {i + 1}</span>
                      </div>
                      <button onClick={() => eliminarParada(p.id)} style={{ background: t.redBg, border: "none", color: t.red, cursor: "pointer", fontSize: 14, padding: "4px 8px", borderRadius: 8, fontWeight: 700 }}>✕</button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <input style={inp} placeholder="Nombre del cliente/local" value={p.nombre} onChange={e => actualizarParada(p.id, "nombre", e.target.value)} />
                      <input style={inp} placeholder="Dirección en Bogotá" value={p.direccion} onChange={e => actualizarParada(p.id, "direccion", e.target.value)} />
                      <input style={{ ...inp, fontSize: 12, background: t.bg3, border: `1px dashed ${t.border}` }} placeholder="Notas o instrucciones (opcional)" value={p.notas || ""} onChange={e => actualizarParada(p.id, "notas", e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={planificar} disabled={cargando || !paradas.length}
            style={{
              padding: "14px 0", borderRadius: 12, border: "none", background: cargando || !paradas.length ? t.bg3 : t.accent,
              color: cargando || !paradas.length ? t.textSub : "white", fontSize: 14, fontWeight: 800, fontFamily: "'DM Sans',sans-serif", cursor: !paradas.length ? "not-allowed" : "pointer", marginTop: 8
            }}>
            {cargando ? "Calculando..." : "🗺️ Planificar ruta óptima"}
          </button>

          {error && <div style={{ padding: "12px 16px", background: t.redBg, border: `1px solid ${t.red}33`, borderRadius: 12, fontSize: 13, color: t.red, fontWeight: 600 }}>{error}</div>}

          {resultado && (
            <div style={{ background: t.bg2, border: `1px solid ${t.accentMid}`, borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: t.accent, textTransform: "uppercase" as const, letterSpacing: ".06em", marginBottom: 16 }}>
                Resumen {resultado.optimizado ? "✨ optimizada" : ""}
              </div>
              {[
                { icon: "📏", label: "Distancia total", val: `${resultado.estadisticas.distancia_km} km` },
                { icon: "⏱️", label: "Tiempo estimado", val: resultado.estadisticas.duracion_str },
                { icon: "📍", label: "Puntos de parada", val: String(resultado.estadisticas.num_paradas) },
                { icon: "⛽", label: "Uso de combustible", val: `~${resultado.estadisticas.combustible_l} L` },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${t.border}`, fontSize: 13 }}>
                  <span style={{ color: t.textSub, fontWeight: 500 }}>{s.icon} {s.label}</span>
                  <span style={{ fontWeight: 800, color: t.text, fontFamily: "'DM Mono',monospace" }}>{s.val}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mapa + tabs lado derecho (resto del espacio) */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 0, height: "100%", border: `1px solid ${t.border}`, borderRadius: 16, overflow: "hidden", background: t.bg2 }}>
          {resultado && (
            <div style={{ display: "flex", borderBottom: `1px solid ${t.border}`, background: t.bg }}>
              {(["mapa", "pasos"] as const).map(tab => (
                <button key={tab} onClick={() => setTabActiva(tab)}
                  style={{
                    padding: "12px 24px", border: "none", background: tabActiva === tab ? t.bg2 : "transparent", cursor: "pointer",
                    color: tabActiva === tab ? t.accent : t.textSub, fontWeight: tabActiva === tab ? 800 : 600,
                    borderBottom: tabActiva === tab ? `2px solid ${t.accent}` : "2px solid transparent",
                    fontSize: 13, fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s"
                  }}>
                  {tab === "mapa" ? "🗺️ Visor Geográfico" : "📋 Hoja de Ruta"}
                </button>
              ))}
            </div>
          )}

          {/* Mapa Leaflet — ocupa todo el espacio disponible */}
          <div ref={mapRef} style={{
            height: "100%",
            width: "100%",
            display: tabActiva === "pasos" ? "none" : "block",
            flex: 1,
          }} />

          {/* Instrucciones */}
          {resultado && tabActiva === "pasos" && (
            <div className="ascroll" style={{ padding: 24, overflowY: "auto", flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: t.text, marginBottom: 16 }}>Orden de visitas sugerido</div>
              {[resultado.origen, ...resultado.paradas].map((p: any, i: number) => (
                <div key={i} style={{ display: "flex", gap: 16, padding: "16px 0", borderBottom: `1px solid ${t.border}` }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: i === 0 ? t.green : t.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "white" }}>
                    {i === 0 ? "🏭" : i}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: t.text }}>{p.nombre}</div>
                    <div style={{ fontSize: 13, color: t.textSub, marginTop: 2 }}>{p.direccion}</div>
                    {p.notas && <div style={{ fontSize: 12, color: t.accent, marginTop: 6, fontWeight: 600 }}>{p.notas}</div>}
                  </div>
                </div>
              ))}
              {resultado.pasos.length > 0 && (
                <>
                  <div style={{ fontSize: 15, fontWeight: 800, color: t.text, marginTop: 32, marginBottom: 16 }}>Navegación Trazada</div>
                  {resultado.pasos.map((paso: any, i: number) => (
                    <div key={i} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: `1px solid ${t.border}`, fontSize: 13 }}>
                      <span style={{ color: t.textSub, fontSize: 12, width: 28, flexShrink: 0, paddingTop: 1, fontWeight: 700 }}>{i + 1}.</span>
                      <div style={{ flex: 1, color: t.text, fontWeight: 500 }}>{paso.instruccion}</div>
                      <span style={{ color: t.textSub, fontSize: 13, flexShrink: 0, fontWeight: 700 }}>{paso.distancia_m}m</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

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
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "'DM Mono',monospace" }}>{s.val}</div>
                <div style={{ fontSize: 11, color: t.textSub, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Botón nuevo pedido */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => setMostrarForm(f => !f)}
              style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: t.accent, color: "white", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: "pointer" }}>
              {mostrarForm ? "Cancelar" : "+ Nuevo pedido"}
            </button>
          </div>

          {/* Formulario nuevo pedido */}
          {mostrarForm && (
            <div style={{ background: t.bg2, border: `1.5px solid ${t.accentMid}`, borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 14 }}>Nuevo pedido de reabastecimiento</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div><label style={{ fontSize: 10, fontWeight: 600, color: t.textSub, display: "block", marginBottom: 4 }}>PROVEEDOR *</label>
                  <input style={inp} placeholder="Ej: Makro Bogotá" value={nuevoPedido.proveedor || ""} onChange={e => setNuevoPedido(p => ({ ...p, proveedor: e.target.value }))} /></div>
                <div><label style={{ fontSize: 10, fontWeight: 600, color: t.textSub, display: "block", marginBottom: 4 }}>PRODUCTO *</label>
                  <input style={inp} placeholder="Ej: Arroz Diana 50kg" value={nuevoPedido.producto || ""} onChange={e => setNuevoPedido(p => ({ ...p, producto: e.target.value }))} /></div>
                <div><label style={{ fontSize: 10, fontWeight: 600, color: t.textSub, display: "block", marginBottom: 4 }}>CANTIDAD</label>
                  <input type="number" style={inp} value={nuevoPedido.cantidad || ""} onChange={e => setNuevoPedido(p => ({ ...p, cantidad: Number(e.target.value) }))} /></div>
                <div><label style={{ fontSize: 10, fontWeight: 600, color: t.textSub, display: "block", marginBottom: 4 }}>UNIDAD</label>
                  <input style={inp} placeholder="kg, bultos, cajas..." value={nuevoPedido.unidad || ""} onChange={e => setNuevoPedido(p => ({ ...p, unidad: e.target.value }))} /></div>
                <div><label style={{ fontSize: 10, fontWeight: 600, color: t.textSub, display: "block", marginBottom: 4 }}>MONTO (COP)</label>
                  <input type="number" style={inp} value={nuevoPedido.monto || ""} onChange={e => setNuevoPedido(p => ({ ...p, monto: Number(e.target.value) }))} /></div>
                <div><label style={{ fontSize: 10, fontWeight: 600, color: t.textSub, display: "block", marginBottom: 4 }}>NOTAS</label>
                  <input style={inp} placeholder="Opcional" value={nuevoPedido.notas || ""} onChange={e => setNuevoPedido(p => ({ ...p, notas: e.target.value }))} /></div>
              </div>
              <button onClick={agregarPedido}
                style={{ padding: "9px 24px", borderRadius: 9, border: "none", background: t.accent, color: "white", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: "pointer" }}>
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
                        <span style={{ fontSize: 11, fontWeight: 700, color: t.textSub, fontFamily: "'DM Mono',monospace" }}>#{pedido.id}</span>
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

                  {/* Barra de progreso tipo Temu */}
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
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                      {pedido.estado === "pendiente" && (
                        <button onClick={() => cambiarEstadoPedido(pedido.id, "confirmado")}
                          style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${t.accent}44`, background: t.accentBg, color: t.accent, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                          ✅ Confirmar pedido
                        </button>
                      )}
                      {pedido.estado === "confirmado" && (
                        <button onClick={() => cambiarEstadoPedido(pedido.id, "en_transito")}
                          style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${t.warn}44`, background: t.warnBg, color: t.warn, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                          🚚 Marcar en tránsito
                        </button>
                      )}
                      {pedido.estado === "en_transito" && (
                        <button onClick={() => cambiarEstadoPedido(pedido.id, "entregado")}
                          style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${t.green}44`, background: t.greenBg, color: t.green, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                          📦 Marcar entregado
                        </button>
                      )}
                      <button onClick={() => cambiarEstadoPedido(pedido.id, "cancelado")}
                        style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${t.red}33`, background: t.redBg, color: t.red, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        ❌ Cancelar
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