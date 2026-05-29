import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  getProducts, getAlerts, createProduct, updateProduct, deleteProduct, uploadImage,
  getProviders,
  type Product, type UserProfile, type Alert, type Provider,
} from "../api/client";
import ChatPanel from "../components/ChatPanel";
import MovementsView from "../components/MovementsView";
import AsistenteView from "../components/AsistenteView";
import ForecastView from "../components/ForecastView";
import InventarioView from "../components/InventarioView";
import RutasView from "../components/RutasView";
import AlertsView from "../components/AlertsView";
import IntegrationsView from "../components/IntegrationsView";
import ProveedoresView from "../components/ProveedoresView";

const I = {
  box: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>,
  grid: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
  move: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22" /><polyline points="18 8 12 2 6 8" /><polyline points="6 16 12 22 18 16" /></svg>,
  chart: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
  map: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>,
  bell: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
  bot: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line x1="16" y1="16" x2="16" y2="16" /></svg>,
  database: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>,
  cog: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" /></svg>,
  search: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  refresh: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>,
  logout: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
  sun: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>,
  moon: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>,
  rows: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>,
  cols: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>,
  plus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  warn: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  tag: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>,
  check: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  info: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
  close: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  edit: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
  trash: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>,
};

const NAV = [
  { id: "dashboard", Icon: I.grid, label: "Dashboard" },
  { id: "inventario", Icon: I.box, label: "Inventario" },
  { id: "proveedores", Icon: I.database, label: "Proveedores" },
  { id: "movimientos", Icon: I.move, label: "Movimientos" },
  { id: "forecast", Icon: I.chart, label: "Forecast IA" },
  { id: "rutas", Icon: I.map, label: "Rutas" },
  { id: "alertas", Icon: I.bell, label: "Alertas" },
  { id: "asistente", Icon: I.bot, label: "Asistente IA" },
  { id: "integraciones", Icon: I.database, label: "Integraciones" },
];


type FD = {
  name: string; sku: string; category: string; unit: string;
  cost_price: string; sale_price: string;
  min_stock: string; max_stock: string; reorder_point: string;
  is_active: boolean; stock_inicial: string; image_url: string;
};
const BLANK: FD = { name: "", sku: "", category: "", unit: "unidad", cost_price: "", sale_price: "", min_stock: "", max_stock: "", reorder_point: "", is_active: true, stock_inicial: "", image_url: "" };

