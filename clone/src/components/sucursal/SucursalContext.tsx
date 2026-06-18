"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { SUCURSALES, type Sucursal } from "@/lib/sucursales";

const STORAGE_KEY = "ft_sucursal";

interface SucursalCtx {
  selected: Sucursal | null;
  isOpen: boolean;
  /** true cuando todavía no hay sucursal elegida → el modal es obligatorio (sin cierre). */
  mandatory: boolean;
  open: () => void;
  close: () => void;
  select: (s: Sucursal) => void;
}

const Ctx = createContext<SucursalCtx | null>(null);

export function SucursalProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Sucursal | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // hydrate from localStorage on mount; si no hay sucursal guardada, abrir el
  // modal de forma obligatoria (la tienda exige elegir tienda como en Farmatotal).
  useEffect(() => {
    try {
      const id = localStorage.getItem(STORAGE_KEY);
      const found = id ? SUCURSALES.find((s) => s.id === id) : undefined;
      if (found) {
        setSelected(found);
      } else {
        setIsOpen(true);
      }
    } catch {
      setIsOpen(true);
    }
  }, []);

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

  const value = useMemo(
    () => ({ selected, isOpen, mandatory: !selected, open, close, select }),
    [selected, isOpen, open, close, select],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSucursal(): SucursalCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSucursal must be used within SucursalProvider");
  return ctx;
}
