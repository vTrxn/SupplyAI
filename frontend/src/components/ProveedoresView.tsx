import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { type Product, type Provider, createProvider, updateProvider, deleteProvider, updateProduct, deleteProduct } from "../api/client";

interface Props {
  t: any;
  productos: Product[];
  providers: Provider[];
  onUpdate: () => void;
}

export default function ProveedoresView({ t, productos, providers, onUpdate }: Props) {
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [newProvName, setNewProvName] = useState("");
  const [editingProvId, setEditingProvId] = useState<string | null>(null);
  const [editingProvName, setEditingProvName] = useState("");
  
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, productId: string } | null>(null);
  const [editPriceProdId, setEditPriceProdId] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [confirmDeleteProdId, setConfirmDeleteProdId] = useState<string | null>(null);

  const selectedProvider = providers.find(p => p.id === selectedProviderId);
  const providerProducts = useMemo(() => {
    if (!selectedProviderId) return [];
    return productos.filter(p => p.provider_id === selectedProviderId);
  }, [productos, selectedProviderId]);

  async function handleCreateProv() {
    if (!newProvName.trim()) return;
    try {
      const p = await createProvider({ name: newProvName.trim() });
      setNewProvName("");
      onUpdate();
      setSelectedProviderId(p.id);
    } catch (e: any) { alert(e.message); }
  }

  async function handleUpdateProv() {
    if (!editingProvId || !editingProvName.trim()) return;
    try {
      await updateProvider(editingProvId, { name: editingProvName.trim() });
      setEditingProvId(null);
      onUpdate();
    } catch (e: any) { alert(e.message); }
  }

  async function handleDelProv(id: string) {
    if (!confirm("¿Seguro que deseas eliminar este proveedor?")) return;
    try {
      await deleteProvider(id);
      if (selectedProviderId === id) setSelectedProviderId(null);
      onUpdate();
    } catch (e: any) { alert(e.message); }
  }

  async function savePrice() {
    if (!editPriceProdId) return;
    try {
      await updateProduct(editPriceProdId, { cost_price: parseFloat(newPrice) || 0 });
      setEditPriceProdId(null);
      onUpdate();
    } catch (e: any) { alert(e.message); }
  }

  async function doDeleteProduct(id: string) {
    try {
      await deleteProduct(id);
      setConfirmDeleteProdId(null);
      onUpdate();
    } catch (e: any) { alert(e.message); }
  }

  return (
    <>
      <div className="animate-fade" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 24, height: "calc(100vh - 320px)", minHeight: 400, overflow: "hidden" }}>
      {/* Sidebar de proveedores */}
      <div className="card" style={{ display: "flex", flexDirection: "column", padding: 20, overflowY: "auto", border: `1px solid ${t.border}` }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Proveedores</h3>
        
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input 
            className="search-input" 
            placeholder="Nuevo proveedor..." 
            value={newProvName} 
            onChange={e => setNewProvName(e.target.value)}
            style={{ flex: 1, padding: "8px 12px" }}
          />
          <button className="btn btn-primary" onClick={handleCreateProv} style={{ padding: "8px 12px" }}>+</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {providers.map(prov => (
            <div 
              key={prov.id} 
              onClick={() => { setSelectedProviderId(prov.id); setContextMenu(null); }}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                cursor: "pointer",
                background: selectedProviderId === prov.id ? t.accentBg : t.bg3,
                border: `1px solid ${selectedProviderId === prov.id ? t.accentMid : "transparent"}`,
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}
            >
              {editingProvId === prov.id ? (
                <input 
                  autoFocus
                  className="search-input"
                  style={{ width: "100%", padding: "4px 8px" }}
                  value={editingProvName}
                  onChange={e => setEditingProvName(e.target.value)}
                  onBlur={handleUpdateProv}
                  onKeyDown={e => e.key === "Enter" && handleUpdateProv()}
                />
              ) : (
                <span style={{ fontWeight: 700, color: selectedProviderId === prov.id ? t.accent : t.text }}>{prov.name}</span>
              )}
              
              {!editingProvId && (
                <div style={{ display: "flex", gap: 4 }}>
                  <button className="btn btn-ghost" style={{ padding: 4 }} onClick={(e) => { e.stopPropagation(); setEditingProvId(prov.id); setEditingProvName(prov.name); }}>✎</button>
                  <button className="btn btn-ghost" style={{ padding: 4, color: t.red }} onClick={(e) => { e.stopPropagation(); handleDelProv(prov.id); }}>✕</button>
                </div>
              )}
            </div>
          ))}
          {providers.length === 0 && <div style={{ fontSize: 13, color: t.textSub, textAlign: "center", marginTop: 20 }}>No tienes proveedores.</div>}
        </div>
      </div>

      {/* Catálogo del proveedor */}
      <div className="card" style={{ display: "flex", flexDirection: "column", padding: 24, overflow: "hidden", position: "relative" }} onClick={() => setContextMenu(null)}>
        {selectedProvider ? (
          <>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800 }}>Catálogo de {selectedProvider.name}</h2>
              <p style={{ color: t.textSub, fontSize: 14 }}>{providerProducts.length} productos asociados</p>
            </div>

            <div className="table-container" style={{ flex: 1, overflowY: "auto" }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Precio (Costo)</th>
                  </tr>
                </thead>
                <tbody>
                  {providerProducts.map(p => (
                    <tr 
                      key={p.id} 
                      style={{ cursor: "context-menu" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setContextMenu({ x: e.clientX, y: e.clientY, productId: p.id });
                      }}
                    >
                      <td>
                        <div style={{ fontWeight: 800 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: t.textSub }}>{p.sku}</div>
                      </td>
                      <td><span className="badge" style={{ background: t.bg3 }}>{p.category || "N/A"}</span></td>
                      <td style={{ fontWeight: 700, color: t.text }}>
                        ${p.cost_price.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {providerProducts.length === 0 && (
                     <tr><td colSpan={3} style={{ textAlign: "center", padding: 32, color: t.textSub }}>No hay productos asignados a este proveedor. Ve al inventario para asignar productos.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: t.textSub }}>
            Selecciona o crea un proveedor para ver su catálogo.
          </div>
        )}
      </div>
    </div>

    {/* Context Menu Modal for Provider Products */}
    {contextMenu && createPortal(
      <div style={{
        position: "fixed", top: contextMenu.y, left: contextMenu.x, zIndex: 100,
        background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 12, padding: 8,
        boxShadow: "0 12px 24px rgba(0,0,0,0.2)", minWidth: 160,
        display: "flex", flexDirection: "column", gap: 4
      }}>
        <button className="btn btn-ghost" style={{ textAlign: "left", padding: "8px 12px", borderRadius: 6, fontSize: 13 }} onClick={() => {
          const prod = providerProducts.find(x => x.id === contextMenu.productId);
          if (prod) {
            setEditPriceProdId(prod.id);
            setNewPrice(String(prod.cost_price));
          }
          setContextMenu(null);
        }}>
          ✏️ Editar precio costo
        </button>
        <button className="btn btn-ghost" style={{ textAlign: "left", padding: "8px 12px", borderRadius: 6, fontSize: 13, color: t.red }} onClick={() => {
          setConfirmDeleteProdId(contextMenu.productId);
          setContextMenu(null);
        }}>
          ❌ Eliminar producto
        </button>
      </div>
    , document.body)}
    
    {/* Modal Editar Precio */}
    {editPriceProdId && createPortal(
      <div style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: t.bg2, padding: 24, borderRadius: 16, width: 300, border: `1px solid ${t.border}` }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16 }}>Editar Precio Costo</h3>
          <input type="number" className="search-input" style={{ width: "100%", padding: 8, marginBottom: 16 }} value={newPrice} onChange={e => setNewPrice(e.target.value)} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-ghost" onClick={() => setEditPriceProdId(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={savePrice}>Guardar</button>
          </div>
        </div>
      </div>
    , document.body)}

    {/* Modal Confirmar Eliminar */}
    {confirmDeleteProdId && createPortal(
      <div style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: t.bg2, padding: 24, borderRadius: 16, width: 300, border: `1px solid ${t.border}` }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, color: t.red }}>¿Seguro que deseas eliminar?</h3>
          <p style={{ fontSize: 13, marginBottom: 16 }}>Esta acción borrará el producto completamente del inventario.</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-ghost" onClick={() => setConfirmDeleteProdId(null)}>Cancelar</button>
            <button className="btn btn-primary" style={{ background: t.red, color: "white" }} onClick={() => doDeleteProduct(confirmDeleteProdId)}>Eliminar (Doble Confirmación)</button>
          </div>
        </div>
      </div>
    , document.body)}
    </>
  );
}
