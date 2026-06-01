import React, { useState, useMemo, useEffect } from "react";
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

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const [contactState, setContactState] = useState<{ phone: string; email: string; message: string }>({ phone: "", email: "", message: "" });
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactFormPhone, setContactFormPhone] = useState("");
  const [contactFormEmail, setContactFormEmail] = useState("");
  const [contactFormMessage, setContactFormMessage] = useState("");
  
  const [showNoContactModal, setShowNoContactModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  
  const [providerContextMenu, setProviderContextMenu] = useState<{ x: number, y: number, provider: Provider } | null>(null);
  const [orderMessage, setOrderMessage] = useState("");
  const [isUsingDefault, setIsUsingDefault] = useState(false);

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
    setSelectedProductIds([]); // Clear selection when supplier changes
    if (selectedProviderId) {
      const saved = localStorage.getItem(`provider_contact_${selectedProviderId}`);
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
  }, [selectedProviderId]);

  useEffect(() => {
    const closeMenus = () => {
      setContextMenu(null);
      setProviderContextMenu(null);
    };
    window.addEventListener("click", closeMenus);
    return () => window.removeEventListener("click", closeMenus);
  }, []);

  function handleProviderContextMenu(e: React.MouseEvent, prov: Provider) {
    e.preventDefault();
    setProviderContextMenu({
      x: e.clientX,
      y: e.clientY,
      provider: prov
    });
  }

  function handleProviderClick(provId: string) {
    setSelectedProviderId(provId);
    setSelectedProductIds([]);
  }

  function handleHacerPedido() {
    if (selectedProductIds.length === 0) {
      showToast("Por favor, selecciona al menos un producto para realizar el pedido.", "error");
      return;
    }

    if (!contactState.phone && !contactState.email) {
      setShowNoContactModal(true);
    } else {
      const selectedProds = providerProducts.filter(p => selectedProductIds.includes(p.id));
      const prodsText = selectedProds.map(p => `- ${p.name}`).join("\n");
      const defaultMsg = `Hola, me gustaría hacer un nuevo pedido de los siguientes productos:\n${prodsText}\n\nQuedo atento.`;
      
      const savedMsg = contactState.message;
      if (savedMsg) {
        setOrderMessage(savedMsg);
        setIsUsingDefault(false);
      } else {
        setOrderMessage(defaultMsg);
        setIsUsingDefault(true);
      }
      setShowOrderModal(true);
    }
  }

  function openEditContact() {
    const activeId = providerContextMenu?.provider.id || selectedProviderId;
    if (!activeId) return;
    
    const saved = localStorage.getItem(`provider_contact_${activeId}`);
    let activeContact = { phone: "", email: "", message: "" };
    if (saved) {
      try {
        activeContact = JSON.parse(saved);
      } catch(e) {}
    }
    
    setContactFormPhone(activeContact.phone || "");
    setContactFormEmail(activeContact.email || "");
    setContactFormMessage(activeContact.message || DEFAULT_MSG);
    setIsEditingContact(true);
  }

  function saveContact() {
    const activeId = providerContextMenu?.provider.id || selectedProviderId;
    if (!activeId) return;
    
    const newContact = {
      phone: contactFormPhone.trim(),
      email: contactFormEmail.trim(),
      message: contactFormMessage,
    };
    localStorage.setItem(`provider_contact_${activeId}`, JSON.stringify(newContact));
    if (activeId === selectedProviderId) {
      setContactState(newContact);
    }
    setIsEditingContact(false);
  }

  function handleTextareaFocus() {
    if (isUsingDefault) {
      setOrderMessage("");
      setIsUsingDefault(false);
    }
  }

  function handleTextareaChange(val: string) {
    setOrderMessage(val);
    setIsUsingDefault(false);
  }

  function executeHacerPedido() {
    if (!confirm("¿Está seguro de que desea realizar el pedido a este proveedor?")) {
      return;
    }
    
    const saved = localStorage.getItem(`provider_contact_${selectedProviderId}`);
    let contact = { phone: "", email: "", message: "" };
    if (saved) {
      try {
        contact = JSON.parse(saved);
      } catch(e) {}
    }
    
    const updatedContact = {
      ...contact,
      message: orderMessage,
    };
    localStorage.setItem(`provider_contact_${selectedProviderId}`, JSON.stringify(updatedContact));
    setContactState(updatedContact);
    
    const encodedMessage = encodeURIComponent(orderMessage);
    if (contact.phone) {
      const cleanPhone = contact.phone.replace(/[^0-9]/g, "");
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
      window.open(waUrl, "_blank");
    } else if (contact.email) {
      const mailtoUrl = `mailto:${contact.email}?subject=Pedido%20de%20Productos%20-%20SupplyAI&body=${encodedMessage}`;
      window.open(mailtoUrl, "_blank");
    }
    
    setShowOrderModal(false);
  }

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
    } catch (e: any) { showToast(e.message, "error"); }
  }

  async function handleUpdateProv() {
    if (!editingProvId || !editingProvName.trim()) return;
    try {
      await updateProvider(editingProvId, { name: editingProvName.trim() });
      setEditingProvId(null);
      onUpdate();
    } catch (e: any) { showToast(e.message, "error"); }
  }

  async function handleDelProv(id: string) {
    if (!confirm("¿Seguro que deseas eliminar este proveedor?")) return;
    try {
      await deleteProvider(id);
      if (selectedProviderId === id) setSelectedProviderId(null);
      onUpdate();
    } catch (e: any) { showToast(e.message, "error"); }
  }

  async function savePrice() {
    if (!editPriceProdId) return;
    try {
      await updateProduct(editPriceProdId, { cost_price: parseFloat(newPrice) || 0 });
      setEditPriceProdId(null);
      onUpdate();
    } catch (e: any) { showToast(e.message, "error"); }
  }

  async function doDeleteProduct(id: string) {
    try {
      await deleteProduct(id);
      setConfirmDeleteProdId(null);
      onUpdate();
    } catch (e: any) { showToast(e.message, "error"); }
  }

  return (
    <>
      <div className="animate-fade" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 24, height: "calc(100vh - 320px)", minHeight: 400, overflow: "hidden" }}>
      {/* Sidebar de proveedores */}
      <div id="tour-proveedores-card" className="card mobile-flat" style={{ display: "flex", flexDirection: "column", padding: 20, overflowY: "auto", border: `1px solid ${t.border}` }}>
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
            <button 
              key={prov.id} 
              onClick={() => handleProviderClick(prov.id)}
              onContextMenu={(e) => handleProviderContextMenu(e, prov)}
              className="btn-provider-list"
              style={{
                width: "100%",
                textAlign: "left",
                padding: "14px 18px",
                borderRadius: 12,
                cursor: "pointer",
                background: selectedProviderId === prov.id ? t.accentBg : t.bg3,
                border: `1px solid ${selectedProviderId === prov.id ? t.accentMid : "transparent"}`,
                display: "flex", justifyContent: "space-between", alignItems: "center",
                color: selectedProviderId === prov.id ? t.accent : t.text,
                fontWeight: 700,
                fontFamily: "inherit",
                fontSize: 14,
                boxSizing: "border-box"
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
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span>{prov.name}</span>
              )}
            </button>
          ))}
          {providers.length === 0 && <div style={{ fontSize: 13, color: t.textSub, textAlign: "center", marginTop: 20 }}>No tienes proveedores.</div>}
        </div>
      </div>

      {/* Catálogo del proveedor */}
      <div className="card mobile-flat" style={{ display: "flex", flexDirection: "column", padding: 24, overflow: "hidden", position: "relative" }} onClick={() => setContextMenu(null)}>
        {selectedProvider ? (
          <>
            <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 800 }}>Catálogo de {selectedProvider.name}</h2>
                <p style={{ color: t.textSub, fontSize: 14 }}>{providerProducts.length} productos asociados</p>
                {(contactState.phone || contactState.email) ? (
                  <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 8, fontSize: 13, color: t.textSub }}>
                    {contactState.phone && <span>Tel/WA: <strong style={{ color: t.text }}>{contactState.phone}</strong></span>}
                    {contactState.email && <span>Correo: <strong style={{ color: t.text }}>{contactState.email}</strong></span>}
                  </div>
                ) : (
                  <div style={{ marginTop: 8, fontSize: 13, color: t.textSub, fontStyle: "italic" }}>Sin contacto vinculado (Haz click derecho en el proveedor para vincular)</div>
                )}
              </div>
              
              <div>
                <button 
                  className="btn btn-primary" 
                  onClick={handleHacerPedido}
                  style={{ padding: "10px 20px", cursor: "pointer", border: "none" }}
                >
                  Realizar pedido
                </button>
              </div>
            </div>

            <div className="table-container" style={{ flex: 1, overflowY: "auto" }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: 40, paddingLeft: 20 }}>
                      {selectedProductIds.length > 0 ? (
                        <div 
                          onClick={() => {
                            if (selectedProductIds.length === providerProducts.length) {
                              setSelectedProductIds([]);
                            } else {
                              setSelectedProductIds(providerProducts.map(p => p.id));
                            }
                          }}
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 6,
                            background: selectedProductIds.length === providerProducts.length ? t.accent : "transparent",
                            border: `2px solid ${selectedProductIds.length === providerProducts.length ? t.accent : t.textSub}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            cursor: "pointer"
                          }}
                        >
                          {selectedProductIds.length === providerProducts.length ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" width="10" height="10">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <div style={{ width: 8, height: 2, background: t.textSub }} />
                          )}
                        </div>
                      ) : null}
                    </th>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Precio (Costo)</th>
                  </tr>
                </thead>
                <tbody>
                  {providerProducts.map(p => {
                    const isSelected = selectedProductIds.includes(p.id);
                    return (
                      <tr 
                        key={p.id} 
                        style={{ cursor: "pointer", background: isSelected ? t.accentBg : "transparent" }}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedProductIds(prev => prev.filter(id => id !== p.id));
                          } else {
                            setSelectedProductIds(prev => [...prev, p.id]);
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setContextMenu({ x: e.clientX, y: e.clientY, productId: p.id });
                        }}
                      >
                        <td style={{ paddingLeft: 20, verticalAlign: "middle" }} onClick={e => e.stopPropagation()}>
                          {isSelected ? (
                            <div style={{
                              width: 18,
                              height: 18,
                              borderRadius: 6,
                              background: t.accent,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "white",
                              animation: "fadeIn 0.2s ease"
                            }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" width="10" height="10">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                          ) : null}
                        </td>
                        <td>
                          <div style={{ fontWeight: 800 }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: t.textSub }}>{p.sku}</div>
                        </td>
                        <td><span className="badge" style={{ background: t.bg3 }}>{p.category || "N/A"}</span></td>
                        <td style={{ fontWeight: 700, color: t.text }}>
                          ${p.cost_price.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                  {providerProducts.length === 0 && (
                     <tr><td colSpan={4} style={{ textAlign: "center", padding: 32, color: t.textSub }}>No hay productos asignados a este proveedor. Ve al inventario para asignar productos.</td></tr>
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
        <button className="btn btn-ghost" style={{ textAlign: "left", padding: "8px 12px", borderRadius: 6, fontSize: 13, border: "none", background: "transparent", cursor: "pointer" }} onClick={() => {
          const prod = providerProducts.find(x => x.id === contextMenu.productId);
          if (prod) {
            setEditPriceProdId(prod.id);
            setNewPrice(String(prod.cost_price));
          }
          setContextMenu(null);
        }}>
          Editar precio costo
        </button>
        <button className="btn btn-ghost" style={{ textAlign: "left", padding: "8px 12px", borderRadius: 6, fontSize: 13, color: t.red, border: "none", background: "transparent", cursor: "pointer" }} onClick={() => {
          setConfirmDeleteProdId(contextMenu.productId);
          setContextMenu(null);
        }}>
          Eliminar producto
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

    {/* Modal: No contact linked */}
    {showNoContactModal && createPortal(
      <div style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: t.bg2, padding: 24, borderRadius: 16, width: 340, border: `1px solid ${t.border}` }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 18, color: t.text }}>Contacto no vinculado</h3>
          <p style={{ fontSize: 13, color: t.textSub, marginBottom: 20, lineHeight: 1.5 }}>
            Este proveedor no tiene un contacto o correo vinculado. ¿Desea agregar uno ahora?
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-ghost" onClick={() => setShowNoContactModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => { setShowNoContactModal(false); openEditContact(); }}>
              Agregar Contacto
            </button>
          </div>
        </div>
      </div>
    , document.body)}

    {/* Modal: Realizar pedido */}
    {showOrderModal && createPortal(
      <div style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: t.bg2, padding: 24, borderRadius: 16, width: 420, border: `1px solid ${t.border}` }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 18, color: t.text }}>Realizar Pedido a {selectedProvider?.name}</h3>
          
          <div style={{ display: "flex", gap: 16, fontSize: 12, color: t.textSub, marginBottom: 16 }}>
            {contactState.phone && <span>WhatsApp: <strong>{contactState.phone}</strong></span>}
            {contactState.email && <span>Correo: <strong>{contactState.email}</strong></span>}
          </div>
          
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: t.textSub, marginBottom: 6, display: "block" }}>Mensaje del Pedido</label>
            <textarea 
              className="search-input" 
              placeholder="Escribe tu mensaje..." 
              value={orderMessage} 
              onFocus={handleTextareaFocus}
              onChange={e => handleTextareaChange(e.target.value)} 
              style={{ width: "100%", padding: 10, minHeight: 120, resize: "vertical", fontFamily: "inherit", fontSize: 13 }}
            />
            {isUsingDefault && (
              <div style={{ fontSize: 11, color: t.textSub, marginTop: 4, fontStyle: "italic" }}>
                Mensaje predeterminado. Al escribir encima se borrará automáticamente.
              </div>
            )}
          </div>
          
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-ghost" onClick={() => setShowOrderModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={executeHacerPedido}>
              Realizar pedido
            </button>
          </div>
        </div>
      </div>
    , document.body)}

    {/* Modal: Edit contact ("Cambiar contacto") */}
    {isEditingContact && createPortal(
      <div style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: t.bg2, padding: 24, borderRadius: 16, width: 400, border: `1px solid ${t.border}` }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 18 }}>Configurar Contacto del Proveedor</h3>
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: t.textSub, marginBottom: 6, display: "block" }}>Número de WhatsApp / Teléfono</label>
            <input 
              className="search-input" 
              placeholder="Ej: +573001234567" 
              value={contactFormPhone} 
              onChange={e => setContactFormPhone(e.target.value)} 
              style={{ width: "100%", padding: 10 }}
            />
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: t.textSub, marginBottom: 6, display: "block" }}>Correo Electrónico</label>
            <input 
              type="email"
              className="search-input" 
              placeholder="Ej: proveedor@empresa.com" 
              value={contactFormEmail} 
              onChange={e => setContactFormEmail(e.target.value)} 
              style={{ width: "100%", padding: 10 }}
            />
          </div>
          
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: t.textSub, marginBottom: 6, display: "block" }}>Mensaje Automático de Pedido</label>
            <textarea 
              className="search-input" 
              placeholder="Escribe el mensaje para hacer pedido..." 
              value={contactFormMessage} 
              onChange={e => setContactFormMessage(e.target.value)} 
              style={{ width: "100%", padding: 10, minHeight: 80, resize: "vertical", fontFamily: "inherit" }}
            />
          </div>
          
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-ghost" onClick={() => setIsEditingContact(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={saveContact}>Guardar Cambios</button>
          </div>
        </div>
      </div>
    , document.body)}

    {/* Right-click provider menu */}
    {providerContextMenu && createPortal(
      <div 
        style={{
          position: "fixed", top: providerContextMenu.y, left: providerContextMenu.x, zIndex: 120,
          background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 12, padding: 8,
          boxShadow: "0 12px 24px rgba(0,0,0,0.2)", minWidth: 180,
          display: "flex", flexDirection: "column", gap: 4
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="btn btn-ghost" 
          style={{ textAlign: "left", padding: "8px 12px", borderRadius: 6, fontSize: 13, border: "none", background: "transparent", cursor: "pointer" }} 
          onClick={(e) => {
            e.stopPropagation();
            setProviderContextMenu(null);
            openEditContact();
          }}
        >
          Cambiar contacto
        </button>
        <button 
          className="btn btn-ghost" 
          style={{ textAlign: "left", padding: "8px 12px", borderRadius: 6, fontSize: 13, border: "none", background: "transparent", cursor: "pointer" }} 
          onClick={(e) => {
            e.stopPropagation();
            setEditingProvId(providerContextMenu.provider.id);
            setEditingProvName(providerContextMenu.provider.name);
            setProviderContextMenu(null);
          }}
        >
          Editar nombre
        </button>
        <button 
          className="btn btn-ghost" 
          style={{ textAlign: "left", padding: "8px 12px", borderRadius: 6, fontSize: 13, color: t.red, border: "none", background: "transparent", cursor: "pointer" }} 
          onClick={(e) => {
            e.stopPropagation();
            const id = providerContextMenu.provider.id;
            setProviderContextMenu(null);
            handleDelProv(id);
          }}
        >
          Eliminar proveedor
        </button>
      </div>
    , document.body)}

    {/* Windows-style toast notification in bottom right */}
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
