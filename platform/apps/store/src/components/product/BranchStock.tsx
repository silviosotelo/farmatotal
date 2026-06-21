"use client";

import { useEffect, useState } from "react";
import { useSucursal } from "@/components/sucursal/SucursalContext";
import { useFlags } from "@/components/providers/FeatureFlagsContext";
import { LocationIcon } from "@/components/icons";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type InvRow = { branchId: string; branchName: string; branchCode: string; stock: number; reserved: number };

/**
 * Stock del producto en la sucursal elegida (#74). La sucursal del store YA es
 * una branch del backend (selected.id = branchCode), así que el match es directo
 * contra el inventario real.
 */
export function BranchStock({ productId }: { productId: string }) {
  const { selected } = useSucursal();
  const flags = useFlags();
  const [rows, setRows] = useState<InvRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`${API}/inventory/product/${productId}`)
      .then((r) => r.json())
      .then((d) => alive && setRows((d.data as InvRow[]) || []))
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, [productId]);

  // Sin sucursal (incluye branches=false → selected siempre null) o con inventario
  // oculto (inventory=false) no se muestra disponibilidad por sucursal.
  if (!selected || !flags.inventory) return null;

  // match directo: la sucursal elegida es una branch del backend (id = code).
  const match: InvRow | undefined =
    rows?.find((r) => r.branchCode === selected.id || r.branchId === selected.id);

  const loading = rows === null;
  const available = match ? Math.max(0, match.stock - match.reserved) : null;

  return (
    <div className="mt-1 rounded-lg border border-[#ededf1] bg-search-bg/60 px-3 py-2 text-sm">
      <div className="flex items-center gap-2 text-brand-muted">
        <LocationIcon className="size-4 text-brand-orange" />
        <span>
          Tu tienda: <span className="font-medium text-brand-text">{selected.name}</span>
        </span>
      </div>
      <div className="mt-1">
        {loading ? (
          <span className="text-brand-muted">Consultando disponibilidad…</span>
        ) : available === null ? (
          <span className="text-brand-muted">Disponibilidad: consultá en esta sucursal.</span>
        ) : available > 0 ? (
          <span className="font-medium text-[#1e8e3e]">
            Disponible en {selected.name} · {available} {available === 1 ? "unidad" : "unidades"}
          </span>
        ) : (
          <span className="font-medium text-[#c0392b]">Sin stock en {selected.name}</span>
        )}
      </div>
    </div>
  );
}
