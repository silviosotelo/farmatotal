"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Banknote, Landmark, MapPin, ShoppingBag, Store, Truck } from "lucide-react";
import { useCart } from "@/components/providers/CartContext";
import { useSucursal } from "@/components/sucursal/SucursalContext";
import { useToast } from "@/components/providers/ToastContext";
import { useMoney } from "@/components/providers/CurrencyContext";
import { useFlags } from "@/components/providers/FeatureFlagsContext";
import {
  useShippingQuote,
  useTaxConfig,
  usePaymentMethods,
  isPaymentEnabled,
  defaultRate,
  computeTax,
} from "@/lib/checkout";
import { AnvogueBreadcrumb } from "../AnvogueBreadcrumb";
import { container, buttonMain, buttonMainFull, heading5 } from "../sections/anvogueClasses";

type DeliveryMethod = "retiro" | "envio";
type PaymentMethod =
  | "Tarjeta de crédito/débito (Bancard)"
  | "Efectivo en sucursal"
  | "Transferencia bancaria";

/** Medios de pago de la UI mapeados a la clave de config del backend (mod_payments). */
const PAYMENT_OPTIONS: { value: PaymentMethod; key: string; Icon: typeof CreditCard }[] = [
  { value: "Tarjeta de crédito/débito (Bancard)", key: "bancard", Icon: CreditCard },
  { value: "Efectivo en sucursal", key: "cash", Icon: Banknote },
  { value: "Transferencia bancaria", key: "transfer", Icon: Landmark },
];

const INPUT_CLS =
  "h-12 w-full rounded-2xl border border-[#E9E9E9] bg-white px-4 text-sm text-[#1F1F1F] placeholder:text-[#696C70] focus:border-[#1F1F1F] focus:outline-none";

const LABEL_CLS =
  "mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-[#696C70]";

/**
 * Checkout del tema Anvogue (fashion/retail minimalista). Reusa exactamente la
 * misma lógica que el checkout farmatotal (caja/page.tsx): mismos campos, misma
 * validación, mismo submit y rutas. Solo cambia la capa visual: paleta
 * negra/roja, surface gris, rounded-2xl y labels en mayúsculas con tracking.
 */
