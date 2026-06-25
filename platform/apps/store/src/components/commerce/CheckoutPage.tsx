"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CreditCard, Banknote, Landmark, MapPin, ShoppingBag, Store, Truck } from "lucide-react"
import { useCart } from "@/components/providers/CartContext"
import { useSucursal } from "@/components/sucursal/SucursalContext"
import { useToast } from "@/components/providers/ToastContext"
import { useMoney } from "@/components/providers/CurrencyContext"
import { useFlags } from "@/components/providers/FeatureFlagsContext"
import {
  useShippingQuote,
  useTaxConfig,
  usePaymentMethods,
  isPaymentEnabled,
  defaultRate,
  computeTax,
} from "@/lib/checkout"
import Image from "next/image"

type DeliveryMethod = "retiro" | "envio"
type PaymentMethod =
  | "Tarjeta de crédito/débito (Bancard)"
  | "Efectivo en sucursal"
  | "Transferencia bancaria"

const PAYMENT_OPTIONS: { value: PaymentMethod; key: string; Icon: typeof CreditCard }[] = [
  { value: "Tarjeta de crédito/débito (Bancard)", key: "bancard", Icon: CreditCard },
  { value: "Efectivo en sucursal", key: "cash", Icon: Banknote },
  { value: "Transferencia bancaria", key: "transfer", Icon: Landmark },
]