function ProductModal({ mode, product, t, onClose, onSave, onDelete }: {
  mode: "create" | "edit"; product?: Product; t: any;
  onClose: () => void; onSave: (d: FD) => Promise<void>; onDelete?: () => Promise<void>;
}) {
  const [f, setF] = useState<FD>(product ? { name: product.name, sku: product.sku, category: product.category || "", unit: product.unit, cost_price: String(product.cost_price), sale_price: String(product.sale_price), min_stock: String(product.min_stock), max_stock: String(product.max_stock), reorder_point: String(product.reorder_point), is_active: product.is_active, stock_inicial: "", image_url: product.image_url || "" } : BLANK);
  const [saving, setSaving] = useState(false);
  const [deling, setDeling] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const set = (k: keyof FD, v: any) => setF(p => ({ ...p, [k]: v }));
  const s14 = { width: 14, height: 14, display: "block" as const };
  const inp = { width: "100%", padding: "9px 12px", border: `1.5px solid ${t.border}`, borderRadius: 9, fontSize: 13, color: t.text, background: t.bg, fontFamily: "'DM Sans',sans-serif", outline: "none", boxSizing: "border-box" as const };
  const lbl = { fontSize: 10, fontWeight: 700 as const, color: t.textSub, textTransform: "uppercase" as const, letterSpacing: ".06em", display: "block", marginBottom: 5 };
  async function save() { if (!f.name.trim()) { alert("Nombre requerido"); return; } if (mode === "create" && !f.sku.trim()) { alert("ID requerido"); return; } setSaving(true); await onSave(f); setSaving(false); }
  async function del() { if (!onDelete) return; setDeling(true); await onDelete(); setDeling(false); }
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 18, width: "100%", maxWidth: 500, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,.4)", animation: "mIn .28s cubic-bezier(.34,1.4,.64,1)" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.accent, letterSpacing: ".1em", textTransform: "uppercase", fontFamily: "'DM Mono',monospace", marginBottom: 3 }}>{mode === "create" ? "Nuevo producto" : "Editar producto"}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: t.text, letterSpacing: "-.02em" }}>{mode === "create" ? "Agregar al inventario" : f.name || "Producto"}</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${t.border}`, background: "none", cursor: "pointer", color: t.textSub, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={s14}><I.close /></span></button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Nombre *</label><input style={inp} value={f.name} onChange={e => set("name", e.target.value)} placeholder="Ej: Arroz Diana 500g" /></div>
            <div><label style={lbl}>ID *</label><input style={{ ...inp, fontFamily: "'DM Mono',monospace" }} value={f.sku} onChange={e => set("sku", e.target.value)} disabled={mode === "edit"} placeholder="Ej: PROD-001" /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Categoria</label><input style={inp} value={f.category} onChange={e => set("category", e.target.value)} placeholder="Ej: Alimentos" /></div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 18 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${f.unit === "unidad" ? t.accent : t.border}`, background: f.unit === "unidad" ? t.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s" }} onClick={() => set("unit", f.unit === "unidad" ? "granel" : "unidad")}>
                {f.unit === "unidad" && <span style={{ color: "white", fontSize: 14, fontWeight: "bold" }}>✓</span>}
              </div>
              <div style={{ cursor: "pointer" }} onClick={() => set("unit", f.unit === "unidad" ? "granel" : "unidad")}><div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Se vende por unidad</div><div style={{ fontSize: 11, color: t.textSub, marginTop: 2 }}>Desmarcar si se vende a granel o valor</div></div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Costo (COP)</label><input type="number" placeholder="0" style={{ ...inp, fontFamily: "'DM Mono',monospace" }} value={f.cost_price} onChange={e => set("cost_price", e.target.value)} /></div>
            <div><label style={lbl}>Precio venta (COP)</label><input type="number" placeholder="0" style={{ ...inp, fontFamily: "'DM Mono',monospace" }} value={f.sale_price} onChange={e => set("sale_price", e.target.value)} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {(["min_stock", "max_stock", "reorder_point"] as const).map((k, i) => (
              <div key={k}><label style={lbl}>{["Min. stock", "Max. stock", "Pto. reorden"][i]}</label><input type="number" placeholder="0" style={{ ...inp, fontFamily: "'DM Mono',monospace" }} value={f[k] as string} onChange={e => set(k, e.target.value)} /></div>
            ))}
          </div>
          {mode === "create" && (
            <div style={{ padding: "12px 14px", background: t.accentBg, border: `1px solid ${t.accentMid}`, borderRadius: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: t.accent, display: "block", marginBottom: 6, letterSpacing: ".04em", textTransform: "uppercase" as const }}>Stock inicial</label>
              <input type="number" min="0" value={f.stock_inicial} onChange={e => set("stock_inicial", e.target.value)}
                placeholder="0"
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${t.accentMid}`, background: t.bg2, color: t.text, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: "none" }} />
              <div style={{ fontSize: 11, color: t.accent, marginTop: 5 }}>Si ingresas un valor mayor a 0, se registrara automaticamente una entrada de ese stock.</div>
            </div>
          )}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: t.textSub, textTransform: "uppercase" as const, letterSpacing: ".06em", display: "block", marginBottom: 5 }}>Imagen del producto (opcional)</label>
            <input type="file" accept="image/*" style={{ ...inp, fontFamily: "'DM Sans',sans-serif", padding: "6px 12px" }} 
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploadingImg(true);
                try {
                  const res = await uploadImage(file);
                  set("image_url", res.url);
                } catch (err: any) {
                  alert("Error subiendo imagen: " + err.message);
                } finally {
                  setUploadingImg(false);
                }
              }} 
            />
            {uploadingImg && <div style={{ fontSize: 11, color: t.accent, marginTop: 4 }}>Subiendo imagen...</div>}
            {f.image_url && <img src={f.image_url} alt="preview" onError={e => { (e.target as any).style.display = "none" }} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, marginTop: 6, border: `1px solid ${t.border}` }} />}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: t.bg3, borderRadius: 10 }}>
            <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Producto activo</div><div style={{ fontSize: 11, color: t.textSub }}>Visible en inventario y alertas</div></div>
            <button onClick={() => set("is_active", !f.is_active)} style={{ width: 42, height: 24, borderRadius: 12, border: "none", cursor: "pointer", position: "relative", background: f.is_active ? t.accent : t.border, transition: "background .2s", flexShrink: 0 }}>
              <span style={{ position: "absolute", width: 18, height: 18, borderRadius: "50%", background: "white", top: 3, left: f.is_active ? "21px" : "3px", transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,.2)" }} />
            </button>
          </div>
        </div>
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${t.border}`, display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          {mode === "edit" && !confirm && <button onClick={() => setConfirm(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: t.redBg, color: t.red, border: `1px solid ${t.red}33`, borderRadius: 9, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: "pointer" }}><span style={s14}><I.trash /></span> Eliminar</button>}
          {mode === "edit" && confirm && <button onClick={del} disabled={deling} style={{ padding: "8px 14px", background: t.red, color: "white", border: "none", borderRadius: 9, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: "pointer" }}>{deling ? "Eliminando..." : "Confirmar eliminacion?"}</button>}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ padding: "8px 16px", background: "none", border: `1px solid ${t.border}`, borderRadius: 9, fontSize: 13, fontWeight: 600, color: t.textSub, fontFamily: "'DM Sans',sans-serif", cursor: "pointer" }}>Cancelar</button>
          <button onClick={save} disabled={saving || uploadingImg} style={{ padding: "8px 22px", background: t.accent, color: "white", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: "pointer", opacity: (saving || uploadingImg) ? 0.7 : 1 }}>{saving ? "Guardando..." : mode === "create" ? "Crear producto" : "Guardar cambios"}</button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ dark, setDark }: { dark: boolean; setDark: (v: boolean) => void }) {
  const [nav, setNav] = useState("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [settOpen, setSettOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsg, setChatMsg] = useState("");
  const [editProd, setEditProd] = useState<Product | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("token")) { window.location.href = "/"; return; }
    load();
  }, []);

  const toggleDark = () => setDark(!dark);

  async function load() {
    setLoading(true); setErr("");
    try {
      const isDev = localStorage.getItem("token") === "dev-token-bypass";
      if (isDev) {
        // 🚧 DEV MODE: usuario y empresa simulados
        setUser({ id: "dev-user", email: "dev@supplyai.com", full_name: "Dev User", company_id: "dev-company", is_active: true, created_at: new Date().toISOString() });
      } else {
        // Obtener usuario desde Supabase (producción)
        const { data: { user: sbUser } } = await supabase.auth.getUser();
        if (sbUser) {
          setUser({ id: sbUser.id, email: sbUser.email || "", full_name: sbUser.user_metadata?.full_name || sbUser.email || "Usuario", company_id: sbUser.id, is_active: true, created_at: sbUser.created_at });
          const token = localStorage.getItem("token") || "";
          const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
          await fetch(`${API_URL}/api/v1/auth/ensure-company`, {
            method: "POST", headers: { "Authorization": `Bearer ${token}` }
          }).catch(() => { });
        }
      }
      const [p, a, provs] = await Promise.all([getProducts(), getAlerts(), getProviders()]);
      setProducts(p); setAlerts(a); setProviders(provs);
    }
    catch (e: any) { setErr(e.message || "Error cargando datos"); }
    finally { setLoading(false); }
  }

  async function handleCreate(form: FD) {
    try { await createProduct({ name: form.name, sku: form.sku, category: form.category || undefined, unit: form.unit, cost_price: +form.cost_price || 0, sale_price: +form.sale_price || 0, min_stock: +form.min_stock || 0, max_stock: +form.max_stock || 0, reorder_point: +form.reorder_point || 0, stock_inicial: +form.stock_inicial || 0, image_url: form.image_url || undefined } as any); setCreateOpen(false); await load(); }
    catch (e: any) { alert("Error al crear: " + e.message); }
  }
  async function handleSave(form: FD) {
    if (!editProd) return;
    try { await updateProduct(editProd.id, { name: form.name, category: form.category || undefined, unit: form.unit, cost_price: +form.cost_price || 0, sale_price: +form.sale_price || 0, min_stock: +form.min_stock || 0, max_stock: +form.max_stock || 0, reorder_point: +form.reorder_point || 0, is_active: form.is_active, image_url: form.image_url || undefined }); setEditProd(null); await load(); }
    catch (e: any) { alert("Error al guardar: " + e.message); }
  }
  async function handleDelete() {
    if (!editProd) return;
    try { await deleteProduct(editProd.id); setEditProd(null); await load(); }
    catch (e: any) { alert("Error al eliminar: " + e.message); }
  }
  function openChatAlert(a: Alert) { if (chatOpen) return; setChatMsg(`Tengo una alerta: "${a.message}" (ID: ${a.sku}, stock: ${a.current_stock}). Que hago?`); setChatOpen(true); }

  const filtered = products
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()) || (p.category || "").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (a.is_active === b.is_active) return a.name.localeCompare(b.name);
      return a.is_active ? -1 : 1;
    });

  const activos = products.filter(p => p.is_active).length;
  const cats = new Set(products.map(p => p.category).filter(Boolean)).size;
  const criticas = alerts.filter(a => a.severity === "critical").length;
  const totalAl = alerts.length;
  const initials = user?.full_name ? user.full_name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() : user?.email?.slice(0, 2).toUpperCase() || "??";
  const displayName = user?.full_name || user?.email || "Usuario";

  const t = {
    bg: "var(--bg-page)", bg2: "var(--bg-card)", bg3: "var(--bg-hover)", border: "var(--border)",
    text: "var(--text-main)", textSub: "var(--text-muted)", textMid: "var(--text-dim)",
    accent: "var(--brand-primary)", accent2: "var(--brand-primary-hover)", accentBg: "var(--brand-primary-soft)", accentMid: "var(--brand-primary-border)",
    red: "var(--error)", redBg: "var(--error-soft)", warn: "var(--warning)", warnBg: "var(--warning-soft)",
    green: "var(--success)", greenBg: "var(--success-soft)", shadow: "var(--shadow-md)",
  };

  const sz = { width: 16, height: 16, display: "block" as const };
  const szM = { width: 18, height: 18, display: "block" as const };
  const METRICS = [
    { label: "Productos", value: String(products.length), sub: `${activos} activos`, Icon: I.box, crit: false },
    { label: "Categorias", value: String(cats), sub: "en catalogo", Icon: I.tag, crit: false },
    { label: "Alertas criticas", value: String(criticas), sub: criticas > 0 ? "urgente" : "ok", Icon: I.warn, crit: criticas > 0 },
    { label: "Total alertas", value: String(totalAl), sub: "activas ahora", Icon: I.bell, crit: false },
  ];

  const NAV_META: Record<string, { label: string; title: string }> = {
    dashboard: { label: "Panel de control", title: "Dashboard" },
    inventario: { label: "Gestion de stock", title: "Inventario" },
    proveedores: { label: "Gestión de proveedores", title: "Proveedores" },
    movimientos: { label: "Entradas y salidas", title: "Movimientos" },
    forecast: { label: "Inteligencia Artificial", title: "Forecast IA" },
    rutas: { label: "Logistica", title: "Rutas" },
    alertas: { label: "Notificaciones", title: "Alertas" },
    asistente: { label: "Chat con IA", title: "Asistente IA" },
    integraciones: { label: "Orígenes de Datos", title: "Integraciones" },
  };
  const curNav = NAV_META[nav] || NAV_META.dashboard;

  function ComingSoon({ icon, title }: { icon: string; title: string }) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: .25 }}>{icon}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.textMid, marginBottom: 8 }}>{title}</div>
          <div style={{ fontSize: 13, color: t.textSub }}>Esta seccion esta en desarrollo</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {settOpen && (
        <>
          <div className="overlay animate-fade" onClick={() => setSettOpen(false)} />
          <div className="side-panel animate-slide">
            <div className="side-panel-header">
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>Configuración</h2>
              <p style={{ color: t.textSub, fontSize: 13 }}>Personaliza tu experiencia de usuario</p>
            </div>

            <div className="side-panel-content">
              <section className="settings-section">
                <h3 className="section-title">Personalización</h3>
                <div className="setting-row">
                  <div className="setting-info">
                    <span className="setting-name">Modo Oscuro</span>
                    <span className="setting-desc">Ajusta el tema visual de la aplicación</span>
                  </div>
                  <button className={`toggle-switch ${dark ? 'active' : ''}`} onClick={toggleDark}>
                    <span className="toggle-handle" />
                  </button>
                </div>
              </section>

              <section className="settings-section">
                <h3 className="section-title">Cuenta y Seguridad</h3>
                <div className="setting-row">
                  <div className="setting-info">
                    <span className="setting-name">Perfil de Usuario</span>
                    <span className="setting-desc">{user?.email || "Sin correo"}</span>
                  </div>
                  <span className="badge" style={{ background: t.accentBg, color: t.accent }}>Activo</span>
                </div>
                <div className="setting-row">
                  <div className="setting-info">
                    <span className="setting-name">Empresa ID</span>
                    <span className="setting-desc" style={{ fontFamily: 'JetBrains Mono' }}>{user?.company_id || "PROD-AI-01"}</span>
                  </div>
                </div>
              </section>
            </div>

            <div className="side-panel-footer">
              <button className="btn btn-primary" onClick={() => setSettOpen(false)} style={{ width: "100%" }}>
                Guardar y Cerrar
              </button>
            </div>
          </div>
        </>
      )}

      {createOpen && <ProductModal mode="create" t={t} onClose={() => setCreateOpen(false)} onSave={handleCreate} />}
      {editProd && <ProductModal mode="edit" product={editProd} t={t} onClose={() => setEditProd(null)} onSave={handleSave} onDelete={handleDelete} />}

      <div className={`sidebar-overlay ${menuOpen ? "mobile-open" : ""}`} onClick={() => setMenuOpen(false)} />
      <aside className={`sidebar ${menuOpen ? "mobile-open" : ""}`} style={{ position: "sticky", top: 0, zIndex: 110 }}>
        <div className="sidebar-logo">
          <div className="logo-icon"><span style={szM}><I.box /></span></div>
          <div className="logo-text">Supply<span>AI</span></div>
        </div>

        <nav className="nav-list">
          {NAV.map(({ id, Icon, label }) => (
            <button
              key={id}
              className={`nav-item ${nav === id ? "active" : ""}`}
              onClick={() => { setNav(id); setMenuOpen(false); }}
            >
              <span className="nav-icon"><Icon /></span>
              {label}
              {id === "alertas" && totalAl > 0 && <span className="nav-badge">{totalAl}</span>}
            </button>
          ))}
          <div style={{ height: 1, background: t.border, margin: "16px 0" }} />
          <button
            className={`nav-item ${settOpen ? "active" : ""}`}
            onClick={() => { setSettOpen(true); setMenuOpen(false); }}
          >
            <span className="nav-icon"><I.cog /></span>
            Ajustes
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{displayName}</div>
              <div className="user-email">{user?.email || "No email"}</div>
            </div>
            <button className="logout-btn" onClick={async () => {
              try {
                if (localStorage.getItem("token") !== "dev-token-bypass") {
                  await supabase.auth.signOut();
                }
              } catch (e) {
                console.error("Error al cerrar sesión en Supabase:", e);
              } finally {
                localStorage.removeItem("token");
                localStorage.removeItem("sb_session"); 
                window.location.href = "/";
              }
            }} title="Cerrar sesión">
              <I.logout />
            </button>
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div className="mobile-header" style={{ background: "var(--glass-bg)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 40 }}>
          <div className="sidebar-logo" style={{ marginBottom: 0, padding: 0 }}>
            <div className="logo-icon" style={{ width: 36, height: 36, boxShadow: "0 4px 10px var(--brand-primary-soft)" }}><span style={sz}><I.box /></span></div>
            <div className="logo-text" style={{ fontSize: "1.2rem" }}>Supply<span>AI</span></div>
          </div>
          <button className="mobile-menu-btn" onClick={() => setMenuOpen(true)}>
            <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
        </div>

        <main className="main-content">
          <header className="topbar">
            <div className="page-header">
              <p>{curNav.label}</p>
              <h1>{curNav.title}</h1>
            </div>

            <div className="topbar-actions">
              {(nav === "dashboard" || nav === "inventario") && (
                <div className="search-wrapper">
                  <span className="search-icon"><I.search /></span>
                  <input
                    className="search-input"
                    placeholder="Buscar en el inventario..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              )}
              <button className="btn btn-ghost desktop-only" onClick={load} style={{ padding: 10 }}>
                <span style={sz}><I.refresh /></span>
              </button>
              <button className="btn btn-ghost desktop-only" onClick={toggleDark} style={{ padding: 10 }}>
                <span style={sz}>{dark ? <I.sun /> : <I.moon />}</span>
              </button>
              <div className="desktop-only" style={{ position: "relative" }}>
                <button className="btn btn-ghost" onClick={() => setNotifOpen(!notifOpen)} style={{ padding: 10, position: "relative" }}>
                  <span style={sz}><I.bell /></span>
                  {totalAl > 0 && <span style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: "50%", background: t.red, border: `2px solid var(--bg-card)` }} />}
                </button>
                
                {notifOpen && (
                  <>
                    <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={() => setNotifOpen(false)} />
                    <div className="card animate-fade" style={{ position: "absolute", top: "100%", right: 0, marginTop: 12, width: 340, padding: 0, zIndex: 100, boxShadow: "0 12px 32px rgba(0,0,0,0.15)", border: `1px solid ${t.border}`, background: t.bg2, overflow: "hidden", borderRadius: 16 }}>
                      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                         <span style={{ fontWeight: 800, color: t.text, fontSize: 15 }}>Notificaciones</span>
                         {totalAl > 0 && <span className="badge" style={{ background: t.redBg, color: t.red, fontWeight: 700, fontSize: 11 }}>{totalAl} nuevas</span>}
                      </div>
                      <div className="ascroll" style={{ maxHeight: 320, overflowY: "auto" }}>
                        {alerts.length === 0 ? (
                           <div style={{ padding: "32px 24px", textAlign: "center", color: t.textSub, fontSize: 13, background: t.bg2 }}>
                             <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
                             No hay notificaciones pendientes en tu cadena de suministro.
                           </div>
                        ) : (
                           alerts.slice(0, 5).map((a, i) => (
                             <div key={i} style={{ padding: "14px 20px", borderBottom: `1px solid ${t.border}`, cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = t.bg3} onMouseLeave={e => e.currentTarget.style.background = "transparent"} onClick={() => { setNotifOpen(false); openChatAlert(a); }}>
                               <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                 <span style={{ width: 8, height: 8, borderRadius: "50%", background: a.severity === "critical" ? t.red : t.warn, boxShadow: `0 0 6px ${a.severity === "critical" ? t.red : t.warn}` }} />
                                 <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: a.severity === "critical" ? t.red : t.warn, letterSpacing: "0.05em" }}>{a.type.replace(/_/g, " ")}</span>
                               </div>
                               <div style={{ fontSize: 13, color: t.text, lineHeight: 1.4, fontWeight: 500 }}>{a.message}</div>
                             </div>
                           ))
                        )}
                      </div>
                      <div style={{ padding: 12, background: t.bg3, borderTop: `1px solid ${t.border}`, textAlign: "center" }}>
                        <button onClick={() => { setNotifOpen(false); setNav("alertas"); }} style={{ width: "100%", padding: "8px 0", fontSize: 13, fontWeight: 700, color: t.accent, background: "transparent", border: "none", cursor: "pointer", transition: "opacity 0.2s" }} onMouseEnter={e => e.currentTarget.style.opacity = "0.7"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                          Ver todas las alertas
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {err && (
            <div className="card animate-fade" style={{ background: t.redBg, borderColor: t.red, padding: "16px 20px", marginBottom: 32, display: "flex", alignItems: "center", justifyContent: "space-between", color: t.red }}>
              <span style={{ fontWeight: 600 }}>{err}</span>
              <button className="btn" style={{ background: t.red, color: "white" }} onClick={load}>Reintentar</button>
            </div>
          )}

          {nav === "movimientos" && <MovementsView t={t} dark={dark} productos={products} />}
          {nav === "inventario" && <InventarioView t={t} dark={dark} productos={products} providers={providers} onUpdate={load} onCrear={() => setCreateOpen(true)} onEdit={(p) => setEditProd(p)} />}
          {nav === "proveedores" && <ProveedoresView t={t} productos={products} providers={providers} onUpdate={load} />}

          {nav === "dashboard" && (
            <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              
              {/* Premium Solid Hero Banner */}
              <div style={{ padding: "36px 48px", borderRadius: 24, background: t.accent, color: "white", boxShadow: `0 12px 24px -8px ${t.accent}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
                  <div>
                    <h2 style={{ fontSize: "2.2rem", fontWeight: 800, marginBottom: 8, letterSpacing: "-0.02em" }}>
                      ¡Hola, {user?.full_name?.split(" ")[0] || "Administrador"}! 👋
                    </h2>
                    <p style={{ fontSize: "1.05rem", opacity: 0.9, maxWidth: 650, lineHeight: 1.6, fontWeight: 500 }}>
                      Bienvenido a tu cadena de suministro inteligente. 
                      Actualmente tienes <strong style={{ color: t.accent, background: "white", padding: "2px 8px", borderRadius: 6 }}>{totalAl} alertas</strong> pendientes y tu red cuenta con <strong style={{ color: t.accent, background: "white", padding: "2px 8px", borderRadius: 6 }}>{activos} productos</strong> activos listos para operar.
                    </p>
                  </div>
                  <div>
                    <button className="btn" onClick={() => { setChatMsg("Genera un resumen ejecutivo de mi operación y revisa alertas."); setChatOpen(true); }} style={{ background: "white", color: t.accent, padding: "14px 28px", borderRadius: 12, fontWeight: 800, fontSize: "1rem", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                      <span style={szM}><I.bot /></span> Resumen IA Rápido
                    </button>
                  </div>
                </div>
              </div>

              {/* Redundant Metrics Grid Removed per user request */}

              {/* Data Layout Split */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
                
                {/* Left: Inventory Highlight Table */}
                <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", borderRadius: 24, border: `1px solid ${t.border}` }}>
                  <div style={{ padding: "28px 32px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: `linear-gradient(to right, transparent, ${t.bg3})` }}>
                    <div>
                      <h3 style={{ fontSize: 20, fontWeight: 800, color: t.text, display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ color: t.accent }}><I.grid /></span> Inventario Actual
                      </h3>
                      <p style={{ fontSize: 13, color: t.textSub, marginTop: 4, fontWeight: 600 }}>{filtered.length} productos gestionados por SupplyAI</p>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <button className="btn btn-primary" onClick={() => setCreateOpen(true)} style={{ borderRadius: 12, padding: "12px 20px" }}>
                        <span style={sz}><I.plus /></span> Añadir Stock
                      </button>
                    </div>
                  </div>

                  <div className="table-container" style={{ padding: "0 32px 32px", overflowY: "auto", maxHeight: 500 }}>
                    <table className="custom-table">
                      <thead style={{ position: "sticky", top: 0, background: t.bg2, zIndex: 10 }}>
                        <tr>
                          {["Producto", "Categoría", "Inventario", "Precio", "Estado", ""].map(c => <th key={c} style={{ paddingTop: 20 }}>{c}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? Array(5).fill(0).map((_, i) => (
                          <tr key={i}>
                            {Array(6).fill(0).map((_, j) => <td key={j}><div className="sk" style={{ height: 20, borderRadius: 6 }} /></td>)}
                          </tr>
                        )) : filtered.map(p => {
                          const stock = p.current_stock ?? 0;
                          const stockBajo = p.min_stock > 0 && stock <= p.min_stock;
                          const stockColor = stock === 0 ? t.red : stockBajo ? t.warn : t.green;
                          return (
                            <tr key={p.id} onClick={() => setEditProd(p)} style={{ cursor: "pointer" }}>
                              <td>
                                <div style={{ fontWeight: 800, color: t.text, fontSize: "0.95rem" }}>{p.name}</div>
                                <div style={{ fontSize: "0.75rem", color: t.textSub, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>{p.sku}</div>
                              </td>
                              <td><span className="badge" style={{ background: t.bg3, color: t.textSub, borderRadius: 8, padding: "4px 10px" }}>{p.category || "General"}</span></td>
                              <td>
                                <span className="stock-badge" style={{ background: stock === 0 ? t.redBg : stockBajo ? t.warnBg : t.greenBg, color: stockColor, borderRadius: 8, padding: "6px 12px", border: `1px solid ${stock === 0 ? t.red : stockBajo ? t.warn : t.green}33` }}>
                                  {stock.toLocaleString()} {p.unit}
                                </span>
                              </td>
                              <td style={{ fontWeight: 800, color: t.accent, fontFamily: "'JetBrains Mono', monospace" }}>
                                ${p.sale_price.toLocaleString()}
                              </td>
                              <td>
                                {p.is_active ? (
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: t.green, fontSize: 13, fontWeight: 800, background: t.greenBg, padding: "4px 10px", borderRadius: 8 }}>
                                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.green, boxShadow: `0 0 8px ${t.green}` }} /> Activo
                                  </span>
                                ) : (
                                  <span style={{ color: t.textSub, fontSize: 13, fontWeight: 600 }}>Inactivo</span>
                                )}
                              </td>
                              <td style={{ textAlign: "right", verticalAlign: "middle" }}><span style={{ color: t.accent, opacity: 0.7, padding: 8, background: t.accentBg, borderRadius: 8, display: "inline-flex" }}><I.edit /></span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right: AI Alerts Panel */}
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  <div className="card" style={{ padding: 28, borderRadius: 24, border: `1px solid ${t.border}`, background: t.bg2 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                      <h3 style={{ fontSize: 18, fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ color: totalAl > 0 ? t.red : t.accent }}><I.bell /></span> Alertas Inteligentes
                      </h3>
                      {totalAl > 0 && <span className="badge" style={{ background: t.redBg, color: t.red, padding: "4px 10px", borderRadius: 8, border: `1px solid ${t.red}33` }}>{totalAl} activas</span>}
                    </div>
                    
                    <div className="ascroll" style={{ maxHeight: 420, position: "relative", zIndex: 1 }}>
                      {alerts.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "40px 20px", background: t.bg2, borderRadius: 16, border: `1px dashed ${t.border}`, boxShadow: t.shadow }}>
                          <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
                          <p style={{ fontWeight: 800, color: t.text, fontSize: 15, marginBottom: 6 }}>Operación Óptima</p>
                          <p style={{ color: t.textMid, fontSize: 13, lineHeight: 1.5 }}>Tu inventario no presenta anomalías ni riesgos de stock en este momento.</p>
                        </div>
                      ) : (
                        alerts.map((a, i) => (
                          <div key={i} onClick={() => openChatAlert(a)} style={{ background: t.bg2, border: `2px solid ${a.severity === "critical" ? t.red : t.warn}44`, padding: 16, borderRadius: 12, marginBottom: 16, cursor: "pointer", transition: "border-color 0.2s" }} onMouseEnter={e => e.currentTarget.style.borderColor = a.severity === "critical" ? t.red : t.warn} onMouseLeave={e => e.currentTarget.style.borderColor = `${a.severity === "critical" ? t.red : t.warn}44`}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                              <span style={{ width: 10, height: 10, borderRadius: "50%", background: a.severity === "critical" ? t.red : t.warn, boxShadow: `0 0 8px ${a.severity === "critical" ? t.red : t.warn}` }} />
                              <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: a.severity === "critical" ? t.red : t.warn, letterSpacing: "0.05em" }}>
                                {a.type.replace("_", " ")}
                              </span>
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: t.text, lineHeight: 1.4 }}>{a.message}</div>
                            <div style={{ fontSize: 12, color: t.textSub, display: "flex", gap: 12, fontWeight: 600 }}>
                              <span style={{ background: t.bg3, padding: "2px 8px", borderRadius: 4 }}>ID: {a.sku}</span>
                              <span style={{ background: t.bg3, padding: "2px 8px", borderRadius: 4 }}>Stock: {a.current_stock}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <button className="btn btn-primary" style={{ width: "100%", marginTop: 24, borderRadius: 12, padding: "14px 20px", display: "flex", justifyContent: "center", fontWeight: 800 }} onClick={() => { setChatMsg("Asesorame sobre las alertas mas urgentes y propon pedidos."); setChatOpen(true); }}>
                      <span style={szM}><I.bot /></span> Delegar resolución a SuplyAI
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {nav === "forecast" && <ForecastView t={t} dark={dark} productos={products} />}
          {nav === "rutas" && <RutasView t={t} dark={dark} />}
          {nav === "alertas" && <AlertsView t={t} dark={dark} alerts={alerts} onOpenChatAlert={openChatAlert} />}
          {nav === "asistente" && <AsistenteView t={t} dark={dark} productos={products} alertas={alerts} onInventarioUpdate={load} />}
          {nav === "integraciones" && <IntegrationsView t={t} dark={dark} />}
        </main>

        <footer style={{ marginTop: "auto", padding: "24px", textAlign: "center", borderTop: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, background: "transparent" }}>
          <div style={{ fontWeight: 800, color: t.text, fontFamily: 'Outfit', fontSize: 15, marginBottom: 4 }}>SupplyAI</div>
          <div>© {new Date().getFullYear()} — Plataforma de Inteligencia Predictiva. Todos los derechos reservados.</div>
        </footer>
      </div>

      {chatOpen && <ChatPanel dark={dark} productos={products} alertas={alerts} initialMessage={chatMsg} onClose={() => { setChatOpen(false); setChatMsg(""); }} />}
    </div>
  );
}