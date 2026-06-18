"use client";

import { useEffect, useState } from "react";
import { useSucursal } from "@/components/sucursal/SucursalContext";
import { LocationIcon } from "@/components/icons";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type InvRow = { branchId: string; branchName: string; branchCode: string; stock: number; reserved: number };

/** normaliza para matchear sucursal del clone ↔ branch del backend. */
function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
function tokens(s: string): string[] {
  return norm(s).split(" ").filter((t) => t.length > 3);
}

/**
 * Stock del producto en la sucursal elegida (#74). Mapea la sucursal del store
 * (lista estática con dirección) a la branch del backend por solapamiento de
 * tokens del nombre/dirección, y muestra el stock del inventario real.
 */
export function BranchStock({ productId }: { productId: string }) {
  const { selected, open } = useSucursal();
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

  if (!selected) return null;

  // match sucursal ↔ branch por overlap de tokens (nombre + dirección)
  let match: InvRow | undefined;
  if (rows && rows.length) {
    const want = new Set([...tokens(selected.name), ...tokens(selected.address)]);
    let best = 0;
    for (const row of rows) {
      const have = tokens(row.branchName);
      const score = have.reduce((n, t) => n + (want.has(t) ? 1 : 0), 0);
      if (score > best) {
        best = score;
        match = row;
      }
    }
    if (best < 2) match = undefined; // overlap insuficiente → no afirmar stock
  }

  const loading = rows === null;
  const available = match ? Math.max(0, match.stock - match.reserved) : null;

  return (
    <div className="mt-1 rounded-lg border border-[#ededf1] bg-search-bg/60 px-3 py-2 text-sm">
      <div className="flex items-center gap-2 text-brand-muted">
        <LocationIcon className="size-4 text-brand-orange" />
        <span>
          Tu tienda:{" "}
          <button type="button" onClick={open} className="font-medium text-brand-text underline-offset-2 hover:underline">
            {selected.name}
          </button>
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
