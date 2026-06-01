import React, { useState, useMemo, useEffect } from "react";
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
  
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, productId: string } | null>(null);

  const [addStockProdId, setAddStockProdId] = useState<string | null>(null);
  const [addStockVal, setAddStockVal] = useState("");
  const [savingStock, setSavingStock] = useState(false);

  const [confirmEmptyId, setConfirmEmptyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  const [changeProvId, setChangeProvId] = useState<string | null>(null);
  const [newProvName, setNewProvName] = useState("");
  const [selectedProvId, setSelectedProvId] = useState("");

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderGroups, setOrderGroups] = useState<{provider: Provider, products: Product[]}[]>([]);
  const [currentOrderIndex, setCurrentOrderIndex] = useState(0);
  const [orderMessages, setOrderMessages] = useState<Record<string, string>>({});
  
  const [contactState, setContactState] = useState<{ phone: string; email: string; message: string }>({ phone: "", email: "", message: "" });
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactFormPhone, setContactFormPhone] = useState("");
  const [contactFormEmail, setContactFormEmail] = useState("");
  const [contactFormMessage, setContactFormMessage] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "error" | "info" | "success" } | null>(null);

  const DEFAULT_MSG = "Hola, me gustaría hacer un nuevo pedido de sus productos.";

  function showToast(message: string, type: "error" | "info" | "success" = "error") {
    setToast({ message, type });
  }

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const closeMenus = () => {
      setContextMenu(null);
    };
    window.addEventListener("click", closeMenus);
    return () => window.removeEventListener("click", closeMenus);
  }, []);

  useEffect(() => {
    const currentGroup = orderGroups[currentOrderIndex];
    if (currentGroup?.provider) {
      const saved = localStorage.getItem(`provider_contact_${currentGroup.provider.id}`);
      if (saved) {
        try {
          setContactState(JSON.parse(saved));
        } catch (e) {
          setContactState({ phone: "", email: "", message: "" });
        }
      } else {
        setContactState({ phone: "", email: "", message: "" });
      }
    } else {
      setContactState({ phone: "", email: "", message: "" });
    }
  }, [currentOrderIndex, orderGroups]);

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

  function handleHacerPedido() {
    if (selectedProductIds.length === 0) {
      showToast("Por favor, selecciona al menos un producto para realizar el pedido.", "error");
      return;
    }

    const prods = productos.filter(p => selectedProductIds.includes(p.id));
    const prodsWithoutProvider = prods.filter(p => !p.provider_id);
    
    if (prodsWithoutProvider.length > 0) {
      const firstProd = prodsWithoutProvider[0];
      showToast(`El producto "${firstProd.name}" no tiene un proveedor vinculado. Por favor, vincúlale uno.`, "error");
      setChangeProvId(firstProd.id);
      return;
    }

    // Verificar que todos los proveedores tengan un contacto registrado en localStorage
    const uniqueProviderIds = Array.from(new Set(prods.map(p => p.provider_id!)));
    for (const provId of uniqueProviderIds) {
      const prov = providers.find(p => p.id === provId);
      if (prov) {
        const saved = localStorage.getItem(`provider_contact_${prov.id}`);
        let contact = { phone: "", email: "" };
        if (saved) {
          try { contact = JSON.parse(saved); } catch (e) {}
        }
        if (!contact.phone && !contact.email) {
          showToast(`El proveedor "${prov.name}" no tiene teléfono ni correo configurado. Configúralo en Proveedores para continuar.`, "error");
          return;
        }
      }
    }

    const grouped = prods.reduce((acc, p) => {
      const provId = p.provider_id!;
      if (!acc[provId]) acc[provId] = [];
      acc[provId].push(p);
      return acc;
    }, {} as Record<string, Product[]>);

    const groups: {provider: Provider, products: Product[]}[] = [];
    const initMessages: Record<string, string> = {};

    for (const [provId, groupProds] of Object.entries(grouped)) {
      const prov = providers.find(p => p.id === provId);
      if (prov) {
        groups.push({ provider: prov, products: groupProds });
        
        const prodsText = groupProds.map(p => `- ${p.name}`).join("\n");
        const defaultMsg = `Hola, me gustaría hacer un nuevo pedido de los siguientes productos:\n${prodsText}\n\nQuedo atento.`;
        
        const saved = localStorage.getItem(`provider_contact_${prov.id}`);
        let savedMsg = "";
        if (saved) {
          try { savedMsg = JSON.parse(saved).message; } catch(e) {}
        }
        
        if (savedMsg) {
          initMessages[prov.id] = savedMsg;
        } else {
          initMessages[prov.id] = defaultMsg;
        }
      }
    }

    setOrderGroups(groups);
    setOrderMessages(initMessages);
    setCurrentOrderIndex(0);
    setShowOrderModal(true);
  }

  function openEditContact() {
    const currentGroup = orderGroups[currentOrderIndex];
    if (!currentGroup) return;
    
    const activeContact = contactState;
    setContactFormPhone(activeContact.phone || "");
    setContactFormEmail(activeContact.email || "");
    setContactFormMessage(activeContact.message || orderMessages[currentGroup.provider.id] || DEFAULT_MSG);
    setIsEditingContact(true);
  }

  function saveContact() {
    const currentGroup = orderGroups[currentOrderIndex];
    if (!currentGroup) return;
    
    const newContact = {
      phone: contactFormPhone.trim(),
      email: contactFormEmail.trim(),
      message: contactFormMessage,
    };
    
    localStorage.setItem(`provider_contact_${currentGroup.provider.id}`, JSON.stringify(newContact));
    setContactState(newContact);
    
    setOrderMessages(prev => ({
      ...prev,
      [currentGroup.provider.id]: contactFormMessage
    }));
    
    setIsEditingContact(false);
  }

  function executeCurrentOrder() {
    const currentGroup = orderGroups[currentOrderIndex];
    if (!currentGroup) return;
    
    const currentMsg = orderMessages[currentGroup.provider.id];
    const contact = contactState;
    
    const updatedContact = { ...contact, message: currentMsg };
    localStorage.setItem(`provider_contact_${currentGroup.provider.id}`, JSON.stringify(updatedContact));
    setContactState(updatedContact);
    
    const encodedMessage = encodeURIComponent(currentMsg);
    if (contact.phone) {
      const cleanPhone = contact.phone.replace(/[^0-9]/g, "");
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
      window.open(waUrl, "_blank");
    } else if (contact.email) {
      const mailtoUrl = `mailto:${contact.email}?subject=Pedido%20de%20Productos%20-%20SupplyAI&body=${encodedMessage}`;
      window.open(mailtoUrl, "_blank");
    }

    if (currentOrderIndex < orderGroups.length - 1) {
      setCurrentOrderIndex(prev => prev + 1);
    } else {
      setShowOrderModal(false);
      setSelectedProductIds([]); // Clear selection after all orders are done
    }
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

      <div className="card" style={{ padding: "24px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", flex: 1 }}>
            <div id="tour-inventario-search" className="search-wrapper" style={{ minWidth: 260, flex: "1 1 auto", maxWidth: 350 }}>
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
            {selectedProductIds.length > 0 ? (
              <button 
                className="btn btn-primary" 
                style={{ background: t.accent, color: "white", padding: "8px 16px", border: "none", borderRadius: 8, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}
                onClick={handleHacerPedido}
              >
                Hacer Pedido ({selectedProductIds.length})
              </button>
            ) : (
              <button className="btn btn-primary" onClick={onCrear} style={{ padding: "8px 16px" }}>
                Nuevo Producto
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => {}} style={{ padding: "8px 16px" }}>
              <span style={{ fontSize: 16 }}>📥</span> CSV
            </button>
          </div>
        </div>

        <div className="table-container" style={{ minHeight: 300 }} onClick={() => setContextMenu(null)}>
          <table className="custom-table" style={{ borderSpacing: "0 8px" }}>
            <thead>
              <tr>
                <th id="tour-inventario-select-header" style={{ width: 48, paddingLeft: 24 }}>
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedProductIds.length === filtrados.length) {
                        setSelectedProductIds([]);
                      } else {
                        setSelectedProductIds(filtrados.map(p => p.id));
                      }
                    }}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 6,
                      background: selectedProductIds.length === filtrados.length ? t.accent : "transparent",
                      border: `2px solid ${selectedProductIds.length === filtrados.length ? t.accent : t.textSub}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      cursor: "pointer",
                      opacity: selectedProductIds.length > 0 ? 1 : 0.4,
                      pointerEvents: "auto",
                      transition: "opacity 0.2s"
                    }}
                  >
                    {selectedProductIds.length === filtrados.length ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" width="10" height="10">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <div style={{ width: 8, height: 2, background: t.textSub }} />
                    )}
                  </div>
                </th>
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
                const isSelectedForOrder = selectedProductIds.includes(p.id);
                const provName = providers.find(prov => prov.id === p.provider_id)?.name || "Sin proveedor";

                return (
                  <tr 
                    key={p.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProductIds(prev => 
                        prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                      );
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setContextMenu({ x: e.clientX, y: e.clientY, productId: p.id });
                    }}
                    style={{ 
                      cursor: "pointer", 
                      background: isSelectedForOrder ? t.accentBg : "transparent",
                      transition: "background 0.2s"
                    }}
                  >
                    <td 
                      style={{ width: 48, paddingLeft: 24 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProductIds(prev => 
                          prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                        );
                      }}
                    >
                      <div style={{ 
                        width: 18, height: 18, borderRadius: 6, 
                        border: `2px solid ${isSelectedForOrder ? t.accent : t.textSub}`,
                        background: isSelectedForOrder ? t.accent : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", 
                        opacity: isSelectedForOrder ? 1 : 0.4,
                        pointerEvents: "auto",
                        transition: "opacity 0.2s, border-color 0.2s, background-color 0.2s"
                      }}>
                        {isSelectedForOrder && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" width="10" height="10">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {p.image_url ? (
                          <img src={p.image_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: 40, height: 40, borderRadius: 8, background: t.bg3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📦</div>
                        )}
                        <div>
                          <div style={{ fontWeight: 800, color: isSelectedForOrder ? t.accent : t.text }}>{p.name}</div>
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
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18 }}>Cambiar Proveedor para {productos.find(x => x.id === changeProvId)?.name || ""}</h3>
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

      {showOrderModal && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
          <div className="card" style={{ width: 500, maxWidth: "90vw", padding: 32, position: "relative", border: `1px solid ${t.border}`, background: t.bg }}>
            <button 
              onClick={() => setShowOrderModal(false)}
              style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", color: t.textSub, cursor: "pointer", fontSize: 20 }}
            >
              ✕
            </button>
            
            <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, fontSize: 22, color: t.text }}>Realizar Pedido</h2>
              <span className="badge" style={{ background: t.accentBg, color: t.accent }}>
                Proveedor {currentOrderIndex + 1} de {orderGroups.length}
              </span>
            </div>

            {orderGroups[currentOrderIndex] && (() => {
              const group = orderGroups[currentOrderIndex];
              const prov = group.provider;
              const hasContact = contactState.phone || contactState.email;
              const msg = orderMessages[prov.id] || "";

              return (
                <div>
                  <div style={{ padding: "16px", background: t.bg2, borderRadius: 12, marginBottom: 24, border: `1px solid ${t.border}` }}>
                    <h3 style={{ margin: "0 0 8px 0", color: t.accent, fontSize: 18 }}>{prov.name}</h3>
                    
                    {hasContact ? (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                        <div>
                          {contactState.phone && <div style={{ fontSize: 14, color: t.text, marginBottom: 4 }}>📱 {contactState.phone}</div>}
                          {contactState.email && <div style={{ fontSize: 14, color: t.text }}>📧 {contactState.email}</div>}
                        </div>
                        <button className="btn btn-ghost" onClick={openEditContact} style={{ padding: "6px 12px", fontSize: 12 }}>
                          Editar Contacto
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ color: t.warn, fontSize: 14 }}>⚠️ Este proveedor no tiene un contacto vinculado.</div>
                        <button className="btn btn-primary" onClick={openEditContact} style={{ alignSelf: "flex-start", padding: "6px 16px" }}>
                          Vincular Contacto
                        </button>
                      </div>
                    )}
                  </div>

                  {hasContact && (
                    <div style={{ marginBottom: 24 }}>
                      <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600, color: t.textSub }}>Mensaje para el proveedor:</label>
                      <textarea
                        value={msg}
                        onChange={(e) => setOrderMessages(prev => ({ ...prev, [prov.id]: e.target.value }))}
                        className="search-input"
                        style={{ width: "100%", height: 120, padding: 16, resize: "none", fontFamily: "inherit" }}
                        placeholder="Escribe tu mensaje aquí..."
                      />
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button 
                        className="btn btn-ghost" 
                        disabled={currentOrderIndex === 0}
                        onClick={() => setCurrentOrderIndex(prev => prev - 1)}
                        style={{ padding: "8px 16px" }}
                      >
                        ← Anterior
                      </button>
                      <button 
                        className="btn btn-ghost" 
                        disabled={currentOrderIndex === orderGroups.length - 1}
                        onClick={() => setCurrentOrderIndex(prev => prev + 1)}
                        style={{ padding: "8px 16px" }}
                      >
                        Siguiente →
                      </button>
                    </div>
                    <button 
                      className="btn btn-primary"
                      onClick={executeCurrentOrder}
                      disabled={!hasContact}
                      style={{ padding: "10px 24px", background: t.accent, color: "white" }}
                    >
                      {currentOrderIndex === orderGroups.length - 1 ? "Enviar Final y Cerrar" : "Enviar y Continuar"}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      , document.body)}

      {isEditingContact && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 130, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card animate-fade" style={{ background: t.bg2, padding: 32, borderRadius: 16, width: 400, border: `1px solid ${t.border}` }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: 20, color: t.text }}>
              {orderGroups[currentOrderIndex]?.provider.name} - Detalles de Contacto
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: t.textSub, marginBottom: 6, display: "block" }}>Número de WhatsApp</label>
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="+1234567890" 
                  value={contactFormPhone} 
                  onChange={e => setContactFormPhone(e.target.value)} 
                  style={{ width: "100%", padding: 12 }}
                />
              </div>
              
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: t.textSub, marginBottom: 6, display: "block" }}>Correo Electrónico</label>
                <input 
                  type="email" 
                  className="search-input" 
                  placeholder="proveedor@correo.com" 
                  value={contactFormEmail} 
                  onChange={e => setContactFormEmail(e.target.value)} 
                  style={{ width: "100%", padding: 12 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: t.textSub, marginBottom: 6, display: "block" }}>Mensaje Predeterminado (Opcional)</label>
                <textarea 
                  className="search-input" 
                  placeholder="Mensaje base para pedidos..." 
                  value={contactFormMessage} 
                  onChange={e => setContactFormMessage(e.target.value)} 
                  style={{ width: "100%", padding: 12, height: 80, resize: "none" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setIsEditingContact(false)} style={{ padding: "10px 20px" }}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveContact} style={{ padding: "10px 20px" }}>Guardar</button>
            </div>
          </div>
        </div>
      , document.body)}

      {contextMenu && createPortal(
        <div 
          style={{
            position: "fixed", top: contextMenu.y, left: contextMenu.x, zIndex: 150,
            background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 12, padding: 8,
            boxShadow: "0 12px 24px rgba(0,0,0,0.2)", minWidth: 180,
            display: "flex", flexDirection: "column", gap: 4
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="btn btn-ghost" 
            style={{ textAlign: "left", padding: "8px 12px", borderRadius: 6, fontSize: 13, border: "none", background: "transparent", cursor: "pointer" }} 
            onClick={() => {
              setAddStockProdId(contextMenu.productId);
              setContextMenu(null);
            }}
          >
            Añadir stock
          </button>
          <button 
            className="btn btn-ghost" 
            style={{ textAlign: "left", padding: "8px 12px", borderRadius: 6, fontSize: 13, border: "none", background: "transparent", cursor: "pointer" }} 
            onClick={() => {
              const prod = productos.find(p => p.id === contextMenu.productId);
              if (prod) onEdit(prod);
              setContextMenu(null);
            }}
          >
            Editar producto
          </button>
          <button 
            className="btn btn-ghost" 
            style={{ textAlign: "left", padding: "8px 12px", borderRadius: 6, fontSize: 13, border: "none", background: "transparent", cursor: "pointer" }} 
            onClick={() => {
              setChangeProvId(contextMenu.productId);
              setContextMenu(null);
            }}
          >
            Cambiar proveedor
          </button>
          <div style={{ height: 1, background: t.border, margin: "4px 0" }} />
          <button 
            className="btn btn-ghost" 
            style={{ textAlign: "left", padding: "8px 12px", borderRadius: 6, fontSize: 13, color: t.warn, border: "none", background: "transparent", cursor: "pointer" }} 
            onClick={() => {
              setConfirmEmptyId(contextMenu.productId);
              setContextMenu(null);
            }}
          >
            Vaciar stock
          </button>
          <button 
            className="btn btn-ghost" 
            style={{ textAlign: "left", padding: "8px 12px", borderRadius: 6, fontSize: 13, color: t.red, border: "none", background: "transparent", cursor: "pointer" }} 
            onClick={() => {
              setConfirmDeleteId(contextMenu.productId);
              setContextMenu(null);
            }}
          >
            Eliminar producto
          </button>
        </div>
      , document.body)}

      {toast && createPortal(
        <div 
          className="animate-slide"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 1000,
            background: t.bg2,
            border: `1px solid ${t.border}`,
            borderLeft: `5px solid ${toast.type === "error" ? t.red : toast.type === "success" ? t.green : t.accent}`,
            borderRadius: 8,
            padding: "16px 20px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            width: 320,
            fontFamily: "inherit",
            boxSizing: "border-box"
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: toast.type === "error" ? t.red : t.text, marginBottom: 4 }}>
              {toast.type === "error" ? "Error de SupplyAI" : toast.type === "success" ? "Operación Exitosa" : "Información"}
            </div>
            <div style={{ fontSize: 12, color: t.textSub, lineHeight: 1.4 }}>
              {toast.message}
            </div>
          </div>
          <button 
            onClick={() => setToast(null)}
            style={{
              background: "none",
              border: "none",
              color: t.textSub,
              cursor: "pointer",
              fontSize: 14,
              padding: 0,
              display: "flex"
            }}
          >
            ✕
          </button>
        </div>
      , document.body)}
    </>
  );
}