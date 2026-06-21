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
import {
  useShippingQuote,
  useTaxConfig,
  usePaymentMethods,
  isPaymentEnabled,
  defaultRate,
  computeTax,
} from "@/lib/checkout";

type DeliveryMethod = "retiro" | "envio";
type PaymentMethod =
  | "Tarjeta de crédito/débito (Bancard)"
  | "Efectivo en sucursal"
  | "Transferencia bancaria";

/** Medios de pago de la UI mapeados a la clave de config del backend (mod_payments). */
const PAYMENT_OPTIONS: { value: PaymentMethod; key: string }[] = [
  { value: "Tarjeta de crédito/débito (Bancard)", key: "bancard" },
  { value: "Efectivo en sucursal", key: "cash" },
  { value: "Transferencia bancaria", key: "transfer" },
];

/**
 * Checkout en estilo Ekomart (markup rts-* + grilla Bootstrap, acentos verdes).
 * Reutiliza EXACTAMENTE la misma lógica de carrito/pedido que el checkout
 * farmatotal (useCart / useSucursal / useToast + handleSubmit). Solo cambia la
 * capa visual. No reimplementa ni altera el flujo de orden.
 */
export function EkomartCheckout() {
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
      <div className="shop-page">
        <div className="rts-navigation-area-breadcrumb bg_light-1">
          <div className="container">
            <div className="row">
              <div className="col-lg-12">
                <div className="navigator-breadcrumb-wrapper">
                  <Link href="/">Inicio</Link>
                  <i className="fa-regular fa-chevron-right" />
                  <span className="current">Finalizar compra</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rts-cart-area rts-section-gap bg_light-1">
          <div className="container">
            <div className="row">
              <div className="col-12 text-center py-5">
                <i
                  className="fa-light fa-cart-shopping"
                  style={{ fontSize: "64px", color: "var(--brand-orange)" }}
                />
                <h3 className="mt--30 mb--10">Tu carrito está vacío</h3>
                <p className="mb--30">Aún no agregaste productos a tu carrito.</p>
                <Link href="/catalogo" className="rts-btn btn-primary">
                  Ver catálogo
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Submit (idéntico al checkout farmatotal) ── */
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
        payment === "Tarjeta de crédito/débito (Bancard)"
          ? "online"
          : "contraentrega";
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

  // Medios de pago visibles (gateados por la config del tenant).
  const visiblePayments = PAYMENT_OPTIONS.filter((o) => isPaymentEnabled(paymentMethods, o.key));

  // Resumen config-driven: envío del método elegido + impuesto de la tasa default.
  const selectedShip = ship.options.find((o) => o.id === ship.selectedId) ?? null;
  const shippingCost = requiresShipping && delivery === "envio" ? (selectedShip?.cost ?? 0) : 0;
  const taxIncluded = taxCfg?.pricesIncludeTax ?? true;
  const taxAmount = rate ? computeTax(total, rate.percent, taxIncluded) : 0;
  const grandTotal = total + shippingCost + (taxIncluded ? 0 : taxAmount);

  return (
    <div className="shop-page">
      {/* Breadcrumb */}
      <div className="rts-navigation-area-breadcrumb bg_light-1">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="navigator-breadcrumb-wrapper">
                <Link href="/">Inicio</Link>
                <i className="fa-regular fa-chevron-right" />
                <span className="current">Finalizar compra</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-seperator bg_light-1">
        <div className="container">
          <hr className="section-seperator" />
        </div>
      </div>

      <div className="checkout-area rts-section-gap bg_light-1">
        <div className="container">
          <div>
            <div className="row g-5">
              {/* ── LEFT: billing + delivery + payment ── */}
              <div className="col-lg-8 pr--40 order-2 order-xl-1">
                {/* Billing data */}
                <div className="rts-billing-details-area">
                  <h3 className="title">Datos de facturación</h3>
                  <form id="checkout-form" onSubmit={handleSubmit} noValidate>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="single-input">
                        <label htmlFor="nombre">Nombre *</label>
                        <input
                          id="nombre"
                          type="text"
                          value={nombre}
                          onChange={(e) => setNombre(e.target.value)}
                          placeholder="Juan"
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="single-input">
                        <label htmlFor="apellido">Apellido</label>
                        <input
                          id="apellido"
                          type="text"
                          value={apellido}
                          onChange={(e) => setApellido(e.target.value)}
                          placeholder="Pérez"
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="single-input">
                        <label htmlFor="email">Email *</label>
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="correo@ejemplo.com"
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="single-input">
                        <label htmlFor="telefono">Teléfono</label>
                        <input
                          id="telefono"
                          type="text"
                          inputMode="tel"
                          value={telefono}
                          onChange={(e) => setTelefono(e.target.value)}
                          placeholder="0981 000 000"
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="single-input">
                        <label htmlFor="ciudad">Ciudad</label>
                        <input
                          id="ciudad"
                          type="text"
                          value={ciudad}
                          onChange={(e) => setCiudad(e.target.value)}
                          placeholder="Asunción"
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="single-input">
                        <label htmlFor="direccion">Dirección</label>
                        <input
                          id="direccion"
                          type="text"
                          value={direccion}
                          onChange={(e) => setDireccion(e.target.value)}
                          placeholder="Av. Mariscal López 1234"
                        />
                      </div>
                    </div>
                  </div>
                  </form>
                </div>

                {/* Delivery */}
                <div className="rts-billing-details-area mt--30">
                  <h3 className="title">Entrega</h3>
                  {!requiresShipping ? (
                    <p>Este pedido no requiere envío</p>
                  ) : (
                  <div className="cottom-cart-right-area">
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {deliveryOptions.map((opt) => (
                        <li
                          key={opt}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 12,
                          }}
                        >
                          <input
                            type="radio"
                            id={`delivery-${opt}`}
                            name="delivery"
                            value={opt}
                            checked={delivery === opt}
                            onChange={() => setDelivery(opt)}
                            style={{
                              accentColor: "var(--brand-orange)",
                              width: 18,
                              height: 18,
                              margin: 0,
                            }}
                          />
                          <label
                            htmlFor={`delivery-${opt}`}
                            style={{
                              margin: 0,
                              cursor: "pointer",
                              color: "#2C3C28",
                              fontWeight: 500,
                            }}
                          >
                            {opt === "retiro"
                              ? "Retiro en sucursal"
                              : "Envío a domicilio"}
                          </label>
                        </li>
                      ))}
                    </ul>

                    {delivery === "retiro" && (
                      <div className="mt--15 d-flex align-items-center gap-3 flex-wrap">
                        {selected ? (
                          <>
                            <span>
                              <strong>{selected.name}</strong>
                              {selected.address && (
                                <span style={{ color: "#74787c" }}>
                                  {" "}
                                  — {selected.address}
                                </span>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={open}
                              className="rts-btn btn-primary border-only"
                            >
                              Cambiar
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={open}
                            className="rts-btn btn-primary border-only"
                          >
                            Seleccionar sucursal
                          </button>
                        )}
                      </div>
                    )}

                    {delivery === "envio" && (
                      <div className="mt--15">
                        {ship.loading ? (
                          <p>Cotizando envío…</p>
                        ) : ship.options.length === 0 ? (
                          <p>Ingresá tu ciudad para ver los métodos de envío disponibles.</p>
                        ) : (
                          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                            {ship.options.map((o) => (
                              <li
                                key={o.id}
                                style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}
                              >
                                <input
                                  type="radio"
                                  id={`ship-${o.id}`}
                                  name="shipMethod"
                                  value={o.id}
                                  checked={ship.selectedId === o.id}
                                  onChange={() => ship.setSelectedId(o.id)}
                                  style={{ accentColor: "var(--brand-orange)", width: 18, height: 18, margin: 0 }}
                                />
                                <label
                                  htmlFor={`ship-${o.id}`}
                                  style={{ margin: 0, cursor: "pointer", color: "#2C3C28", fontWeight: 500, flex: 1 }}
                                >
                                  {o.name}
                                </label>
                                <span style={{ fontWeight: 600, color: "#2C3C28" }}>
                                  {o.cost > 0 ? money(o.cost) : "Gratis"}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                  )}
                </div>

                {/* Payment */}
                <div className="rts-billing-details-area mt--30">
                  <h3 className="title">Método de pago</h3>
                  <div className="cottom-cart-right-area">
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {visiblePayments.map(({ value: opt }) => (
                        <li
                          key={opt}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 12,
                          }}
                        >
                          <input
                            type="radio"
                            id={`payment-${opt}`}
                            name="payment"
                            value={opt}
                            checked={payment === opt}
                            onChange={() => setPayment(opt)}
                            style={{
                              accentColor: "var(--brand-orange)",
                              width: 18,
                              height: 18,
                              margin: 0,
                            }}
                          />
                          <label
                            htmlFor={`payment-${opt}`}
                            style={{
                              margin: 0,
                              cursor: "pointer",
                              color: "#2C3C28",
                              fontWeight: 500,
                            }}
                          >
                            {opt}
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* ── RIGHT: order summary ── */}
              <div className="col-lg-4 order-1 order-xl-2">
                <h3 className="title-checkout">Resumen del pedido</h3>
                <div className="right-card-sidebar-checkout">
                  <div className="top-wrapper">
                    <div className="product">Productos</div>
                    <div className="price">Precio</div>
                  </div>

                  {lines.map(({ product, quantity }) => (
                    <div className="single-shop-list" key={product.id}>
                      <div className="left-area">
                        <Image
                          src={product.image}
                          alt={product.title}
                          width={48}
                          height={48}
                          sizes="48px"
                          style={{ objectFit: "contain" }}
                        />
                        <span className="title">
                          {product.title} × {quantity}
                        </span>
                      </div>
                      <span className="price">
                        {money(product.priceWeb * quantity)}
                      </span>
                    </div>
                  ))}

                  <div className="single-shop-list">
                    <div className="left-area">
                      <span>Subtotal</span>
                    </div>
                    <span className="price">{money(subtotal)}</span>
                  </div>

                  {coupon && discount > 0 && (
                    <div className="single-shop-list">
                      <div className="left-area">
                        <span>Descuento ({coupon.code})</span>
                      </div>
                      <span className="price">−{money(discount)}</span>
                    </div>
                  )}

                  {requiresShipping && delivery === "envio" && (
                    <div className="single-shop-list">
                      <div className="left-area">
                        <span>Envío{selectedShip ? ` (${selectedShip.name})` : ""}</span>
                      </div>
                      <span className="price">{selectedShip ? (shippingCost > 0 ? money(shippingCost) : "Gratis") : "A cotizar"}</span>
                    </div>
                  )}

                  {rate && taxAmount > 0 && (
                    <div className="single-shop-list">
                      <div className="left-area">
                        <span>{taxIncluded ? `${rate.name} incluido` : rate.name}</span>
                      </div>
                      <span className="price">{money(taxAmount)}</span>
                    </div>
                  )}

                  <div className="single-shop-list">
                    <div className="left-area">
                      <span style={{ fontWeight: 600, color: "#2C3C28" }}>
                        Total
                      </span>
                    </div>
                    <span
                      className="price"
                      style={{ color: "var(--brand-orange)", fontWeight: 700 }}
                    >
                      {money(grandTotal)}
                    </span>
                  </div>

                  <div className="cottom-cart-right-area mt--20">
                    <button
                      type="submit"
                      form="checkout-form"
                      disabled={submitting}
                      className="rts-btn btn-primary"
                      style={submitting ? { opacity: 0.6 } : undefined}
                    >
                      {submitting ? "Procesando..." : "Realizar pedido"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
