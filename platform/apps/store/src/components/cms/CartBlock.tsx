"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Input, Button } from "@platform/ui";
import { useCart } from "@/components/providers/CartContext";
import { useToast } from "@/components/providers/ToastContext";
import { useMoney } from "@/components/providers/CurrencyContext";
import { decQty, formatQty, stepQty, unitLabel } from "@/lib/units";

/**
 * Bloque funcional "Carrito" del builder (estilo widget de carrito de Woo en
 * Elementor): toda la lógica real (useCart, cupón, cantidades) embebida; se
 * coloca/posiciona desde el builder. Markup farmatotal pixel-perfect.
 */
export function CartBlock({ showCoupon = true }: { showCoupon?: boolean } = {}) {
  const money = useMoney();
  const { lines, subtotal, coupon, discount, total, setQty, removeItem, clear, applyCoupon, removeCoupon } = useCart();
  const { toast } = useToast();
  const [couponInput, setCouponInput] = useState("");

  if (lines.length === 0) {
    return (
      <div className="ft-container py-20 flex flex-col items-center gap-6">
        <div className="size-44 bg-[#f3f4f7] rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80" fill="none" aria-hidden="true">
            <rect x="14" y="28" width="52" height="40" rx="5" fill="#e74c3c" />
            <path d="M28 28 C28 16 52 16 52 28" stroke="#c0392b" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M30 52 C30 62 50 62 50 52" stroke="white" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          </svg>
        </div>
        <div className="w-full max-w-md border-t border-b border-[#ededf1] py-5 text-center">
          <p className="font-bold text-[#c0392b] tracking-widest uppercase text-sm">TU CARRITO ESTÁ VACÍO.</p>
        </div>
        <Link href="/catalogo" className="brand-gradient focus-ring text-white rounded-[30px] h-[44px] px-6 text-sm font-semibold flex items-center justify-center">
          Volver a la tienda
        </Link>
      </div>
    );
  }

  async function handleApplyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    const result = await applyCoupon(code);
    toast(result.message, result.ok ? "success" : "error");
    if (result.ok) setCouponInput("");
  }

  return (
    <div className="ft-container py-8">
      <h2 className="font-heading text-2xl text-brand-text mb-6">Carrito</h2>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 min-w-0">
          <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 pb-3 border-b border-[#ededf1] text-xs font-semibold text-brand-muted uppercase tracking-wider">
            <span>Producto</span>
            <span className="text-right">Precio</span>
            <span className="text-center">Cantidad</span>
            <span className="text-right">Subtotal</span>
            <span />
          </div>

          <ul className="divide-y divide-[#ededf1]">
            {lines.map(({ product, quantity }) => (
              <li key={product.id} className="py-5">
                {/* Desktop row */}
                <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center">
                  <div className="flex items-center gap-4">
                    <div className="relative size-20 flex-none border border-[#ededf1] rounded-lg overflow-hidden bg-white">
                      <Image src={product.image} alt={product.title} fill sizes="80px" className="object-contain p-1" />
                    </div>
                    <Link href={`/productos/${product.slug}/`} className="text-sm text-brand-text hover:text-brand-orange transition-colors line-clamp-2 font-medium">
                      {product.title}
                    </Link>
                  </div>
                  <p className="font-price text-sm text-brand-orange text-right">{money(product.priceWeb)}</p>
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      shape="circle"
                      size="md"
                      variant="default"
                      onClick={() => setQty(product.id, decQty(quantity, product.unitStep ?? 1))}
                      aria-label="Disminuir cantidad"
                    >
                      −
                    </Button>
                    <span className="min-w-8 px-1 text-center text-sm font-semibold text-brand-text whitespace-nowrap">
                      {formatQty(quantity)} {unitLabel(product)}
                    </span>
                    <Button
                      shape="circle"
                      size="md"
                      variant="default"
                      onClick={() => setQty(product.id, stepQty(quantity, product.unitStep ?? 1, 1))}
                      aria-label="Aumentar cantidad"
                    >
                      +
                    </Button>
                  </div>
                  <p className="font-price text-sm font-semibold text-brand-text text-right">{money(product.priceWeb * quantity)}</p>
                  <Button
                    shape="circle"
                    size="md"
                    variant="plain"
                    className="text-brand-muted hover:text-[#c0392b]"
                    onClick={() => removeItem(product.id)}
                    aria-label={`Quitar ${product.title}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                  </Button>
                </div>

                {/* Mobile row */}
                <div className="lg:hidden flex gap-4">
                  <div className="relative size-20 flex-none border border-[#ededf1] rounded-lg overflow-hidden bg-white">
                    <Image src={product.image} alt={product.title} fill sizes="80px" className="object-contain p-1" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/productos/${product.slug}/`} className="text-sm text-brand-text hover:text-brand-orange transition-colors line-clamp-2 font-medium">
                      {product.title}
                    </Link>
                    <p className="font-price text-sm text-brand-orange mt-1">{money(product.priceWeb)}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1">
                        <Button
                          shape="circle"
                          size="md"
                          variant="default"
                          onClick={() => setQty(product.id, decQty(quantity, product.unitStep ?? 1))}
                          aria-label="Disminuir cantidad"
                        >
                          −
                        </Button>
                        <span className="min-w-7 px-1 text-center text-sm font-semibold text-brand-text whitespace-nowrap">
                          {formatQty(quantity)} {unitLabel(product)}
                        </span>
                        <Button
                          shape="circle"
                          size="md"
                          variant="default"
                          onClick={() => setQty(product.id, stepQty(quantity, product.unitStep ?? 1, 1))}
                          aria-label="Aumentar cantidad"
                        >
                          +
                        </Button>
                      </div>
                      <p className="font-price text-sm font-semibold text-brand-text">{money(product.priceWeb * quantity)}</p>
                      <Button
                        shape="circle"
                        size="md"
                        variant="plain"
                        className="ml-auto text-brand-muted hover:text-[#c0392b]"
                        onClick={() => removeItem(product.id)}
                        aria-label={`Quitar ${product.title}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {showCoupon && (
            <div className="mt-6 pt-6 border-t border-[#ededf1]">
              <p className="text-sm font-semibold text-brand-text mb-3">Cupón de descuento</p>
              {coupon ? (
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#fff4ec] border border-brand-orange px-4 py-1.5 text-sm font-semibold text-brand-orange">
                    {coupon.code}
                  </span>
                  <Button variant="plain" size="md" className="text-xs text-brand-muted hover:text-[#c0392b] underline" onClick={removeCoupon}>
                    Quitar
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                    placeholder="Ingresá tu código"
                    className="flex-1"
                  />
                  <Button
                    variant="solid"
                    shape="round"
                    className="h-[44px] px-6 text-sm font-semibold whitespace-nowrap"
                    onClick={handleApplyCoupon}
                  >
                    Aplicar cupón
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="lg:w-80 flex-none">
          <div className="border border-[#ededf1] rounded-xl p-6 bg-white sticky top-24">
            <h2 className="font-heading text-lg text-brand-text mb-5">Total del carrito</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-brand-muted">Subtotal</dt>
                <dd className="font-price text-brand-text">{money(subtotal)}</dd>
              </div>
              {coupon && (
                <div className="flex justify-between text-[#c0392b]">
                  <dt>Descuento ({coupon.code})</dt>
                  <dd className="font-price">−{money(discount)}</dd>
                </div>
              )}
              <div className="pt-3 border-t border-[#ededf1] flex justify-between items-baseline">
                <dt className="font-semibold text-brand-text text-base">Total</dt>
                <dd className="font-price text-brand-orange text-xl font-bold">{money(total)}</dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-col gap-3">
              <Link href="/caja" className="brand-gradient focus-ring text-white rounded-[30px] h-[44px] px-6 text-sm font-semibold flex items-center justify-center">
                Finalizar compra
              </Link>
              <Link href="/catalogo" className="focus-ring text-brand-text border border-[#ededf1] rounded-[30px] h-[44px] px-6 text-sm font-semibold flex items-center justify-center hover:border-brand-orange hover:text-brand-orange transition-colors">
                Seguir comprando
              </Link>
              <Button
                variant="plain"
                size="md"
                className="text-xs text-brand-muted hover:text-[#c0392b] underline text-center mt-1"
                onClick={clear}
              >
                Vaciar carrito
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
