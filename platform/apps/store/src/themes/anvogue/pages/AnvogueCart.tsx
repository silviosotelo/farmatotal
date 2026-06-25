"use client";

import Link from "next/link";
import { useState } from "react";
import { Input, Button } from "@platform/ui";
import { Minus, Plus, ShoppingBag, Tag, Trash2, X } from "lucide-react";
import { useCart } from "@/components/providers/CartContext";
import { useToast } from "@/components/providers/ToastContext";
import { useMoney } from "@/components/providers/CurrencyContext";
import { AnvogueBreadcrumb } from "../AnvogueBreadcrumb";
import {
  container,
  buttonMain,
  buttonMainFull,
  heading5,
  textButton,
  textButtonHover,
} from "../sections/anvogueClasses";

export function AnvogueCart() {
  const money = useMoney();
  const { lines, subtotal, coupon, discount, total, setQty, removeItem, clear, applyCoupon, removeCoupon } = useCart();
  const { toast } = useToast();
  const [couponInput, setCouponInput] = useState("");

  if (lines.length === 0) {
    return (
      <main className="flex-1">
        <div className="mx-auto max-w-[1322px] px-4 py-20">
          <div className="flex flex-col items-center gap-7 text-center">
            <div className="flex size-24 items-center justify-center rounded-full bg-[#F7F7F7]">
              <ShoppingBag size={36} className="text-[#1F1F1F]" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-orange)]">Tu carrito</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#1F1F1F] md:text-3xl">Tu carrito está vacío</h1>
              <p className="mt-2 text-sm text-[#696C70]">Descubrí nuestra colección y empezá a agregar productos.</p>
            </div>
            <Link href="/catalogo" className={buttonMain}>Volver a la tienda</Link>
          </div>
        </div>
      </main>
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
    <main className="flex-1">
      <AnvogueBreadcrumb heading="Carrito" />

      <div className={`${container} py-10 md:py-14`}>
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="min-w-0 flex-1">
            <div className={`hidden grid-cols-[2.5fr_1fr_1.2fr_1fr_auto] items-center gap-4 rounded-lg bg-[#F7F7F7] px-5 py-4 ${textButton} text-[#1F1F1F] lg:grid`}>
              <span>Producto</span>
              <span className="text-center">Precio</span>
              <span className="text-center">Cantidad</span>
              <span className="text-center">Subtotal</span>
              <span />
            </div>

            <ul className="divide-y divide-[#E9E9E9]">
              {lines.map(({ product, quantity }) => (
                <li key={product.id} className="py-6">
                  {/* Desktop */}
                  <div className="hidden grid-cols-[2.5fr_1fr_1.2fr_1fr_auto] items-center gap-4 lg:grid">
                    <div className="flex items-center gap-4">
                      <div className="size-24 flex-none overflow-hidden rounded-2xl bg-[#F7F7F7]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={product.image} alt={product.title} className="h-full w-full object-cover" />
                      </div>
                      <Link href={`/productos/${product.slug}/`} className="line-clamp-2 text-sm font-medium text-[#1F1F1F] transition-colors hover:text-[var(--brand-orange)]">
                        {product.title}
                      </Link>
                    </div>
                    <p className="text-center text-sm text-[#696C70]">{money(product.priceWeb)}</p>
                    <div className="flex items-center justify-center">
                      <div className="inline-flex items-center rounded-full border border-[#E9E9E9]">
                        <Button
                          type="button"
                          variant="plain"
                          onClick={() => setQty(product.id, quantity - 1)}
                          className="flex size-9 items-center justify-center rounded-full text-[#1F1F1F] transition-colors hover:text-[var(--brand-orange)]"
                          aria-label="Disminuir cantidad"
                        >
                          <Minus size={15} />
                        </Button>
                        <span className="w-8 text-center text-sm font-semibold text-[#1F1F1F]">{quantity}</span>
                        <Button
                          type="button"
                          variant="plain"
                          onClick={() => setQty(product.id, quantity + 1)}
                          className="flex size-9 items-center justify-center rounded-full text-[#1F1F1F] transition-colors hover:text-[var(--brand-orange)]"
                          aria-label="Aumentar cantidad"
                        >
                          <Plus size={15} />
                        </Button>
                      </div>
                    </div>
                    <p className="text-center text-sm font-semibold text-[#1F1F1F]">{money(product.priceWeb * quantity)}</p>
                    <Button
                      type="button"
                      variant="plain"
                      onClick={() => removeItem(product.id)}
                      className="flex size-9 items-center justify-center rounded-full text-[#696C70] transition-colors hover:bg-[#F7F7F7] hover:text-[var(--brand-orange)]"
                      aria-label={`Quitar ${product.title}`}
                    >
                      <X size={18} />
                    </Button>
                  </div>

                  {/* Mobile */}
                  <div className="flex gap-4 lg:hidden">
                    <div className="size-24 flex-none overflow-hidden rounded-2xl bg-[#F7F7F7]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={product.image} alt={product.title} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/productos/${product.slug}/`} className="line-clamp-2 text-sm font-medium text-[#1F1F1F] transition-colors hover:text-[var(--brand-orange)]">
                          {product.title}
                        </Link>
                        <Button
                          type="button"
                          variant="plain"
                          onClick={() => removeItem(product.id)}
                          className="-mr-1 flex size-8 flex-none items-center justify-center rounded-full text-[#696C70] transition-colors hover:text-[var(--brand-orange)]"
                          aria-label={`Quitar ${product.title}`}
                        >
                          <X size={18} />
                        </Button>
                      </div>
                      <p className="mt-1 text-sm text-[#696C70]">{money(product.priceWeb)}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-full border border-[#E9E9E9]">
                          <Button
                            type="button"
                            variant="plain"
                            onClick={() => setQty(product.id, quantity - 1)}
                            className="flex size-8 items-center justify-center rounded-full text-[#1F1F1F] transition-colors hover:text-[var(--brand-orange)]"
                            aria-label="Disminuir cantidad"
                          >
                            <Minus size={14} />
                          </Button>
                          <span className="w-7 text-center text-sm font-semibold text-[#1F1F1F]">{quantity}</span>
                          <Button
                            type="button"
                            variant="plain"
                            onClick={() => setQty(product.id, quantity + 1)}
                            className="flex size-8 items-center justify-center rounded-full text-[#1F1F1F] transition-colors hover:text-[var(--brand-orange)]"
                            aria-label="Aumentar cantidad"
                          >
                            <Plus size={14} />
                          </Button>
                        </div>
                        <p className="text-sm font-semibold text-[#1F1F1F]">{money(product.priceWeb * quantity)}</p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-center justify-end border-t border-[#E9E9E9] pt-6">
              <Button
                type="button"
                variant="plain"
                onClick={clear}
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#696C70] transition-colors hover:text-[var(--brand-orange)]"
              >
                <Trash2 size={15} />
                Vaciar carrito
              </Button>
            </div>
          </div>

          <aside className="flex-none lg:w-96">
            <div className="sticky top-24 rounded-2xl bg-[#F7F7F7] p-6 md:p-7">
              <h2 className={heading5}>Resumen del pedido</h2>

              <div className="mt-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#696C70]">Cupón de descuento</p>

                {coupon ? (
                  <div className="flex items-center justify-between rounded-2xl border border-[#1F1F1F] bg-white px-4 py-3">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#1F1F1F]">
                      <Tag size={15} className="text-[var(--brand-orange)]" />
                      {coupon.code}
                    </span>
                    <Button
                      type="button"
                      variant="plain"
                      onClick={removeCoupon}
                      className="text-xs font-semibold uppercase tracking-[0.08em] text-[#696C70] transition-colors hover:text-[var(--brand-orange)]"
                    >
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
                      className="h-11 min-w-0 flex-1 rounded-2xl border border-[#E9E9E9] bg-white px-4 text-sm text-[#1F1F1F] placeholder:text-[#696C70] focus:border-[#1F1F1F] focus:outline-none"
                    />
                    <Button
                      type="button"
                      variant="plain"
                      onClick={handleApplyCoupon}
                      className="h-11 flex-none rounded-2xl bg-[#1F1F1F] px-5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition-all duration-300 hover:bg-[#D2EF9A] hover:text-[#1F1F1F]"
                    >
                      Aplicar
                    </Button>
                  </div>
                )}
              </div>

              <dl className="mt-6 space-y-3 border-t border-[#E9E9E9] pt-6 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[#696C70]">Subtotal</dt>
                  <dd className="font-medium text-[#1F1F1F]">{money(subtotal)}</dd>
                </div>
                {coupon && (
                  <div className="flex justify-between text-[var(--brand-orange)]">
                    <dt>Descuento ({coupon.code})</dt>
                    <dd className="font-medium">−{money(discount)}</dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between border-t border-[#E9E9E9] pt-4">
                  <dt className="text-base font-semibold text-[#1F1F1F]">Total</dt>
                  <dd className="text-2xl font-semibold text-[#1F1F1F]">{money(total)}</dd>
                </div>
              </dl>

              <Link href="/caja" className={`mt-6 ${buttonMainFull}`}>Finalizar compra</Link>
              <div className="mt-4 text-center">
                <Link href="/catalogo" className={`${textButtonHover} text-[14px] text-[#1F1F1F]`}>Seguir comprando</Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
