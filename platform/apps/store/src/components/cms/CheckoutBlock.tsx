"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/providers/CartContext";
import { useSucursal } from "@/components/sucursal/SucursalContext";
import { useToast } from "@/components/providers/ToastContext";
import { useMoney } from "@/components/providers/CurrencyContext";
import { useFlags } from "@/components/providers/FeatureFlagsContext";
import { formatQty, unitLabel } from "@/lib/units";
import {
  useShippingQuote,
  useTaxConfig,
  usePaymentMethods,
  isPaymentEnabled,
  defaultRate,
  computeTax,
} from "@/lib/checkout";

type DeliveryMethod = "retiro" | "envio";
type PaymentMethod = "Tarjeta de crédito/débito (Bancard)" | "Efectivo en sucursal" | "Transferencia bancaria";

/** Medios de pago de la UI mapeados a la clave de config del backend (mod_payments). */
const PAYMENT_OPTIONS: { label: PaymentMethod; key: string }[] = [
  { label: "Tarjeta de crédito/débito (Bancard)", key: "bancard" },
  { label: "Efectivo en sucursal", key: "cash" },
  { label: "Transferencia bancaria", key: "transfer" },
];

const INPUT_CLS =
  "w-full bg-search-bg rounded-md h-11 px-3 text-sm outline-none border border-transparent focus-visible:ring-2 focus-visible:ring-brand-orange/40 text-brand-text placeholder:text-brand-muted";
const LABEL_CLS = "block text-sm font-medium text-brand-text mb-1";
const SECTION_CLS = "rounded-xl border border-[#ededf1] bg-white p-6";

/**
 * Bloque funcional "Checkout" del builder (estilo widget de checkout de Woo en
 * Elementor): formulario + lógica real (orden, Bancard, redirección) embebida.
 * Markup farmatotal pixel-perfect.
 */
