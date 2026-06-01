import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { createMovement, type Product } from "../api/client";

interface MovementsViewProps {
  t: any;
  dark: boolean;
  productos: Product[];
}

export default function MovementsView({ t, productos }: MovementsViewProps) {
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [mode, setMode] = useState<"entrada" | "salida">("entrada");
  const [quantity, setQuantity] = useState(1);
  const [saving, setSaving] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!scannedProduct) {
      // Start the scanner if there is no scanned product
      scannerRef.current = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      scannerRef.current.render(onScanSuccess, onScanFailure);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [productos, scannedProduct]);

  function onScanSuccess(decodedText: string) {
    const prod = productos.find(p => p.id === decodedText || p.sku === decodedText);
    if (prod) {
      setScannedProduct(prod);
      setScannedId(decodedText);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    } else {
      // Maybe show a quick toast or alert?
      // alert("Producto no encontrado: " + decodedText);
    }
  }

  function onScanFailure(error: any) {
    // Ignore frequent errors
  }

  async function registerMovement() {
    if (!scannedProduct) return;
    setSaving(true);
    try {
      await createMovement({
        product_id: scannedProduct.id,
        type: mode,
        quantity,
        reason: "Escáner QR",
        reference: null,
        unit_price: null,
        date: null
      });
      alert("Movimiento registrado con éxito!");
      setScannedId(null);
      setScannedProduct(null);
      setQuantity(1);
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800 }}>Escáner de Movimientos</h2>
        <p style={{ color: t.textSub, fontSize: 14 }}>Escanea el código QR de un producto para registrar entrada o salida</p>
      </div>

      {!scannedProduct ? (
        <div style={{ background: t.bg2, borderRadius: 16, padding: 24, border: `1px solid ${t.border}`, maxWidth: 500, margin: "0 auto", width: "100%" }}>
          <div id="reader" style={{ width: "100%", borderRadius: 12, overflow: "hidden" }}></div>
          <p style={{ textAlign: "center", marginTop: 16, color: t.textSub, fontSize: 13 }}>
            Apunta la cámara al código QR del producto.
          </p>
        </div>
      ) : (
        <div style={{ background: t.bg2, borderRadius: 16, padding: 24, border: `1px solid ${t.border}`, maxWidth: 500, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ textAlign: "center" }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: t.text }}>{scannedProduct.name}</h3>
            <p style={{ color: t.textSub, fontSize: 13, marginTop: 4 }}>
              SKU: {scannedProduct.sku} | Stock actual: <strong style={{ color: t.accent }}>{scannedProduct.current_stock ?? 0}</strong> {scannedProduct.unit}
            </p>
          </div>
          
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn" style={{ flex: 1, padding: "12px", borderRadius: 12, fontWeight: 700, background: mode === "entrada" ? "var(--success)" : "var(--success-soft)", color: mode === "entrada" ? "white" : "var(--success)", border: mode === "entrada" ? "none" : "1px solid var(--success)" }} onClick={() => setMode("entrada")}>
              Entrada
            </button>
            <button className="btn" style={{ flex: 1, padding: "12px", borderRadius: 12, fontWeight: 700, background: mode === "salida" ? "var(--error)" : "var(--error-soft)", color: mode === "salida" ? "white" : "var(--error)", border: mode === "salida" ? "none" : "1px solid var(--error)" }} onClick={() => setMode("salida")}>
              Salida
            </button>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: t.textSub, textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 8 }}>Cantidad a registrar</label>
            <input type="number" className="form-input" value={quantity} onChange={e => setQuantity(+e.target.value)} min="1" style={{ width: "100%", fontSize: 18, padding: "12px 16px", borderRadius: 12, border: `2px solid ${t.border}`, background: t.bg, color: t.text }} />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button className="btn btn-ghost" style={{ flex: 1, padding: "12px", borderRadius: 12 }} onClick={() => {
              setScannedProduct(null);
              setScannedId(null);
            }}>
              Cancelar
            </button>
            <button className="btn btn-primary" style={{ flex: 2, padding: "12px", borderRadius: 12, fontSize: 16 }} onClick={registerMovement} disabled={saving}>
              {saving ? "Registrando..." : "Confirmar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
