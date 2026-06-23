"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchSucursales, zonasOf, nearestSucursal, type Sucursal } from "@/lib/sucursales";
import { useFlags } from "@/components/providers/FeatureFlagsContext";

const STORAGE_KEY = "ft_sucursal";

interface SucursalCtx {
  selected: Sucursal | null;
  isOpen: boolean;
  /** true cuando todavía no hay sucursal elegida → el modal es obligatorio (sin cierre). */
  mandatory: boolean;
  /** Lista de sucursales (del backend /branches). */
  sucursales: Sucursal[];
  zonas: string[];
  open: () => void;
  close: () => void;
  select: (s: Sucursal) => void;
  nearest: (lat: number, lng: number) => Sucursal | null;
}

const Ctx = createContext<SucursalCtx | null>(null);

export function SucursalProvider({ children }: { children: ReactNode }) {
  const flags = useFlags();
  const [selected, setSelected] = useState<Sucursal | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);

  // Trae las sucursales del backend y resuelve la guardada en localStorage.
  // Si no hay sucursal elegida, abre el modal obligatorio (como Farmatotal).
  // Tenant sin sucursales (branches=false): no fetch, no restore, no auto-open →
  // selected queda null y toda la UI branch-scoped (BranchStock, StockBadge,
  // retiro en checkout) colapsa por su rama de "sin sucursal".
  useEffect(() => {
    if (!flags.branches) return;
    let cancelled = false;
    fetchSucursales().then((list) => {
      if (cancelled) return;
      setSucursales(list);
      let storedId: string | null = null;
      try {
        storedId = localStorage.getItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      const found = storedId ? list.find((s) => s.id === storedId) : undefined;
      // En /sucursales NO auto-abrimos el modal: esa página ES el selector (mapa +
      // filtros), el modal lo taparía. En /pago tampoco: ahí carga el vPOS de Bancard
      // (y /pago/retorno) y el modal lo taparía. En el resto, modal obligatorio.
      const noModalPath =
        typeof window !== "undefined" && /^\/(sucursales|pago)(\/|$)/.test(window.location.pathname);
      if (found) setSelected(found);
      else if (!noModalPath) setIsOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [flags.branches]);

  const open = useCallback(() => setIsOpen(true), []);
  // close NO cierra si todavía no hay sucursal elegida (modal obligatorio).
  const close = useCallback(() => {
    setSelected((cur) => {
      if (cur) setIsOpen(false);
      return cur;
    });
  }, []);
  const select = useCallback((s: Sucursal) => {
    setSelected(s);
    try {
      localStorage.setItem(STORAGE_KEY, s.id);
    } catch {
      /* ignore */
    }
    setIsOpen(false);
  }, []);

  const zonas = useMemo(() => zonasOf(sucursales), [sucursales]);
  const nearest = useCallback((lat: number, lng: number) => nearestSucursal(sucursales, lat, lng), [sucursales]);

  const value = useMemo(
    () => ({ selected, isOpen, mandatory: !selected, sucursales, zonas, open, close, select, nearest }),
    [selected, isOpen, sucursales, zonas, open, close, select, nearest],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSucursal(): SucursalCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSucursal must be used within SucursalProvider");
  return ctx;
}
