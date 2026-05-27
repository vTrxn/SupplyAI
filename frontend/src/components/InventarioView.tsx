import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { type Product, type Provider, createMovement, updateProduct, deleteProduct, createProvider } from "../api/client";

interface Props {
  t: any;
  dark?: boolean;
  productos: Product[];
  providers: Provider[];
  onUpdate: () => void;
  onCrear: () => void;
  onEdit: (p: Product) => void;
}

type SortKey = "name" | "current_stock" | "sale_price" | "category";
type SortDir = "asc" | "desc";
type Filtro  = "todos" | "activos" | "inactivos" | "bajo_stock" | "agotados" | "excedidos";

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export default function InventarioView({ t, productos, providers, onUpdate, onCrear, onEdit }: Props) {
  const [search,    setSearch]    = useState("");
  const [filtro,    setFiltro]    = useState<Filtro>("todos");
  const [sortKey,   setSortKey]   = useState<SortKey>("name");
  const [sortDir,   setSortDir]   = useState<SortDir>("asc");
  const [catFiltro, setCatFiltro] = useState("todas");
  
  const [selectedProdId, setSelectedProdId] = useState<string | null>(null);

  const [addStockProdId, setAddStockProdId] = useState<string | null>(null);
  const [addStockVal, setAddStockVal] = useState("");
  const [savingStock, setSavingStock] = useState(false);

  const [confirmEmptyId, setConfirmEmptyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  const [changeProvId, setChangeProvId] = useState<string | null>(null);
  const [newProvName, setNewProvName] = useState("");
  const [selectedProvId, setSelectedProvId] = useState("");

  const categorias = useMemo(() => {
    const cats = new Set(productos.map(p => p.category).filter(Boolean) as string[]);
    return ["todas", ...Array.from(cats).sort()];
  }, [productos]);

  const filtrados = useMemo(() => {
    return productos
      .filter(p => {
        const stock = p.current_stock ?? 0;
        const q     = search.toLowerCase();
        const matchSearch = !q || p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) || (p.category||"").toLowerCase().includes(q);
        const matchCat    = catFiltro === "todas" || p.category === catFiltro;
        const matchFiltro = filtro === "todos"      ? true
          : filtro === "activos"   ? p.is_active
          : filtro === "inactivos" ? !p.is_active
          : filtro === "agotados"  ? stock === 0
          : filtro === "bajo_stock"? p.min_stock > 0 && stock <= p.min_stock && stock > 0
          : filtro === "excedidos" ? p.max_stock > 0 && stock > p.max_stock
          : true;
        return matchSearch && matchCat && matchFiltro;
      })
      .sort((a, b) => {
        let va: any, vb: any;
        if (sortKey === "name")          { va = a.name;          vb = b.name; }
        else if (sortKey === "current_stock") { va = a.current_stock??0; vb = b.current_stock??0; }
        else if (sortKey === "sale_price")    { va = a.sale_price;       vb = b.sale_price; }
        else if (sortKey === "category")      { va = a.category||"";     vb = b.category||""; }
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ?  1 : -1;
        return 0;
      });
  }, [productos, search, filtro, catFiltro, sortKey, sortDir]);

  const stats = useMemo(() => ({
    total:      productos.length,
    activos:    productos.filter(p => p.is_active).length,
    agotados:   productos.filter(p => (p.current_stock??0) === 0).length,
    bajoStock:  productos.filter(p => p.min_stock > 0 && (p.current_stock??0) <= p.min_stock && (p.current_stock??0) > 0).length,
    valorTotal: productos.reduce((s, p) => s + (p.current_stock??0) * p.cost_price, 0),
  }), [productos]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  async function guardarStock(prodId: string) {
    const qty = parseFloat(addStockVal);
    if (isNaN(qty) || qty <= 0) return;
    setSavingStock(true);
    try {
      await createMovement({
        product_id: prodId,
        type:       "entrada",
        quantity:   qty,
        reason:     "Adición rápida",
        reference:  null, unit_price: null, date: null,
      });
      setAddStockProdId(null);
      setAddStockVal("");
      onUpdate();
    } catch(e) {}
    finally { setSavingStock(false); }
  }

  async function doEmpty(prodId: string) {
    const p = productos.find(x => x.id === prodId);
    if (!p) return;
    try {
      if (p.current_stock > 0) {
        await createMovement({
          product_id: p.id,
          type: "salida",
          quantity: p.current_stock,
          reason: "Vaciado manual de stock",
          reference: null, unit_price: null, date: null
        });
      }
      setConfirmEmptyId(null);
      onUpdate();
    } catch (e: any) { alert(e.message); }
  }

  async function doDelete(prodId: string) {
    try {
      await deleteProduct(prodId);
      setConfirmDeleteId(null);
      onUpdate();
    } catch (e: any) { alert(e.message); }
  }

  async function doChangeProvider(prodId: string) {
    try {
      let provId = selectedProvId;
      if (!provId && newProvName.trim()) {
        const prov = await createProvider({ name: newProvName.trim() });
        provId = prov.id;
      }
      if (provId) {
        await updateProduct(prodId, { provider_id: provId });
        setChangeProvId(null);
        setNewProvName("");
        setSelectedProvId("");
        onUpdate();
      }
    } catch (e: any) { alert(e.message); }
  }

  const FILTROS: Array<{id: Filtro; label: string; count: number; color: string}> = [
    { id:"todos",      label:"Todos",       count: productos.length,   color: t.accent   },
    { id:"activos",    label:"Activos",     count: stats.activos,      color: t.green    },
    { id:"agotados",   label:"Agotados",    count: stats.agotados,     color: t.red      },
    { id:"bajo_stock", label:"Stock bajo",  count: stats.bajoStock,    color: t.warn     },
    { id:"inactivos",  label:"Inactivos",   count: productos.length - stats.activos, color: t.textSub },
  ];

  return (
    <>
      <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div className="metrics-grid">
        {[
          { label: "Total", val: stats.total, sub: "Productos", color: t.accent, icon: "📦" },
          { label: "Activos", val: stats.activos, sub: "Venta activa", color: t.green, icon: "✅" },
          { label: "Agotados", val: stats.agotados, sub: "Sin existencias", color: t.red, icon: "🔴" },
          { label: "Bajo Stock", val: stats.bajoStock, sub: "Necesitan reorden", color: t.warn, icon: "⚠️" },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: "20px", display: "flex", alignItems: "center", gap: 16 }}>
            <div className="metric-icon-box" style={{ background: s.color + "15", color: s.color, fontSize: 24, flexShrink: 0, width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12 }}>
              {s.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div className="metric-value" style={{ margin: 0, fontSize: "1.5rem", lineHeight: 1 }}>{s.val}</div>
                <span className="badge" style={{ background: s.color + "15", color: s.color, fontSize: 10 }}>{s.sub}</span>
              </div>
              <div className="metric-label" style={{ margin: 0, fontSize: 13 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: "24px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", flex: 1 }}>
            <div className="search-wrapper" style={{ minWidth: 260, flex: "1 1 auto", maxWidth: 350 }}>
              <span className="search-icon"><SearchIcon /></span>
              <input
                className="search-input"
                placeholder="Buscar por nombre, ID o..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ padding: "10px 16px 10px 40px" }}
              />
            </div>
            
            <select 
              className="search-input" 
              style={{ width: "auto", padding: "10px 16px" }}
              value={catFiltro}
              onChange={e => setCatFiltro(e.target.value)}
            >
              {categorias.map(c => <option key={c} value={c}>{c === "todas" ? "Todas las categorías" : c}</option>)}
            </select>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {FILTROS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFiltro(f.id)}
                  className={`badge ${filtro === f.id ? "active" : ""}`}
                  style={{
                    cursor: "pointer",
                    padding: "6px 12px",
                    background: filtro === f.id ? f.color : t.bg3,
                    color: filtro === f.id ? "white" : t.textSub,
                    border: "none",
                    fontSize: 12,
                    fontWeight: 700
                  }}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
            <button className="btn btn-ghost" onClick={() => {}} style={{ padding: "8px 16px" }}>
              <span style={{ fontSize: 16 }}>📥</span> CSV
            </button>
            <button className="btn btn-primary" onClick={onCrear} style={{ padding: "8px 16px" }}>
              <span style={{ fontSize: 16 }}>+</span> Nuevo Producto
            </button>
          </div>
        </div>

        <div className="table-container" style={{ minHeight: 300 }} onClick={() => setSelectedProdId(null)}>
          <table className="custom-table" style={{ borderSpacing: "0 8px" }}>
            <thead>
              <tr>
                <th onClick={() => toggleSort("name")} style={{ cursor: "pointer" }}>Producto {sortKey === "name" && (sortDir === "asc" ? "↑" : "↓")}</th>
                <th onClick={() => toggleSort("category")} style={{ cursor: "pointer" }}>Categoría {sortKey === "category" && (sortDir === "asc" ? "↑" : "↓")}</th>
                <th>Proveedor</th>
                <th onClick={() => toggleSort("current_stock")} style={{ cursor: "pointer" }}>Stock {sortKey === "current_stock" && (sortDir === "asc" ? "↑" : "↓")}</th>
                <th onClick={() => toggleSort("sale_price")} style={{ cursor: "pointer" }}>Precio {sortKey === "sale_price" && (sortDir === "asc" ? "↑" : "↓")}</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(p => {
                const stock = p.current_stock ?? 0;
                const stockBajo = p.min_stock > 0 && stock <= p.min_stock;
                const stockColor = stock === 0 ? t.red : stockBajo ? t.warn : t.green;
                const isSelected = selectedProdId === p.id;
                const provName = providers.find(prov => prov.id === p.provider_id)?.name || "Sin proveedor";

                return (
                  <React.Fragment key={p.id}>
                    <tr 
                      onClick={(e) => { e.stopPropagation(); setSelectedProdId(isSelected ? null : p.id); }}
                      style={{ 
                        cursor: "pointer", 
                        background: isSelected ? t.accentBg : "transparent",
                        transition: "background 0.2s"
                      }}
                    >
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          {p.image_url ? (
                            <img src={p.image_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: 40, height: 40, borderRadius: 8, background: t.bg3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📦</div>
                          )}
                          <div>
                            <div style={{ fontWeight: 800, color: isSelected ? t.accent : t.text }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: t.textSub, fontFamily: "JetBrains Mono" }}>{p.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge" style={{ background: t.bg3, color: t.textSub }}>{p.category || "General"}</span></td>
                      <td><span style={{ fontSize: 13, color: t.textSub }}>{provName}</span></td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span style={{ fontWeight: 800, color: stockColor, fontFamily: "JetBrains Mono", fontSize: 16 }}>{stock} {p.unit}</span>
                          <div style={{ width: 100, height: 4, background: t.border, borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ 
                              width: `${Math.min((stock / (p.max_stock || 100)) * 100, 100)}%`, 
                              height: "100%", 
                              background: stockColor 
                            }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 800, color: t.accent, fontFamily: "JetBrains Mono" }}>${p.sale_price.toLocaleString()}</td>
                    </tr>
                    
                    {/* Fila expandida de menú contextual */}
                    {isSelected && (
                      <tr style={{ background: t.accentBg }}>
                        <td colSpan={5} style={{ padding: "12px 24px" }}>
                          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            <button className="btn btn-primary" style={{ padding: "8px 16px" }} onClick={() => setAddStockProdId(p.id)}>
                              ➕ Añadir stock
                            </button>
                            <button className="btn btn-ghost" style={{ padding: "8px 16px", background: "white", color: t.accent }} onClick={() => onEdit(p)}>
                              ✏️ Editar producto
                            </button>
                            <button className="btn btn-ghost" style={{ padding: "8px 16px", background: "white", color: t.text }} onClick={() => setChangeProvId(p.id)}>
                              🔄 Cambiar proveedor
                            </button>
                            <div style={{ flex: 1 }} />
                            <button className="btn btn-ghost" style={{ padding: "8px 16px", color: t.warn, border: `1px solid ${t.warn}` }} onClick={() => setConfirmEmptyId(p.id)}>
                              🧹 Vaciar stock
                            </button>
                            <button className="btn btn-ghost" style={{ padding: "8px 16px", color: t.red, border: `1px solid ${t.red}` }} onClick={() => setConfirmDeleteId(p.id)}>
                              🗑️ Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {/* Modales utilizando Portal para evitar problemas con position: fixed */}
      {addStockProdId && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: t.bg2, padding: 24, borderRadius: 16, width: 320, border: `1px solid ${t.border}` }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18 }}>Añadir Stock Rápidamente</h3>
            <input 
              type="number" 
              className="search-input" 
              placeholder="Cantidad a añadir..." 
              value={addStockVal} 
              onChange={e => setAddStockVal(e.target.value)} 
              style={{ width: "100%", padding: 12, marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setAddStockProdId(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => guardarStock(addStockProdId)} disabled={savingStock}>
                {savingStock ? "Guardando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {changeProvId && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: t.bg2, padding: 24, borderRadius: 16, width: 360, border: `1px solid ${t.border}` }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18 }}>Cambiar Proveedor</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: t.textSub, marginBottom: 4, display: "block" }}>Seleccionar existente</label>
              <select className="search-input" style={{ width: "100%", padding: 10 }} value={selectedProvId} onChange={e => { setSelectedProvId(e.target.value); setNewProvName(""); }}>
                <option value="">-- Ninguno --</option>
                {providers.map(prov => <option key={prov.id} value={prov.id}>{prov.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: t.textSub, marginBottom: 4, display: "block" }}>O crear uno nuevo</label>
              <input 
                className="search-input" 
                placeholder="Nombre del nuevo proveedor..." 
                value={newProvName} 
                onChange={e => { setNewProvName(e.target.value); setSelectedProvId(""); }} 
                style={{ width: "100%", padding: 10 }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setChangeProvId(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => doChangeProvider(changeProvId)}>Guardar</button>
            </div>
          </div>
        </div>
      , document.body)}

      {confirmEmptyId && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: t.bg2, padding: 24, borderRadius: 16, width: 320, border: `1px solid ${t.border}` }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18, color: t.warn }}>¿Vaciar el stock?</h3>
            <p style={{ fontSize: 13, marginBottom: 16 }}>Esta acción establecerá el stock a 0. Se requiere doble confirmación.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setConfirmEmptyId(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ background: t.warn, color: "white" }} onClick={() => doEmpty(confirmEmptyId)}>
                Sí, vaciar stock (Confirmar)
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {confirmDeleteId && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: t.bg2, padding: 24, borderRadius: 16, width: 320, border: `1px solid ${t.border}` }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18, color: t.red }}>¿Eliminar producto?</h3>
            <p style={{ fontSize: 13, marginBottom: 16 }}>Esta acción eliminará el producto del inventario de forma permanente.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setConfirmDeleteId(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ background: t.red, color: "white" }} onClick={() => doDelete(confirmDeleteId)}>
                Sí, eliminar (Confirmar)
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
}