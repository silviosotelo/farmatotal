"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { Minus, Plus, ShoppingBag, Tag, Trash2, X } from "lucide-react"
import { useCart } from "@/components/providers/CartContext"
import { useToast } from "@/components/providers/ToastContext"
import { useMoney } from "@/components/providers/CurrencyContext"

export default function CartPage() {
  const money = useMoney()
  const {
    lines,
    subtotal,
    coupon,
    discount,
    total,
    setQty,
    removeItem,
    clear,
    applyCoupon,
    removeCoupon,
  } = useCart()
  const { toast } = useToast()
  const [couponInput, setCouponInput] = useState("")

  async function handleApplyCoupon(e: React.FormEvent) {
    e.preventDefault()
    const code = couponInput.trim()
    if (!code) return
    const result = await applyCoupon(code)
    toast(result.message, result.ok ? "success" : "error")
    if (result.ok) setCouponInput("")
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex size-24 items-center justify-center rounded-full bg-muted">
            <ShoppingBag size={36} className="text-muted-foreground" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Tu carrito está vacío</h1>
            <p className="mt-2 text-sm text-muted-foreground">Agregá productos para continuar con tu compra.</p>
          </div>
          <Link
            href="/catalogo"
            className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-medium text-white transition-colors hover:opacity-90"
            style={{ background: "var(--primary)" }}
          >
            Volver a la tienda
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
      <h1 className="text-2xl font-semibold text-foreground mb-8">Mi carrito</h1>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Items */}
        <div className="min-w-0 flex-1">
          {/* Desktop header */}
          <div className="hidden grid-cols-[2.5fr_1fr_1.2fr_1fr_auto] items-center gap-4 rounded-lg bg-muted px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:grid">
            <span>Producto</span>
            <span className="text-center">Precio</span>
            <span className="text-center">Cantidad</span>
            <span className="text-center">Subtotal</span>
            <span />
          </div>

          <ul className="divide-y divide-border">
            {lines.map(({ product, quantity }) => (
              <li key={product.id} className="py-5">
                {/* Desktop row */}
                <div className="hidden grid-cols-[2.5fr_1fr_1.2fr_1fr_auto] items-center gap-4 lg:grid">
                  <div className="flex items-center gap-4">
                    <div className="size-20 flex-none overflow-hidden rounded-xl bg-muted">
                      <Image
                        src={product.image || "/img/placeholder.png"}
                        alt={product.title}
                        width={80}
                        height={80}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <Link
                      href={`/productos/${product.slug}/`}
                      className="line-clamp-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
                    >
                      {product.title}
                    </Link>
                  </div>
                  <p className="text-center text-sm text-muted-foreground">{money(product.priceWeb)}</p>
                  <div className="flex items-center justify-center">
                    <div className="inline-flex items-center rounded-full border border-border">
                      <button
                        type="button"
                        onClick={() => setQty(product.id, quantity - 1)}
                        className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary"
                        aria-label="Disminuir cantidad"
                      >
                        <Minus size={15} />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-foreground">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQty(product.id, quantity + 1)}
                        className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary"
                        aria-label="Aumentar cantidad"
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>
                  <p className="text-center text-sm font-semibold text-foreground">{money(product.priceWeb * quantity)}</p>
                  <button
                    type="button"
                    onClick={() => removeItem(product.id)}
                    className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                    aria-label={`Quitar ${product.title}`}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Mobile row */}
                <div className="flex gap-4 lg:hidden">
                  <div className="size-20 flex-none overflow-hidden rounded-xl bg-muted">
                    <Image
                      src={product.image || "/img/placeholder.png"}
                      alt={product.title}
                      width={80}
                      height={80}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/productos/${product.slug}/`}
                        className="line-clamp-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {product.title}
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeItem(product.id)}
                        className="-mr-1 flex size-8 flex-none items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-destructive"
                        aria-label={`Quitar ${product.title}`}
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{money(product.priceWeb)}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-full border border-border">
                        <button
                          type="button"
                          onClick={() => setQty(product.id, quantity - 1)}
                          className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary"
                          aria-label="Disminuir cantidad"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-7 text-center text-sm font-semibold text-foreground">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQty(product.id, quantity + 1)}
                          className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary"
                          aria-label="Aumentar cantidad"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{money(product.priceWeb * quantity)}</p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center justify-between border-t border-border pt-6">
            {/* Coupon */}
            <div className="flex items-center gap-3">
              {coupon ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground">
                    <Tag size={14} className="text-primary" />
                    {coupon.code}
                  </span>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-xs font-semibold text-muted-foreground transition-colors hover:text-destructive"
                  >
                    Quitar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Código de cupón"
                    className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="h-10 flex-none rounded-lg border border-border px-4 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                  >
                    Aplicar
                  </button>
                </form>
              )}
            </div>

            {/* Clear cart */}
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 size={15} />
              Vaciar
            </button>
          </div>
        </div>

        {/* Summary */}
        <aside className="flex-none lg:w-80">
          <div className="sticky top-24 rounded-xl border border-border bg-surface p-6">
            <h2 className="text-base font-semibold text-foreground">Resumen del pedido</h2>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-medium text-foreground">{money(subtotal)}</dd>
              </div>
              {coupon && discount > 0 && (
                <div className="flex justify-between text-primary">
                  <dt>Descuento ({coupon.code})</dt>
                  <dd className="font-medium">−{money(discount)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-border pt-4">
                <dt className="text-base font-semibold text-foreground">Total</dt>
                <dd className="text-2xl font-semibold text-foreground">{money(total)}</dd>
              </div>
            </dl>

            <Link
              href="/caja"
              className="mt-6 flex w-full items-center justify-center rounded-lg px-6 py-3 text-sm font-medium text-white transition-colors hover:opacity-90"
              style={{ background: "var(--primary)" }}
            >
              Finalizar compra
            </Link>
            <div className="mt-3 text-center">
              <Link
                href="/catalogo"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                Seguir comprando
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
