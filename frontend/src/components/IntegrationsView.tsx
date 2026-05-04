import { useState, useRef } from "react";

interface IntegrationsViewProps {
  t: any;
  dark: boolean;
}

const INTEGRATIONS = [
  { id: "excel", name: "Excel / CSV", type: "file", desc: "Descarga un archivo plano de tu inventario", color: "#107c41", bg: "rgba(16, 124, 65, 0.1)", icon: "📊" },
  { id: "postgres", name: "PostgreSQL", type: "db", desc: "Exporta la tabla a formato fácil para SQL", color: "#336791", bg: "rgba(51, 103, 145, 0.1)", icon: "🐘" },
  { id: "sap", name: "SAP ERP", type: "erp", desc: "Descarga archivo compatible con importador SAP", color: "#0FAAFF", bg: "rgba(15, 170, 255, 0.1)", icon: "⚙️" },
  { id: "shopify", name: "Shopify", type: "api", desc: "Sincroniza y descarga SKUs de e-commerce", color: "#95BF47", bg: "rgba(149, 191, 71, 0.1)", icon: "🛍️" },
];

export default function IntegrationsView({ t, dark }: IntegrationsViewProps) {
  const [filter, setFilter] = useState("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const filtered = INTEGRATIONS.filter(i => filter === "all" || i.type === filter);

  async function handleDownload(id: string) {
    setDownloadingId(id);
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
    
    let endpoint = "/api/v1/excel/export";
    let extension = "xlsx";

    if (id === "postgres") {
      endpoint = "/api/v1/excel/export/sql";
      extension = "sql";
    } else if (id === "sap") {
      endpoint = "/api/v1/excel/export/sap";
      extension = "csv";
    } else if (id === "shopify") {
      endpoint = "/api/v1/excel/export/shopify";
      extension = "csv";
    }

    const url = `${baseUrl}${endpoint}`;
    const token = localStorage.getItem("token") || "";

    try {
      const res = await fetch(url, { headers: { "Authorization": `Bearer ${token}` } });
      if (!res.ok) throw new Error("Error generado");
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const d = new Date();
      const timestamp = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
      a.download = `SupplyAI_${id}_${timestamp}.${extension}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(`Error al descargar ${id}`);
    } finally {
      setTimeout(() => setDownloadingId(null), 500);
    }
  }

  async function handleUploadExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const token = localStorage.getItem("token") || "";
    const formData = new FormData();
    formData.append("file", file);

    try {
      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const res = await fetch(`${baseUrl}/api/v1/excel/import`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) {
        const errDetails = await res.json().catch(() => ({}));
        throw new Error(errDetails.detail || "Error al subir");
      }
      const data = await res.json();
      alert(`Importación completada:\n✅ Creados: ${data.stats.creados}\n🔄 Actualizados: ${data.stats.actualizados}\n⚠️ Errores: ${data.stats.errores}`);
    } catch (err: any) {
      alert("Error al importar el archivo Excel: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <>
      <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {/* Header Area */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800 }}>Exportar Datos</h2>
            <p style={{ color: t.textSub, fontSize: 14, marginTop: 4 }}>
              Descarga tus inventarios en formatos compatibles para tus sistemas externos.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <input type="file" accept=".xlsx,.csv" style={{ display: 'none' }} ref={fileInputRef} onChange={handleUploadExcel} />
            <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <span style={{ marginRight: 6 }}>📊</span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{uploading ? "Importando..." : "Importar Excel"}</span>
            </button>
            <div style={{ display: "flex", gap: 8, background: t.bg2, padding: 4, borderRadius: "var(--radius-md)", border: `1px solid ${t.border}` }}>
              {[
                { id: "all", label: "Todas" },
                { id: "db", label: "Bases de Datos" },
                { id: "erp", label: "ERPs" },
                { id: "api", label: "E-Commerce" },
              ].map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)} style={{
                  padding: "6px 14px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer",
                  background: filter === f.id ? t.accentBg : "transparent",
                  color: filter === f.id ? t.accent : t.textSub,
                  fontSize: 13, fontWeight: 600, transition: "all 0.2s"
                }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
          {filtered.map(item => {
            return (
              <div key={item.id} className="card glass hover-card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: item.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
                    {item.icon}
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: t.text, fontFamily: 'Outfit' }}>{item.name}</h3>
                  <p style={{ fontSize: 13, color: t.textSub, marginTop: 4, lineHeight: 1.5 }}>{item.desc}</p>
                </div>

                <div style={{ marginTop: "auto", paddingTop: 16 }}>
                  <button className="btn" style={{ width: "100%", background: t.accent, color: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={() => handleDownload(item.id)} disabled={downloadingId === item.id}>
                    {downloadingId === item.id ? "Descargando..." : (item.id === "excel" ? "Descargar Excel" : `Exportar ${item.name}`)}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}