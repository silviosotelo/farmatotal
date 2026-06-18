"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Product } from "@/types";
import { useAuth } from "./AuthContext";

const STORAGE = "ft_wishlist_v1";

interface WishlistCtx {
  items: Product[];
  count: number;
  has: (id: string) => boolean;
  toggle: (product: Product) => void;
  remove: (id: string) => void;
}

const Ctx = createContext<WishlistCtx | null>(null);

/**
 * Lista de deseos híbrida:
 *  - Invitado → persiste en localStorage (UX instantánea, sin login).
 *  - Con sesión → respaldada en el backend (tabla wishlist, por usuario). Al iniciar
 *    sesión se fusiona lo agregado como invitado con lo guardado en el servidor.
 */
export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const syncedFor = useRef<boolean | null>(null);

  // Hidratar desde localStorage (cache local / store de invitado).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // Persistir cache local en cada cambio.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, hydrated]);

  // Sincronizar con el backend al iniciar sesión (una vez por transición de login).
  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) {
      syncedFor.current = false;
      return;
    }
    if (syncedFor.current) return;
    syncedFor.current = true;

    (async () => {
      try {
        const res = await fetch("/api/wishlist");
        if (!res.ok) return;
        const data = (await res.json()) as { items: Product[] };
        const backend = data.items ?? [];
        const backendIds = new Set(backend.map((p) => p.id));

        // Empujar al servidor lo que el invitado había agregado y no existe aún.
        const localOnly = items.filter((p) => !backendIds.has(p.id));
        await Promise.all(
          localOnly.map((p) =>
            fetch("/api/wishlist", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ productId: p.id }),
            }).catch(() => {}),
          ),
        );

        // Estado canónico = backend ∪ lo recién subido.
        const merged = [...backend];
        for (const p of localOnly) merged.push(p);
        setItems(merged);
      } catch {
        /* mantener cache local si el backend falla */
      }
    })();
  }, [isLoggedIn, hydrated, items]);

  const has = useCallback((id: string) => items.some((p) => p.id === id), [items]);

  const toggle = useCallback(
    (product: Product) => {
      setItems((prev) => {
        const exists = prev.some((p) => p.id === product.id);
        if (isLoggedIn) {
          if (exists) {
            fetch(`/api/wishlist/${product.id}`, { method: "DELETE" }).catch(() => {});
          } else {
            fetch("/api/wishlist", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ productId: product.id }),
            }).catch(() => {});
          }
        }
        return exists ? prev.filter((p) => p.id !== product.id) : [...prev, product];
      });
    },
    [isLoggedIn],
  );

  const remove = useCallback(
    (id: string) => {
      if (isLoggedIn) fetch(`/api/wishlist/${id}`, { method: "DELETE" }).catch(() => {});
      setItems((prev) => prev.filter((p) => p.id !== id));
    },
    [isLoggedIn],
  );

  const value = useMemo<WishlistCtx>(
    () => ({ items, count: items.length, has, toggle, remove }),
    [items, has, toggle, remove],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWishlist(): WishlistCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