export function CheckoutBlock() {
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
  const deliveryOptions: DeliveryMethod[] = flags.branches ? ["retiro", "envio"] : ["envio"];
  const [payment, setPayment] = useState<PaymentMethod>("Tarjeta de crédito/débito (Bancard)");
  const [submitting, setSubmitting] = useState(false);

  // Si todas las líneas son digitales/servicios (no físicas), el pedido no
  // requiere envío: se oculta el selector y se fuerza retiro/pickup (costo 0).
  const requiresShipping = lines.some((l) => (l.product.productType ?? "physical") === "physical");

  // Config-driven: cotización de envío (por ciudad), impuestos y medios de pago.
  const ship = useShippingQuote({ enabled: requiresShipping && delivery === "envio", city: ciudad, subtotal });
  const taxCfg = useTaxConfig();
  const paymentMethods = usePaymentMethods();
  const rate = defaultRate(taxCfg);

  // Si el medio de pago elegido queda deshabilitado por config, salta al primero visible.
  useEffect(() => {
    const visible = PAYMENT_OPTIONS.filter((o) => isPaymentEnabled(paymentMethods, o.key));
    setPayment((prev) => (visible.some((o) => o.label === prev) ? prev : (visible[0]?.label ?? prev)));
  }, [paymentMethods]);

  if (lines.length === 0) {
    return (
      <div className="ft-container py-20 flex flex-col items-center gap-6 text-center">
        <p className="text-brand-muted text-lg">Tu carrito está vacío.</p>
        <Link href="/catalogo" className="brand-gradient focus-ring text-white rounded-[30px] h-11 px-6 text-sm font-semibold flex items-center justify-center">
          Ver catálogo
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || !email.trim()) {
      toast("Completá al menos tu nombre y email.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const paymentMethod = payment === "Tarjeta de crédito/débito (Bancard)" ? "online" : "contraentrega";
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
          billing: { name: `${nombre} ${apellido}`.trim(), email, phone: telefono, address: direccion, city: ciudad },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error ?? "Error al crear el pedido", "error");
        setSubmitting(false);
        return;
      }
      const order = await res.json();
      try {
        localStorage.setItem("ft_last_order_v1", JSON.stringify({
          id: order.number,
          date: new Date().toISOString(),
          status: order.status,
          total: order.total,
          sucursal: delivery === "retiro" ? selected?.name : undefined,
          paymentMethod: payment,
          lines: lines.map(({ product, quantity }) => ({ title: product.title, sku: product.sku, quantity, price: product.priceWeb, image: product.image })),
        }));
      } catch { /* ignore */ }
      clear();
      // Pago online → página interna del iframe Bancard; si no, confirmación directa.
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

  // Resumen config-driven: envío del método elegido + impuesto de la tasa default.
  const selectedShip = ship.options.find((o) => o.id === ship.selectedId) ?? null;
  const shippingCost = requiresShipping && delivery === "envio" ? (selectedShip?.cost ?? 0) : 0;
  const taxIncluded = taxCfg?.pricesIncludeTax ?? true;
  const taxAmount = rate ? computeTax(total, rate.percent, taxIncluded) : 0;
  const grandTotal = total + shippingCost + (taxIncluded ? 0 : taxAmount);
  const visiblePayments = PAYMENT_OPTIONS.filter((o) => isPaymentEnabled(paymentMethods, o.key));

  return (
    <div className="ft-container py-8">
      <h2 className="font-heading text-2xl text-brand-text mb-6">Finalizar compra</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            <section className={SECTION_CLS}>
              <h3 className="font-heading text-lg text-brand-text mb-5">Datos de facturación</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nombre" className={LABEL_CLS}>Nombre <span className="text-[#c0392b]">*</span></label>
                  <input id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Juan" required className={INPUT_CLS} />
                </div>
                <div>
                  <label htmlFor="apellido" className={LABEL_CLS}>Apellido</label>
                  <input id="apellido" type="text" value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Pérez" className={INPUT_CLS} />
                </div>
                <div>
                  <label htmlFor="email" className={LABEL_CLS}>Email <span className="text-[#c0392b]">*</span></label>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" required className={INPUT_CLS} />
                </div>
                <div>
                  <label htmlFor="telefono" className={LABEL_CLS}>Teléfono</label>
                  <input id="telefono" type="text" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="0981 000 000" className={INPUT_CLS} />
                </div>
                <div>
                  <label htmlFor="ciudad" className={LABEL_CLS}>Ciudad</label>
                  <input id="ciudad" type="text" value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="Asunción" className={INPUT_CLS} />
                </div>
                <div>
                  <label htmlFor="direccion" className={LABEL_CLS}>Dirección</label>
                  <input id="direccion" type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Av. Mariscal López 1234" className={INPUT_CLS} />
                </div>
              </div>
            </section>

            <section className={SECTION_CLS}>
              <h3 className="font-heading text-lg text-brand-text mb-5">Entrega</h3>
              {!requiresShipping ? (
                <p className="text-sm text-brand-muted">Este pedido no requiere envío</p>
              ) : (
              <>
              <div className="flex flex-col gap-3">
                {deliveryOptions.map((opt) => (
                  <label key={opt} className={"flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors " + (delivery === opt ? "border-brand-orange bg-[#fff4ec]" : "border-[#ededf1] hover:border-brand-orange/40")}>
                    <input type="radio" name="delivery" value={opt} checked={delivery === opt} onChange={() => setDelivery(opt)} className="accent-brand-orange" />
                    <span className="text-sm font-medium text-brand-text">{opt === "retiro" ? "Retiro en sucursal" : "Envío a domicilio"}</span>
                  </label>
                ))}
              </div>
              {delivery === "retiro" && (
                <div className="mt-4 flex items-center gap-3">
                  {selected ? (
                    <>
                      <span className="text-sm text-brand-text">
                        <span className="font-semibold">{selected.name}</span>
                        {selected.address && <span className="text-brand-muted"> — {selected.address}</span>}
                      </span>
                      <button type="button" onClick={open} className="text-xs text-brand-orange underline hover:opacity-80 transition-opacity">Cambiar</button>
                    </>
                  ) : (
                    <button type="button" onClick={open} className="text-sm font-semibold text-brand-orange border border-brand-orange rounded-[30px] h-9 px-5 hover:bg-[#fff4ec] transition-colors focus-ring">Seleccionar sucursal</button>
                  )}
                </div>
              )}
              {delivery === "envio" && (
                <div className="mt-4">
                  {ship.loading ? (
                    <p className="text-sm text-brand-muted">Cotizando envío…</p>
                  ) : ship.options.length === 0 ? (
                    <p className="text-sm text-brand-muted">Ingresá tu ciudad para ver los métodos de envío disponibles.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {ship.options.map((o) => (
                        <label key={o.id} className={"flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors " + (ship.selectedId === o.id ? "border-brand-orange bg-[#fff4ec]" : "border-[#ededf1] hover:border-brand-orange/40")}>
                          <input type="radio" name="shipMethod" value={o.id} checked={ship.selectedId === o.id} onChange={() => ship.setSelectedId(o.id)} className="accent-brand-orange" />
                          <span className="flex-1 text-sm font-medium text-brand-text">{o.name}</span>
                          <span className="font-price text-sm text-brand-text whitespace-nowrap">{o.cost > 0 ? money(o.cost) : "Gratis"}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
              </>
              )}
            </section>

            <section className={SECTION_CLS}>
              <h3 className="font-heading text-lg text-brand-text mb-5">Método de pago</h3>
              <div className="flex flex-col gap-3">
                {visiblePayments.map(({ label: opt }) => (
                  <label key={opt} className={"flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors " + (payment === opt ? "border-brand-orange bg-[#fff4ec]" : "border-[#ededf1] hover:border-brand-orange/40")}>
                    <input type="radio" name="payment" value={opt} checked={payment === opt} onChange={() => setPayment(opt)} className="accent-brand-orange" />
                    <span className="text-sm font-medium text-brand-text">{opt}</span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          <aside className="lg:w-80 flex-none">
            <div className="border border-[#ededf1] rounded-xl p-6 bg-white sticky top-24">
              <h3 className="font-heading text-lg text-brand-text mb-5">Resumen del pedido</h3>
              <ul className="divide-y divide-[#ededf1] mb-5">
                {lines.map(({ product, quantity }) => (
                  <li key={product.id} className="py-3 flex items-center gap-3">
                    <div className="relative size-12 flex-none border border-[#ededf1] rounded-md overflow-hidden bg-white">
                      <Image src={product.image} alt={product.title} fill sizes="48px" className="object-contain p-0.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-brand-text line-clamp-2">{product.title}</p>
                      <p className="text-xs text-brand-muted mt-0.5">×{formatQty(quantity)} {unitLabel(product)}</p>
                    </div>
                    <p className="font-price text-xs text-brand-text whitespace-nowrap">{money(product.priceWeb * quantity)}</p>
                  </li>
                ))}
              </ul>
              <dl className="space-y-3 text-sm border-t border-[#ededf1] pt-4">
                <div className="flex justify-between">
                  <dt className="text-brand-muted">Subtotal</dt>
                  <dd className="font-price text-brand-text">{money(subtotal)}</dd>
                </div>
                {coupon && discount > 0 && (
                  <div className="flex justify-between text-[#c0392b]">
                    <dt>Descuento ({coupon.code})</dt>
                    <dd className="font-price">−{money(discount)}</dd>
                  </div>
                )}
                {requiresShipping && delivery === "envio" && (
                  <div className="flex justify-between">
                    <dt className="text-brand-muted">Envío{selectedShip ? ` (${selectedShip.name})` : ""}</dt>
                    <dd className="font-price text-brand-text">{selectedShip ? (shippingCost > 0 ? money(shippingCost) : "Gratis") : "A cotizar"}</dd>
                  </div>
                )}
                {rate && taxAmount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-brand-muted">{taxIncluded ? `${rate.name} incluido` : rate.name}</dt>
                    <dd className="font-price text-brand-text">{money(taxAmount)}</dd>
                  </div>
                )}
                <div className="pt-3 border-t border-[#ededf1] flex justify-between items-baseline">
                  <dt className="font-semibold text-brand-text text-base">Total</dt>
                  <dd className="font-price text-brand-orange text-xl font-bold">{money(grandTotal)}</dd>
                </div>
              </dl>
              <button type="submit" disabled={submitting} className="mt-6 w-full brand-gradient focus-ring text-white rounded-[30px] h-11 px-6 text-sm font-semibold flex items-center justify-center disabled:opacity-60">
                {submitting ? "Procesando..." : "Realizar pedido"}
              </button>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}
