"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@platform/ui";
import { useCart } from "@/components/providers/CartContext";
import { useMoney } from "@/components/providers/CurrencyContext";
import { decQty, formatQty, stepQty, unitLabel } from "@/lib/units";
import { useTheme, themeAccentVars } from "@/themes/ThemeProvider";

export function MiniCart() {
  const money = useMoney();
  const { isOpen, closeCart, lines, subtotal, count, setQty, removeItem } = useCart();
  const theme = useTheme();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeCart();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, closeCart]);

  return (
    <>
      <div
        className={
          "fixed inset-0 z-[1500] bg-black/40 transition-opacity duration-300 " +
          (isOpen ? "opacity-100" : "pointer-events-none opacity-0")
        }
        onClick={closeCart}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
        style={themeAccentVars(theme)}
        className={
          "fixed right-0 top-0 z-[1600] flex h-full w-[min(92vw,400px)] flex-col bg-white shadow-2xl transition-transform duration-300 " +
          (isOpen ? "translate-x-0" : "translate-x-full")
        }
      >
        <div className="brand-gradient flex items-center justify-between px-5 py-4 text-white">
          <h2 className="font-heading text-base font-bold">Tu carrito ({formatQty(count)})</h2>
          <Button
            type="button"
            variant="plain"
            shape="circle"
            onClick={closeCart}
            aria-label="Cerrar carrito"
            className="text-2xl leading-none text-white hover:bg-white/20"
          >
            ×
          </Button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex size-24 items-center justify-center rounded-full bg-search-bg text-3xl">🛒</div>
            <p className="text-brand-muted">Tu carrito está vacío.</p>
            <Button
              variant="solid"
              shape="round"
              onClick={closeCart}
              className="brand-gradient px-6 py-2.5 text-sm font-semibold"
            >
              Seguir comprando
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-[#ededf1] overflow-y-auto">
              {lines.map((l) => (
                <li key={l.product.id} className="flex gap-3 p-4">
                  <div className="relative size-16 shrink-0 rounded-md border border-[#ededf1]">
                    {l.product.image ? (
                      <Image src={l.product.image} alt={l.product.title} fill sizes="64px" className="object-contain p-1" />
                    ) : (
                      <div aria-hidden className="flex h-full w-full items-center justify-center text-[10px] text-brand-muted">
                        Sin imagen
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <Link href={`/productos/${l.product.slug}/`} onClick={closeCart} className="line-clamp-2 text-sm font-medium text-brand-text hover:text-brand-orange">
                      {l.product.title}
                    </Link>
                    <span className="font-price mt-1 text-sm font-bold text-brand-orange">{money(l.product.priceWeb)}</span>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex items-center rounded border border-[#ededf1] text-sm">
                        <Button
                          variant="plain"
                          size="md"
                          onClick={() => setQty(l.product.id, decQty(l.quantity, l.product.unitStep ?? 1))}
                          aria-label="Restar"
                          className="px-2 leading-none"
                        >
                          −
                        </Button>
                        <span className="min-w-7 whitespace-nowrap px-1 text-center tabular-nums">
                          {formatQty(l.quantity)} {unitLabel(l.product)}
                        </span>
                        <Button
                          variant="plain"
                          size="md"
                          onClick={() => setQty(l.product.id, stepQty(l.quantity, l.product.unitStep ?? 1, 1))}
                          aria-label="Sumar"
                          className="px-2 leading-none"
                        >
                          +
                        </Button>
                      </div>
                      <Button
                        variant="plain"
                        size="md"
                        onClick={() => removeItem(l.product.id)}
                        className="text-xs text-brand-muted hover:text-[#c0392b]"
                      >
                        Quitar
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-[#ededf1] p-4">
              <div className="mb-3 flex items-center justify-between font-price text-base">
                <span className="text-brand-muted">Subtotal</span>
                <span className="font-bold text-brand-text">{money(subtotal)}</span>
              </div>
              <div className="flex gap-2">
                <Link href="/carrito" onClick={closeCart} className="focus-ring flex-1 rounded-[30px] border border-brand-orange py-2.5 text-center text-sm font-semibold text-brand-orange-ink">
                  Ver carrito
                </Link>
                <Link href="/caja" onClick={closeCart} className="brand-gradient focus-ring flex-1 rounded-[30px] py-2.5 text-center text-sm font-semibold text-white">
                  Finalizar compra
                </Link>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
