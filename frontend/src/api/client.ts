// frontend/src/api/client.ts
const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/v1";

function getToken() {
  return localStorage.getItem("token") || "";
}

// 🚧 DEV MODE: si el token es el falso, devolver datos mock sin llamar al backend
const DEV_TOKEN = "dev-token-bypass";
function isDevMode() { return getToken() === DEV_TOKEN; }

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401 && !isDevMode()) { localStorage.removeItem("token"); window.location.href = "/"; }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `Error ${res.status}` }));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Tipos ──────────────────────────────────────────────────────────────────────
export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  cost_price: number;
  sale_price: number;
  min_stock: number;
  max_stock: number;
  reorder_point: number;
  is_active: boolean;
  company_id: string;
  created_at: string;
  current_stock: number;
  image_url?: string;    // stock actual desde tabla Inventory
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  company_id: string;
  is_active: boolean;
  created_at?: string;
}

export interface Alert {
  product_id: string;
  product_name: string;
  sku: string;
  type: string;
  severity: string;
  message: string;
  current_stock: number;
  threshold: number;
}

export interface Movement {
  id: string;
  product_id: string;
  type: string;
  quantity: number;
  previous_stock?: number;
  posterior_stock?: number;
  reason?: string;
  reference?: string;
  date: string;
}

export interface MovementCreate {
  product_id: string;
  type: "entrada" | "salida" | "ajuste" | "traslado";
  quantity: number;
  reason: string | null;
  reference: string | null;
  unit_price: number | null;
  date: string | null;
}

// ── Auth ───────────────────────────────────────────────────────────────────────
export const getMe = () => apiFetch<UserProfile>("/auth/me");

// ── Productos ──────────────────────────────────────────────────────────────────
export const getProducts = () => apiFetch<Product[]>("/inventory/products");
export const createProduct = (data: Partial<Product>) => apiFetch<Product>("/inventory/products", { method: "POST", body: JSON.stringify(data) });
export const updateProduct = (id: string, data: Partial<Product>) => apiFetch<Product>(`/inventory/products/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteProduct = (id: string) => apiFetch<void>(`/inventory/products/${id}`, { method: "DELETE" });

// ── Movimientos ────────────────────────────────────────────────────────────────
export const getMovements = () => apiFetch<Movement[]>("/inventory/movements");
export const createMovement = (data: MovementCreate) => apiFetch<Movement>("/inventory/movements", { method: "POST", body: JSON.stringify(data) });
export const clearMovements = () => apiFetch<void>("/inventory/movements", { method: "DELETE" });

// ── Alertas ────────────────────────────────────────────────────────────────────
export const getAlerts = () => apiFetch<Alert[]>("/alerts");