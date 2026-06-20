"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CartLine, Coupon, Product } from "@/types";

const STORAGE = "ft_cart_v1";
const COUPON_STORAGE = "ft_cart_coupon_v1";

interface CartCtx {
  lines: CartLine[];
  count: number;
  subtotal: number;
  coupon: Coupon | null;
  discount: number;
  total: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  applyCoupon: (code: string) => Promise<{ ok: boolean; message: string }>;
  removeCoupon: () => void;
}

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // hydrate
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) setLines(JSON.parse(raw));
      const c = localStorage.getItem(COUPON_STORAGE);
      if (c) setCoupon(JSON.parse(c));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // persist
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (coupon) localStorage.setItem(COUPON_STORAGE, JSON.stringify(coupon));
      else localStorage.removeItem(COUPON_STORAGE);
    } catch {
      /* ignore */
    }
  }, [coupon, hydrated]);

  const addItem = useCallback((product: Product, qty = 1) => {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.product.id === product.id);
      if (i === -1) return [...prev, { product, quantity: qty }];
      const next = [...prev];
      next[i] = { ...next[i], quantity: next[i].quantity + qty };
      return next;
    });
    setIsOpen(true);
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.product.id !== productId)
        : prev.map((l) => (l.product.id === productId ? { ...l, quantity: qty } : l)),
    );
  }, []);

  const removeItem = useCallback(
    (productId: string) => setLines((prev) => prev.filter((l) => l.product.id !== productId)),
    [],
  );

  const clear = useCallback(() => {
    setLines([]);
    setCoupon(null);
  }, []);

  const applyCoupon = useCallback(
    async (code: string) => {
      const normalizedCode = code.toUpperCase().trim();
      if (!normalizedCode) return { ok: false, message: "Ingresá un código" };
      const sub = lines.reduce((s, l) => s + l.product.priceWeb * l.quantity, 0);
      try {
        const r = await fetch("/api/coupons/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: normalizedCode, subtotal: sub }),
        });
        const d = await r.json();
        if (!r.ok) return { ok: false, message: d.error || "Cupón inválido" };
        setCoupon({
          code: normalizedCode,
          percent: Number(d.percent) || 0,
          amount: Number(d.amount) || 0,
          description: d.description || "",
        });
        return { ok: true, message: `Cupón ${normalizedCode} aplicado` };
      } catch {
        return { ok: false, message: "No se pudo validar el cupón" };
      }
    },
    [lines],
  );

  const removeCoupon = useCallback(() => setCoupon(null), []);

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.product.priceWeb * l.quantity, 0), [lines]);
  const count = useMemo(() => lines.reduce((s, l) => s + l.quantity, 0), [lines]);
  const discount = useMemo(() => {
    if (!coupon) return 0;
    const d = coupon.percent > 0 ? Math.round((subtotal * coupon.percent) / 100) : coupon.amount || 0;
    return Math.min(d, subtotal);
  }, [subtotal, coupon]);
  const total = Math.max(0, subtotal - discount);

  const value = useMemo<CartCtx>(
    () => ({
      lines, count, subtotal, coupon, discount, total, isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem, setQty, removeItem, clear, applyCoupon, removeCoupon,
    }),
    [lines, count, subtotal, coupon, discount, total, isOpen, addItem, setQty, removeItem, clear, applyCoupon, removeCoupon],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
