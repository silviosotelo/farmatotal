"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSucursal } from "@/components/sucursal/SucursalContext";
import { useFlags } from "@/components/providers/FeatureFlagsContext";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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
  return norm(s)
    .split(" ")
    .filter((t) => t.length > 3);
}

type BranchRow = {
  code?: string;
  branchCode?: string;
  name?: string;
  branchName?: string;
};

interface CatalogStockCtx {
  stockBySku: Record<string, number>;
  branchName: string | null;
  ready: boolean;
}

const Ctx = createContext<CatalogStockCtx>({
  stockBySku: {},
  branchName: null,
  ready: false,
});

/**
 * Provider de stock por sucursal para la grilla del catálogo/categoría (#91).
 * Hace UN solo fetch por página: resuelve la branch del backend que corresponde
 * a la sucursal elegida (overlap de tokens) y luego pide el stock batch de todos
 * los SKUs visibles en una sola llamada. Sin sucursal elegida → contexto vacío.
 */
export function CatalogStockProvider({
  skus,
  children,
}: {
  skus: string[];
  children: ReactNode;
}) {
  const { selected } = useSucursal();
  const [stockBySku, setStockBySku] = useState<Record<string, number>>({});
  const [branchName, setBranchName] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const skusKey = skus.join(",");

  useEffect(() => {
    if (!selected) {
      setStockBySku({});
      setBranchName(null);
      setReady(false);
      return;
    }
    let alive = true;
    setReady(false);

    (async () => {
      try {
        // La sucursal elegida YA es una branch del backend (selected.id = code).
        const matchCode = selected.id;
        const matchName = selected.name;

        // Stock batch de todos los SKUs en UNA sola llamada.
        const list = skus.filter(Boolean);
        let map: Record<string, number> = {};
        if (list.length) {
          const sres = await fetch(
            `${API}/inventory/stock-by-branch?branch=${encodeURIComponent(
              matchCode,
            )}&skus=${encodeURIComponent(list.join(","))}`,
          );
          const sjson = await sres.json();
          map = (sjson?.stock as Record<string, number>) || {};
        }

        if (alive) {
          setStockBySku(map);
          setBranchName(matchName);
          setReady(true);
        }
      } catch {
        // fetch falló → "unknown", sin badges (no inventar valores).
        if (alive) {
          setStockBySku({});
          setBranchName(null);
          setReady(true);
        }
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, skusKey]);

  const value = useMemo<CatalogStockCtx>(
    () => ({ stockBySku, branchName, ready }),
    [stockBySku, branchName, ready],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCatalogStock(): CatalogStockCtx {
  return useContext(Ctx);
}

/**
 * Badge compacto de disponibilidad por sucursal. Sin sucursal → null.
 * Estilo neutral (verde = hay stock, gris = sin stock) para encajar en cualquier
 * tema. White-label: usa branchName del contexto, nunca un nombre hardcodeado.
 */
export function StockBadge({ sku }: { sku: string }) {
  const { stockBySku, branchName } = useCatalogStock();
  const flags = useFlags();

  // Inventario oculto (inventory=false) → no se muestra badge de stock.
  if (!flags.inventory) return null;
  // Sin sucursal elegida (o branch no mapeable) → no afirmamos nada.
  if (!branchName) return null;

  const value = sku ? stockBySku[sku] : undefined;
  const inStock = typeof value === "number" && value > 0;

  if (inStock) {
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
        <span className="size-1.5 rounded-full bg-green-600" aria-hidden />
        Disponible · {value}
      </span>
    );
  }

  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
      <span className="size-1.5 rounded-full bg-gray-400" aria-hidden />
      Sin stock en sucursal
    </span>
  );
}