export function AnvogueCheckout() {
  const money = useMoney();
  const router = useRouter();
  const { lines, subtotal, coupon, discount, total, clear } = useCart();
  const { selected, open } = useSucursal();
  const { toast } = useToast();
  const flags = useFlags();

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [direccion, setDireccion] = useState("");
  // Tenant sin sucursales (branches=false): no hay "retiro en sucursal" → solo envío.
  const [delivery, setDelivery] = useState<DeliveryMethod>(flags.branches ? "retiro" : "envio");
  const [payment, setPayment] = useState<PaymentMethod>(
    "Tarjeta de crédito/débito (Bancard)",
  );
  const [submitting, setSubmitting] = useState(false);

  // Pedido sin productos físicos (digital/servicio) → no requiere envío.
  const requiresShipping = lines.some((l) => (l.product.productType ?? "physical") === "physical");

  // Config-driven: cotización de envío, impuestos y medios de pago.
  const ship = useShippingQuote({ enabled: requiresShipping && delivery === "envio", city: ciudad, subtotal });
  const taxCfg = useTaxConfig();
  const paymentMethods = usePaymentMethods();
  const rate = defaultRate(taxCfg);

  // Si el medio elegido queda deshabilitado por config, salta al primero visible.
  useEffect(() => {
    const visible = PAYMENT_OPTIONS.filter((o) => isPaymentEnabled(paymentMethods, o.key));
    setPayment((prev) => (visible.some((o) => o.value === prev) ? prev : (visible[0]?.value ?? prev)));
  }, [paymentMethods]);

  /* ── Empty cart ── */
  if (lines.length === 0) {
    return (
      <main className="flex-1">
        <div className="mx-auto max-w-[1322px] px-4 py-20">
          <div className="flex flex-col items-center gap-7 text-center">
            <div className="flex size-24 items-center justify-center rounded-full bg-[#F7F7F7]">
              <ShoppingBag size={36} className="text-[#1F1F1F]" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-orange)]">
                Finalizar compra
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#1F1F1F] md:text-3xl">
                Tu carrito está vacío
              </h1>
              <p className="mt-2 text-sm text-[#696C70]">
                Agregá productos antes de continuar con tu compra.
              </p>
            </div>
            <Link href="/catalogo" className={buttonMain}>
              Ver catálogo
            </Link>
          </div>
        </div>
      </main>
    );
  }

  /* ── Submit ── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!nombre.trim() || !email.trim()) {
      toast("Completá al menos tu nombre y email.", "error");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create order via checkout API
      const paymentMethod =
        payment === "Tarjeta de crédito/débito (Bancard)" ? "online" : "contraentrega";
      const shippingMethod = requiresShipping ? (delivery === "retiro" ? "pickup" : "delivery") : "pickup";

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
      });

      if (!res.ok) {
        const data = await res.json();
        toast(data.error ?? "Error al crear el pedido", "error");
        setSubmitting(false);
        return;
      }

      const order = await res.json();

      // 2. Persistir resumen para "pedido-recibido" (ambos caminos).
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
        );
      } catch {
        /* ignore */
      }

      clear();

      // 3. Pago online → página interna del iframe Bancard; si no, confirmación directa.
      if (paymentMethod === "online") {
        window.location.href = `/pago/${order.id}`;
        return;
      }
      router.push("/pedido-recibido");
    } catch {
      toast("Error de conexión. Intentá de nuevo.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const deliveryOptions: { value: DeliveryMethod; label: string; desc: string; Icon: typeof Store }[] = [
    ...(flags.branches
      ? [{ value: "retiro" as const, label: "Retiro en sucursal", desc: "Recogé tu pedido sin costo de envío", Icon: Store }]
      : []),
    { value: "envio", label: "Envío a domicilio", desc: "Te lo llevamos a tu dirección", Icon: Truck },
  ];

  // Medios de pago visibles (gateados por la config del tenant).
  const paymentOptions = PAYMENT_OPTIONS.filter((o) => isPaymentEnabled(paymentMethods, o.key));

  // Resumen config-driven: envío del método elegido + impuesto de la tasa default.
  const selectedShip = ship.options.find((o) => o.id === ship.selectedId) ?? null;
  const shippingCost = requiresShipping && delivery === "envio" ? (selectedShip?.cost ?? 0) : 0;
  const taxIncluded = taxCfg?.pricesIncludeTax ?? true;
  const taxAmount = rate ? computeTax(total, rate.percent, taxIncluded) : 0;
  const grandTotal = total + shippingCost + (taxIncluded ? 0 : taxAmount);

  /* ── Checkout ── */
  return (
    <main className="flex-1">
      {/* breadcrumb banner */}
      <AnvogueBreadcrumb heading="Finalizar compra" sub="Checkout" />

      <div className={`${container} py-10 md:py-14`}>
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-8 lg:flex-row">
            {/* ── LEFT: forms ── */}
            <div className="flex min-w-0 flex-1 flex-col gap-6">
              {/* Billing data */}
              <section className="rounded-2xl border border-[#E9E9E9] bg-white p-7">
                <h2 className={heading5}>Datos de facturación</h2>
                <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="nombre" className={LABEL_CLS}>
                      Nombre <span className="text-[var(--brand-orange)]">*</span>
                    </label>
                    <input
                      id="nombre"
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Juan"
                      required
                      className={INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label htmlFor="apellido" className={LABEL_CLS}>
                      Apellido
                    </label>
                    <input
                      id="apellido"
                      type="text"
                      value={apellido}
                      onChange={(e) => setApellido(e.target.value)}
                      placeholder="Pérez"
                      className={INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className={LABEL_CLS}>
                      Email <span className="text-[var(--brand-orange)]">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      required
                      className={INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label htmlFor="telefono" className={LABEL_CLS}>
                      Teléfono
                    </label>
                    <input
                      id="telefono"
                      type="text"
                      inputMode="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="0981 000 000"
                      className={INPUT_CLS}
                    />
                  </div>
                  {delivery === "envio" && (
                    <>
                      <div>
                        <label htmlFor="ciudad" className={LABEL_CLS}>
                          Ciudad
                        </label>
                        <input
                          id="ciudad"
                          type="text"
                          value={ciudad}
                          onChange={(e) => setCiudad(e.target.value)}
                          placeholder="Asunción"
                          className={INPUT_CLS}
                        />
                      </div>
                      <div>
                        <label htmlFor="direccion" className={LABEL_CLS}>
                          Dirección
                        </label>
                        <input
                          id="direccion"
                          type="text"
                          value={direccion}
                          onChange={(e) => setDireccion(e.target.value)}
                          placeholder="Av. Mariscal López 1234"
                          className={INPUT_CLS}
                        />
                      </div>
                    </>
                  )}
                </div>
              </section>

              {/* Delivery */}
              <section className="rounded-2xl border border-[#E9E9E9] bg-white p-7">
                <h2 className={heading5}>Entrega</h2>
                {!requiresShipping ? (
                  <p className="mt-6 text-sm text-[#696C70]">Este pedido no requiere envío</p>
                ) : (
                <>
                <div className="mt-6 flex flex-col gap-3">
                  {deliveryOptions.map(({ value, label, desc, Icon }) => (
                    <label
                      key={value}
                      className={
                        "flex cursor-pointer items-center gap-4 rounded-2xl border p-5 transition-colors " +
                        (delivery === value
                          ? "border-[#1F1F1F] bg-[#F7F7F7]"
                          : "border-[#E9E9E9] hover:border-[#1F1F1F]")
                      }
                    >
                      <input
                        type="radio"
                        name="delivery"
                        value={value}
                        checked={delivery === value}
                        onChange={() => setDelivery(value)}
                        className="size-4 accent-[var(--brand-orange)]"
                      />
                      <Icon size={20} className="flex-none text-[#1F1F1F]" strokeWidth={1.5} />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[#1F1F1F]">
                          {label}
                        </span>
                        <span className="block text-xs text-[#696C70]">{desc}</span>
                      </span>
                    </label>
                  ))}
                </div>

                {delivery === "retiro" && (
                  <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-[#F7F7F7] p-5">
                    <MapPin size={18} className="flex-none text-[var(--brand-orange)]" strokeWidth={1.75} />
                    {selected ? (
                      <>
                        <span className="text-sm text-[#1F1F1F]">
                          <span className="font-semibold">{selected.name}</span>
                          {selected.address && (
                            <span className="text-[#696C70]"> — {selected.address}</span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={open}
                          className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--brand-orange)] underline-offset-2 transition-opacity hover:opacity-80"
                        >
                          Cambiar
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={open}
                        className="inline-flex h-10 items-center justify-center rounded-2xl border border-[#1F1F1F] px-5 text-xs font-semibold uppercase tracking-[0.08em] text-[#1F1F1F] transition-colors hover:bg-[#1F1F1F] hover:text-white"
                      >
                        Seleccionar sucursal
                      </button>
                    )}
                  </div>
                )}

                {delivery === "envio" && (
                  <div className="mt-5">
                    {ship.loading ? (
                      <p className="text-sm text-[#696C70]">Cotizando envío…</p>
                    ) : ship.options.length === 0 ? (
                      <p className="text-sm text-[#696C70]">Ingresá tu ciudad para ver los métodos de envío disponibles.</p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {ship.options.map((o) => (
                          <label
                            key={o.id}
                            className={
                              "flex cursor-pointer items-center gap-4 rounded-2xl border p-5 transition-colors " +
                              (ship.selectedId === o.id
                                ? "border-[#1F1F1F] bg-[#F7F7F7]"
                                : "border-[#E9E9E9] hover:border-[#1F1F1F]")
                            }
                          >
                            <input
                              type="radio"
                              name="shipMethod"
                              value={o.id}
                              checked={ship.selectedId === o.id}
                              onChange={() => ship.setSelectedId(o.id)}
                              className="size-4 accent-[var(--brand-orange)]"
                            />
                            <span className="min-w-0 flex-1 text-sm font-semibold text-[#1F1F1F]">{o.name}</span>
                            <span className="whitespace-nowrap text-sm font-semibold text-[#1F1F1F]">
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
              <section className="rounded-2xl border border-[#E9E9E9] bg-white p-7">
                <h2 className={heading5}>Método de pago</h2>
                <div className="mt-6 flex flex-col gap-3">
                  {paymentOptions.map(({ value, Icon }) => (
                    <label
                      key={value}
                      className={
                        "flex cursor-pointer items-center gap-4 rounded-2xl border p-5 transition-colors " +
                        (payment === value
                          ? "border-[#1F1F1F] bg-[#F7F7F7]"
                          : "border-[#E9E9E9] hover:border-[#1F1F1F]")
                      }
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={value}
                        checked={payment === value}
                        onChange={() => setPayment(value)}
                        className="size-4 accent-[var(--brand-orange)]"
                      />
                      <Icon size={20} className="flex-none text-[#1F1F1F]" strokeWidth={1.5} />
                      <span className="text-sm font-semibold text-[#1F1F1F]">{value}</span>
                    </label>
                  ))}
                </div>
              </section>
            </div>

            {/* ── RIGHT: order summary ── */}
            <aside className="flex-none lg:w-96">
              <div className="sticky top-24 rounded-2xl bg-[#F7F7F7] p-6 md:p-7">
                <h2 className={heading5}>Resumen del pedido</h2>

                <ul className="mt-6 divide-y divide-[#E9E9E9]">
                  {lines.map(({ product, quantity }) => (
                    <li key={product.id} className="flex items-center gap-3 py-4">
                      <div className="size-14 flex-none overflow-hidden rounded-2xl bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={product.image}
                          alt={product.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-xs font-medium text-[#1F1F1F]">
                          {product.title}
                        </p>
                        <p className="mt-0.5 text-xs text-[#696C70]">×{quantity}</p>
                      </div>
                      <p className="whitespace-nowrap text-xs font-semibold text-[#1F1F1F]">
                        {money(product.priceWeb * quantity)}
                      </p>
                    </li>
                  ))}
                </ul>

                <dl className="mt-2 space-y-3 border-t border-[#E9E9E9] pt-6 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-[#696C70]">Subtotal</dt>
                    <dd className="font-medium text-[#1F1F1F]">{money(subtotal)}</dd>
                  </div>

                  {coupon && discount > 0 && (
                    <div className="flex justify-between text-[var(--brand-orange)]">
                      <dt>Descuento ({coupon.code})</dt>
                      <dd className="font-medium">−{money(discount)}</dd>
                    </div>
                  )}

                  {requiresShipping && delivery === "envio" && (
                    <div className="flex justify-between">
                      <dt className="text-[#696C70]">Envío{selectedShip ? ` (${selectedShip.name})` : ""}</dt>
                      <dd className="font-medium text-[#1F1F1F]">{selectedShip ? (shippingCost > 0 ? money(shippingCost) : "Gratis") : "A cotizar"}</dd>
                    </div>
                  )}

                  {rate && taxAmount > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-[#696C70]">{taxIncluded ? `${rate.name} incluido` : rate.name}</dt>
                      <dd className="font-medium text-[#1F1F1F]">{money(taxAmount)}</dd>
                    </div>
                  )}

                  <div className="flex items-baseline justify-between border-t border-[#E9E9E9] pt-4">
                    <dt className="text-base font-semibold text-[#1F1F1F]">Total</dt>
                    <dd className="text-2xl font-semibold text-[#1F1F1F]">{money(grandTotal)}</dd>
                  </div>
                </dl>

                <button type="submit" disabled={submitting} className={`mt-6 ${buttonMainFull}`}>
                  {submitting ? "Procesando..." : "Realizar pedido"}
                </button>
              </div>
            </aside>
          </div>
        </form>
      </div>
    </main>
  );
}
