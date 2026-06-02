import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
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
  const [cameraLoading, setCameraLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    let isMounted = true;
    let qrScanner: Html5Qrcode | null = null;
    setCameraLoading(true);
    setErrorMsg(null);

    const startScanner = async () => {
      // Delay slightly to ensure DOM element is mounted
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (!isMounted || scannedProduct) return;

      const element = document.getElementById("reader");
      if (!element) return;

      try {
        qrScanner = new Html5Qrcode("reader");
        qrScannerRef.current = qrScanner;

        await qrScanner.start(
          { facingMode: "environment" }, // Force rear-facing camera on mobile
          {
            fps: 15,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.65;
              return { width: size, height: size };
            },
          },
          (decodedText) => {
            if (isMounted) {
              onScanSuccess(decodedText, qrScanner);
            }
          },
          () => {
            // Quietly ignore frame capture failures
          }
        );

        if (isMounted) {
          setCameraLoading(false);
          setErrorMsg(null);
        }
      } catch (err: any) {
        console.error("Camera startup failed:", err);
        if (isMounted) {
          setCameraLoading(false);
          if (err.name === "NotAllowedError" || err.message?.includes("Permission")) {
            setErrorMsg("Permiso de cámara denegado. Por favor, autorice el acceso a la cámara en los ajustes de su navegador.");
          } else if (err.name === "NotFoundError" || err.message?.includes("Requested device not found")) {
            setErrorMsg("No se detectó ninguna cámara trasera en este dispositivo.");
          } else {
            setErrorMsg("No se pudo iniciar la cámara. Asegúrese de que no esté en uso por otra pestaña u aplicación.");
          }
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (qrScanner) {
        if (qrScanner.isScanning) {
          qrScanner.stop().catch(console.error);
        }
        qrScannerRef.current = null;
      }
    };
  }, [productos, scannedProduct, retryCount]);

  function onScanSuccess(decodedText: string, scannerInstance: Html5Qrcode | null) {
    const prod = productos.find((p) => p.id === decodedText || p.sku === decodedText);
    if (prod) {
      setScannedProduct(prod);
      setScannedId(decodedText);

      const activeScanner = scannerInstance || qrScannerRef.current;
      if (activeScanner && activeScanner.isScanning) {
        activeScanner.stop().catch(console.error);
        qrScannerRef.current = null;
      }
    } else {
      // Ignorar QR no correspondientes a productos
    }
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
        date: null,
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
        <h2 style={{ fontSize: 24, fontWeight: 800, color: t.text }}>
          Escáner de <span style={{ color: t.accent }}>Movimientos</span>
          <span
            style={{
              fontSize: 10,
              background: t.accent,
              color: "white",
              padding: "2px 6px",
              borderRadius: 4,
              marginLeft: 8,
              verticalAlign: "middle",
              fontWeight: 800,
              letterSpacing: "1px",
            }}
          >
            BETA
          </span>
        </h2>
        <p style={{ color: t.textSub, fontSize: 14 }}>
          Escanea el código QR de un producto para registrar entrada o salida
        </p>
      </div>

      {!scannedProduct ? (
        <div
          style={{
            background: t.bg2,
            borderRadius: 16,
            padding: 24,
            border: `1px solid ${t.border}`,
            maxWidth: 500,
            margin: "0 auto",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: "100%",
              aspectRatio: "1/1",
              borderRadius: 12,
              overflow: "hidden",
              background: "#0d0f12",
              position: "relative",
              border: `1px solid ${t.border}`,
            }}
          >
            {/* The camera target element */}
            <div id="reader" style={{ width: "100%", height: "100%" }}></div>

            {/* Premium Loading Overlay */}
            {cameraLoading && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "#0d0f12",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 16,
                  color: "white",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    border: "3px solid rgba(255,255,255,0.1)",
                    borderTop: `3px solid ${t.accent}`,
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                ></div>
                <p style={{ fontSize: 13, color: "#9ca3af" }}>Encendiendo cámara...</p>
              </div>
            )}

            {/* Error and Permission Diagnostics overlay */}
            {errorMsg && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(13, 15, 18, 0.95)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 24,
                  textAlign: "center",
                  gap: 16,
                }}
              >
                <svg
                  style={{ width: 48, height: 48, color: "var(--error)" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p style={{ fontSize: 13, color: "#f3f4f6", lineHeight: "1.5" }}>{errorMsg}</p>
                <button
                  className="btn btn-primary"
                  style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13 }}
                  onClick={() => setRetryCount((c) => c + 1)}
                >
                  Reintentar
                </button>
              </div>
            )}

            {/* Dynamic CSS for spinner animation */}
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
              #reader video {
                object-fit: cover !important;
                width: 100% !important;
                height: 100% !important;
              }
            `}</style>
          </div>

          <p style={{ textAlign: "center", color: t.textSub, fontSize: 13 }}>
            Apunta la cámara trasera al código QR del producto.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: t.bg2,
            borderRadius: 16,
            padding: 24,
            border: `1px solid ${t.border}`,
            maxWidth: 500,
            margin: "0 auto",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: t.text }}>{scannedProduct.name}</h3>
            <p style={{ color: t.textSub, fontSize: 13, marginTop: 4 }}>
              SKU: {scannedProduct.sku} | Stock actual:{" "}
              <strong style={{ color: t.accent }}>{scannedProduct.current_stock ?? 0}</strong>{" "}
              {scannedProduct.unit}
            </p>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              className="btn"
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: 12,
                fontWeight: 700,
                background: mode === "entrada" ? "var(--success)" : "var(--success-soft)",
                color: mode === "entrada" ? "white" : "var(--success)",
                border: mode === "entrada" ? "none" : "1px solid var(--success)",
              }}
              onClick={() => setMode("entrada")}
            >
              Entrada
            </button>
            <button
              className="btn"
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: 12,
                fontWeight: 700,
                background: mode === "salida" ? "var(--error)" : "var(--error-soft)",
                color: mode === "salida" ? "white" : "var(--error)",
                border: mode === "salida" ? "none" : "1px solid var(--error)",
              }}
              onClick={() => setMode("salida")}
            >
              Salida
            </button>
          </div>

          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: t.textSub,
                textTransform: "uppercase",
                letterSpacing: ".06em",
                display: "block",
                marginBottom: 8,
              }}
            >
              Cantidad a registrar
            </label>
            <input
              type="number"
              className="form-input"
              value={quantity}
              onChange={(e) => setQuantity(+e.target.value)}
              min="1"
              style={{
                width: "100%",
                fontSize: 18,
                padding: "12px 16px",
                borderRadius: 12,
                border: `2px solid ${t.border}`,
                background: t.bg,
                color: t.text,
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button
              className="btn btn-ghost"
              style={{ flex: 1, padding: "12px", borderRadius: 12 }}
              onClick={() => {
                setScannedProduct(null);
                setScannedId(null);
              }}
            >
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 2, padding: "12px", borderRadius: 12, fontSize: 16 }}
              onClick={registerMovement}
              disabled={saving}
            >
              {saving ? "Registrando..." : "Confirmar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