export default function CheckoutPage() {
  const money = useMoney()
  const router = useRouter()
  const { lines, subtotal, coupon, discount, total, clear } = useCart()
  const { selected, open } = useSucursal()
  const { toast } = useToast()
  const flags = useFlags()

  const [nombre, setNombre] = useState("")
  const [apellido, setApellido] = useState("")
  const [email, setEmail] = useState("")
  const [telefono, setTelefono] = useState("")
  const [ciudad, setCiudad] = useState("")
  const [direccion, setDireccion] = useState("")
  const [delivery, setDelivery] = useState<DeliveryMethod>(flags.branches ? "retiro" : "envio")
  const [payment, setPayment] = useState<PaymentMethod>("Tarjeta de crédito/débito (Bancard)")
  const [submitting, setSubmitting] = useState(false)

  const requiresShipping = lines.some((l) => (l.product.productType ?? "physical") === "physical")

  const ship = useShippingQuote({ enabled: requiresShipping && delivery === "envio", city: ciudad, subtotal })
  const taxCfg = useTaxConfig()
  const paymentMethods = usePaymentMethods()
  const rate = defaultRate(taxCfg)

  useEffect(() => {
    const visible = PAYMENT_OPTIONS.filter((o) => isPaymentEnabled(paymentMethods, o.key))
    setPayment((prev) => (visible.some((o) => o.value === prev) ? prev : (visible[0]?.value ?? prev)))
  }, [paymentMethods])

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex size-24 items-center justify-center rounded-full bg-muted">
            <ShoppingBag size={36} className="text-muted-foreground" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Tu carrito está vacío</h1>
            <p className="mt-2 text-sm text-muted-foreground">Agregá productos antes de continuar con tu compra.</p>
          </div>
          <Link
            href="/catalogo"
            className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-medium text-white transition-colors hover:opacity-90"
            style={{ background: "var(--primary)" }}
          >
            Ver catálogo
          </Link>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!nombre.trim() || !email.trim()) {
      toast("Completá al menos tu nombre y email.", "error")
      return
    }

    setSubmitting(true)
    try {
      const paymentMethod = payment === "Tarjeta de crédito/débito (Bancard)" ? "online" : "contraentrega"
      const shippingMethod = requiresShipping ? (delivery === "retiro" ? "pickup" : "delivery") : "pickup"

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: lines.map(({ product, quantity }) => ({
            productId: product.variantOf ?? product.id,
            sku: product.sku,
            title: product.title,
            quantity,
            unitPrice: product.priceWeb,
          })),
          couponCode: coupon?.code,
          paymentMethod,
          shippingMethod,
          shippingMethodId: shippingMethod === "delivery" ? (ship.selectedId ?? undefined) : undefined,
          taxRateId: rate?.id,
          branchId: flags.branches && shippingMethod === "pickup" ? selected?.branchId : undefined,
          billing: {
            name: `${nombre} ${apellido}`.trim(),
            email,
            phone: telefono,
            address: direccion,
            city: ciudad,
          },
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast(data.error ?? "Error al crear el pedido", "error")
        setSubmitting(false)
        return
      }

      const order = await res.json()

      try {
        localStorage.setItem(
          "ft_last_order_v1",
          JSON.stringify({
            id: order.number,
            date: new Date().toISOString(),
            status: order.status,
            total: order.total,
            sucursal: delivery === "retiro" ? selected?.name : undefined,
            paymentMethod: payment,
            lines: lines.map(({ product, quantity }) => ({
              title: product.title,
              sku: product.sku,
              quantity,
              price: product.priceWeb,
              image: product.image,
            })),
          }),
        )
      } catch {
        /* ignore */
      }

      clear()

      if (paymentMethod === "online") {
        window.location.href = `/pago/${order.id}`
        return
      }
      router.push("/pedido-recibido")
    } catch {
      toast("Error de conexión. Intentá de nuevo.", "error")
    } finally {
      setSubmitting(false)
    }
  }

  const deliveryOptions: { value: DeliveryMethod; label: string; desc: string; Icon: typeof Store }[] = [
    ...(flags.branches
      ? [{ value: "retiro" as const, label: "Retiro en sucursal", desc: "Recogé tu pedido sin costo de envío", Icon: Store }]
      : []),
    { value: "envio", label: "Envío a domicilio", desc: "Te lo llevamos a tu dirección", Icon: Truck },
  ]

  const paymentOptions = PAYMENT_OPTIONS.filter((o) => isPaymentEnabled(paymentMethods, o.key))

  const selectedShip = ship.options.find((o) => o.id === ship.selectedId) ?? null
  const shippingCost = requiresShipping && delivery === "envio" ? (selectedShip?.cost ?? 0) : 0
  const taxIncluded = taxCfg?.pricesIncludeTax ?? true
  const taxAmount = rate ? computeTax(total, rate.percent, taxIncluded) : 0
  const grandTotal = total + shippingCost + (taxIncluded ? 0 : taxAmount)

  const inputCls = "h-11 w-full rounded-lg border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
  const labelCls = "mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
      <h1 className="text-2xl font-semibold text-foreground mb-8">Finalizar compra</h1>

      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* LEFT: forms */}
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            {/* Billing data */}
            <section className="rounded-xl border border-border bg-surface p-6">
              <h2 className="text-base font-semibold text-foreground">Datos de facturación</h2>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="nombre" className={labelCls}>
                    Nombre <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="nombre"
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Juan"
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="apellido" className={labelCls}>Apellido</label>
                  <input
                    id="apellido"
                    type="text"
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    placeholder="Pérez"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="email" className={labelCls}>
                    Email <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="telefono" className={labelCls}>Teléfono</label>
                  <input
                    id="telefono"
                    type="text"
                    inputMode="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="0981 000 000"
                    className={inputCls}
                  />
                </div>
                {delivery === "envio" && (
                  <>
                    <div>
                      <label htmlFor="ciudad" className={labelCls}>Ciudad</label>
                      <input
                        id="ciudad"
                        type="text"
                        value={ciudad}
                        onChange={(e) => setCiudad(e.target.value)}
                        placeholder="Asunción"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label htmlFor="direccion" className={labelCls}>Dirección</label>
                      <input
                        id="direccion"
                        type="text"
                        value={direccion}
                        onChange={(e) => setDireccion(e.target.value)}
                        placeholder="Av. Mariscal López 1234"
                        className={inputCls}
                      />
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Delivery */}
            <section className="rounded-xl border border-border bg-surface p-6">
              <h2 className="text-base font-semibold text-foreground">Entrega</h2>
              {!requiresShipping ? (
                <p className="mt-4 text-sm text-muted-foreground">Este pedido no requiere envío</p>
              ) : (
                <>
                  <div className="mt-4 flex flex-col gap-3">
                    {deliveryOptions.map(({ value, label, desc, Icon }) => (
                      <label
                        key={value}
                        className={
                          "flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-colors " +
                          (delivery === value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50")
                        }
                      >
                        <input
                          type="radio"
                          name="delivery"
                          value={value}
                          checked={delivery === value}
                          onChange={() => setDelivery(value)}
                          className="size-4 accent-primary"
                        />
                        <Icon size={20} className="flex-none text-foreground" strokeWidth={1.5} />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-foreground">{label}</span>
                          <span className="block text-xs text-muted-foreground">{desc}</span>
                        </span>
                      </label>
                    ))}
                  </div>

                  {delivery === "retiro" && (
                    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-muted p-4">
                      <MapPin size={18} className="flex-none text-primary" strokeWidth={1.75} />
                      {selected ? (
                        <>
                          <span className="text-sm text-foreground">
                            <span className="font-semibold">{selected.name}</span>
                            {selected.address && (
                              <span className="text-muted-foreground"> — {selected.address}</span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={open}
                            className="text-xs font-semibold text-primary underline-offset-2 transition-opacity hover:opacity-80"
                          >
                            Cambiar
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={open}
                          className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                        >
                          Seleccionar sucursal
                        </button>
                      )}
                    </div>
                  )}

                  {delivery === "envio" && (
                    <div className="mt-4">
                      {ship.loading ? (
                        <p className="text-sm text-muted-foreground">Cotizando envío…</p>
                      ) : ship.options.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Ingresá tu ciudad para ver los métodos de envío disponibles.</p>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {ship.options.map((o) => (
                            <label
                              key={o.id}
                              className={
                                "flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-colors " +
                                (ship.selectedId === o.id
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/50")
                              }
                            >
                              <input
                                type="radio"
                                name="shipMethod"
                                value={o.id}
                                checked={ship.selectedId === o.id}
                                onChange={() => ship.setSelectedId(o.id)}
                                className="size-4 accent-primary"
                              />
                              <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">{o.name}</span>
                              <span className="whitespace-nowrap text-sm font-semibold text-foreground">
                                {o.cost > 0 ? money(o.cost) : "Gratis"}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Payment */}
            <section className="rounded-xl border border-border bg-surface p-6">
              <h2 className="text-base font-semibold text-foreground">Método de pago</h2>
              <div className="mt-4 flex flex-col gap-3">
                {paymentOptions.map(({ value, Icon }) => (
                  <label
                    key={value}
                    className={
                      "flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-colors " +
                      (payment === value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50")
                    }
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={value}
                      checked={payment === value}
                      onChange={() => setPayment(value)}
                      className="size-4 accent-primary"
                    />
                    <Icon size={20} className="flex-none text-foreground" strokeWidth={1.5} />
                    <span className="text-sm font-semibold text-foreground">{value}</span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          {/* RIGHT: order summary */}
          <aside className="flex-none lg:w-80">
            <div className="sticky top-24 rounded-xl border border-border bg-surface p-6">
              <h2 className="text-base font-semibold text-foreground">Resumen del pedido</h2>

              <ul className="mt-5 divide-y divide-border">
                {lines.map(({ product, quantity }) => (
                  <li key={product.id} className="flex items-center gap-3 py-4">
                    <div className="size-14 flex-none overflow-hidden rounded-lg bg-muted">
                      <Image
                        src={product.image || "/img/placeholder.png"}
                        alt={product.title}
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-xs font-medium text-foreground">{product.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">×{quantity}</p>
                    </div>
                    <p className="whitespace-nowrap text-xs font-semibold text-foreground">
                      {money(product.priceWeb * quantity)}
                    </p>
                  </li>
                ))}
              </ul>

              <dl className="mt-2 space-y-3 border-t border-border pt-5 text-sm">
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

                {requiresShipping && delivery === "envio" && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Envío{selectedShip ? ` (${selectedShip.name})` : ""}</dt>
                    <dd className="font-medium text-foreground">
                      {selectedShip ? (shippingCost > 0 ? money(shippingCost) : "Gratis") : "A cotizar"}
                    </dd>
                  </div>
                )}

                {rate && taxAmount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{taxIncluded ? `${rate.name} incluido` : rate.name}</dt>
                    <dd className="font-medium text-foreground">{money(taxAmount)}</dd>
                  </div>
                )}

                <div className="flex items-baseline justify-between border-t border-border pt-4">
                  <dt className="text-base font-semibold text-foreground">Total</dt>
                  <dd className="text-2xl font-semibold text-foreground">{money(grandTotal)}</dd>
                </div>
              </dl>

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 flex w-full items-center justify-center rounded-lg px-6 py-3 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
                style={{ background: "var(--primary)" }}
              >
                {submitting ? "Procesando..." : "Realizar pedido"}
              </button>
            </div>
          </aside>
        </div>
      </form>
    </div>
  )
}
