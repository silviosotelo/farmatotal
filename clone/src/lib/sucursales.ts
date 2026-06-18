// Sucursales = datos REALES del backend (GET /branches). Sin datos hardcodeados.
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface Sucursal {
  id: string; // = branch.code (estable, ej. "asl_75"); usado para stock por sucursal
  branchId: string; // = branch.id (UUID del backend); usado para checkout/orders
  name: string;
  address: string;
  zona: string; // = branch.city (agrupador para filtros del modal)
  lat: number;
  lng: number;
  phone?: string;
  erpCode?: string;
  pickup?: boolean;
  delivery?: boolean;
}

type BranchApi = {
  id: string;
  code?: string;
  erpCode?: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  lat?: number | string;
  lng?: number | string;
  pickupEnabled?: boolean;
  deliveryEnabled?: boolean;
  active?: boolean;
};

function adapt(b: BranchApi): Sucursal {
  return {
    id: b.code || b.id,
    branchId: b.id,
    name: b.name,
    address: b.address || "",
    zona: b.city || "Otras",
    lat: Number(b.lat) || 0,
    lng: Number(b.lng) || 0,
    phone: b.phone,
    erpCode: b.erpCode,
    pickup: b.pickupEnabled,
    delivery: b.deliveryEnabled,
  };
}

/** Trae las sucursales activas del backend. */
export async function fetchSucursales(): Promise<Sucursal[]> {
  try {
    const r = await fetch(`${API}/branches?perPage=500`);
    const d = await r.json();
    return ((d.data as BranchApi[]) || [])
      .filter((b) => b.active !== false)
      .map(adapt)
      .sort((a, b) => a.zona.localeCompare(b.zona) || a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

/** Zonas únicas (ciudades) en orden alfabético. */
export function zonasOf(list: Sucursal[]): string[] {
  return [...new Set(list.map((s) => s.zona))].sort();
}

/** Distancia haversine en km entre dos puntos. */
export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/** Sucursal más cercana a una posición dada, dentro de la lista provista. */
export function nearestSucursal(list: Sucursal[], lat: number, lng: number): Sucursal | null {
  const withCoords = list.filter((s) => s.lat && s.lng);
  if (withCoords.length === 0) return null;
  return withCoords.reduce((best, s) =>
    haversineKm(lat, lng, s.lat, s.lng) < haversineKm(lat, lng, best.lat, best.lng) ? s : best,
  );
}
