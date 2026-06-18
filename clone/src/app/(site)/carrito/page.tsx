"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useCart } from "@/components/providers/CartContext";
import { useToast } from "@/components/providers/ToastContext";
import { formatGs } from "@/lib/data";
import { useTheme } from "@/themes/ThemeProvider";
import { EkomartCart } from "@/themes/ekomart/pages/EkomartCart";
import { AnvogueCart } from "@/themes/anvogue/pages/AnvogueCart";

export default function CarritoPage() {
  const theme = useTheme();
  const { lines, subtotal, coupon, discount, total, setQty, removeItem, clear, applyCoupon, removeCoupon } = useCart();
  const { toast } = useToast();
  const [couponInput, setCouponInput] = useState("");

  // Carrito tematizado por tema activo (farmatotal = base inline más abajo).
  if (theme === "ekomart") return <EkomartCart />;
  if (theme === "anvogue") return <AnvogueCart />;

  /* ── Empty state ── */
  if (lines.length === 0) {
    return (
      <main className="flex-1">
        <div className="ft-container py-20 flex flex-col items-center gap-6">
          <div className="size-44 bg-[#f3f4f7] rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80" fill="none" aria-hidden="true">
              <rect x="14" y="28" width="52" height="40" rx="5" fill="#e74c3c" />
              <path d="M28 28 C28 16 52 16 52 28" stroke="#c0392b" strokeWidth="4" strokeLinecap="round" fill="none" />
              <path d="M30 52 C30 62 50 62 50 52" stroke="white" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            </svg>
          </div>

          <div className="w-full max-w-md border-t border-b border-[#ededf1] py-5 text-center">
            <p className="font-bold text-[#c0392b] tracking-widest uppercase text-sm">
              TU CARRITO ESTÁ VACÍO.
            </p>
          </div>

          <Link
            href="/catalogo"
            className="brand-gradient focus-ring text-white rounded-[30px] h-[44px] px-6 text-sm font-semibold flex items-center justify-center"
          >
            Volver a la tienda
          </Link>
        </div>
      </main>
    );
  }

  /* ── Coupon handler ── */
  function handleApplyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    const result = applyCoupon(code);
    toast(result.message, result.ok ? "success" : "error");
    if (result.ok) setCouponInput("");
  }

  /* ── Filled cart ── */
  return (
    <main className="flex-1">
      <Breadcrumbs items={[{ label: "Carrito" }]} />

      <div className="ft-container py-8">
        <h1 className="font-heading text-2xl text-brand-text mb-6">Carrito</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── Item list ── */}
          <div className="flex-1 min-w-0">
            {/* Desktop header */}
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
                    {/* Product */}
                    <div className="flex items-center gap-4">
                      <div className="relative size-20 flex-none border border-[#ededf1] rounded-lg overflow-hidden bg-white">
                        <Image
                          src={product.image}
                          alt={product.title}
                          fill
                          sizes="80px"
                          className="object-contain p-1"
                        />
                      </div>
                      <Link
                        href={`/productos/${product.slug}/`}
                        className="text-sm text-brand-text hover:text-brand-orange transition-colors line-clamp-2 font-medium"
                      >
                        {product.title}
                      </Link>
                    </div>

                    {/* Price */}
                    <p className="font-price text-sm text-brand-orange text-right">
                      {formatGs(product.priceWeb)}
                    </p>

                    {/* Stepper */}
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setQty(product.id, quantity - 1)}
                        className="size-8 rounded-full border border-[#ededf1] bg-search-bg flex items-center justify-center text-brand-text hover:border-brand-orange transition-colors text-base leading-none"
                        aria-label="Disminuir cantidad"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-brand-text">
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQty(product.id, quantity + 1)}
                        className="size-8 rounded-full border border-[#ededf1] bg-search-bg flex items-center justify-center text-brand-text hover:border-brand-orange transition-colors text-base leading-none"
                        aria-label="Aumentar cantidad"
                      >
                        +
                      </button>
                    </div>

                    {/* Line subtotal */}
                    <p className="font-price text-sm font-semibold text-brand-text text-right">
                      {formatGs(product.priceWeb * quantity)}
                    </p>

                    {/* Remove */}
                    <button
                      onClick={() => removeItem(product.id)}
                      className="text-brand-muted hover:text-[#c0392b] transition-colors p-1"
                      aria-label={`Quitar ${product.title}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                      </svg>
                    </button>
                  </div>

                  {/* Mobile card */}
                  <div className="lg:hidden flex gap-4">
                    <div className="relative size-20 flex-none border border-[#ededf1] rounded-lg overflow-hidden bg-white">
                      <Image
                        src={product.image}
                        alt={product.title}
                        fill
                        sizes="80px"
                        className="object-contain p-1"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/productos/${product.slug}/`}
                        className="text-sm text-brand-text hover:text-brand-orange transition-colors line-clamp-2 font-medium"
                      >
                        {product.title}
                      </Link>
                      <p className="font-price text-sm text-brand-orange mt-1">
                        {formatGs(product.priceWeb)}
                      </p>

                      <div className="flex items-center gap-3 mt-2">
                        {/* Stepper */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setQty(product.id, quantity - 1)}
                            className="size-7 rounded-full border border-[#ededf1] bg-search-bg flex items-center justify-center text-brand-text hover:border-brand-orange transition-colors text-sm"
                            aria-label="Disminuir cantidad"
                          >
                            −
                          </button>
                          <span className="w-7 text-center text-sm font-semibold text-brand-text">
                            {quantity}
                          </span>
                          <button
                            onClick={() => setQty(product.id, quantity + 1)}
                            className="size-7 rounded-full border border-[#ededf1] bg-search-bg flex items-center justify-center text-brand-text hover:border-brand-orange transition-colors text-sm"
                            aria-label="Aumentar cantidad"
                          >
                            +
                          </button>
                        </div>

                        <p className="font-price text-sm font-semibold text-brand-text">
                          {formatGs(product.priceWeb * quantity)}
                        </p>

                        <button
                          onClick={() => removeItem(product.id)}
                          className="ml-auto text-brand-muted hover:text-[#c0392b] transition-colors"
                          aria-label={`Quitar ${product.title}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Coupon box */}
            <div className="mt-6 pt-6 border-t border-[#ededf1]">
              <p className="text-sm font-semibold text-brand-text mb-3">Cupón de descuento</p>

              {coupon ? (
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#fff4ec] border border-brand-orange px-4 py-1.5 text-sm font-semibold text-brand-orange">
                    {coupon.code}
                  </span>
                  <button
                    onClick={removeCoupon}
                    className="text-xs text-brand-muted hover:text-[#c0392b] transition-colors underline"
                  >
                    Quitar
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                    placeholder="Ingresá tu código"
                    className="flex-1 h-[44px] rounded-[8px] border border-[#ededf1] bg-search-bg px-4 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition-colors"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    className="brand-gradient focus-ring text-white rounded-[30px] h-[44px] px-6 text-sm font-semibold whitespace-nowrap"
                  >
                    Aplicar cupón
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Order summary ── */}
          <aside className="lg:w-80 flex-none">
            <div className="border border-[#ededf1] rounded-xl p-6 bg-white sticky top-24">
              <h2 className="font-heading text-lg text-brand-text mb-5">Total del carrito</h2>

              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-brand-muted">Subtotal</dt>
                  <dd className="font-price text-brand-text">{formatGs(subtotal)}</dd>
                </div>

                {coupon && (
                  <div className="flex justify-between text-[#c0392b]">
                    <dt>Descuento ({coupon.code})</dt>
                    <dd className="font-price">−{formatGs(discount)}</dd>
                  </div>
                )}

                <div className="pt-3 border-t border-[#ededf1] flex justify-between items-baseline">
                  <dt className="font-semibold text-brand-text text-base">Total</dt>
                  <dd className="font-price text-brand-orange text-xl font-bold">{formatGs(total)}</dd>
                </div>
              </dl>

              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href="/caja"
                  className="brand-gradient focus-ring text-white rounded-[30px] h-[44px] px-6 text-sm font-semibold flex items-center justify-center"
                >
                  Finalizar compra
                </Link>
                <Link
                  href="/catalogo"
                  className="focus-ring text-brand-text border border-[#ededf1] rounded-[30px] h-[44px] px-6 text-sm font-semibold flex items-center justify-center hover:border-brand-orange hover:text-brand-orange transition-colors"
                >
                  Seguir comprando
                </Link>
                <button
                  onClick={clear}
                  className="text-xs text-brand-muted hover:text-[#c0392b] transition-colors underline text-center mt-1"
                >
                  Vaciar carrito
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
