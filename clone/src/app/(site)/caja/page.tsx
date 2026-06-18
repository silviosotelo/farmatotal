"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useCart } from "@/components/providers/CartContext";
import { useSucursal } from "@/components/sucursal/SucursalContext";
import { useToast } from "@/components/providers/ToastContext";
import { formatGs } from "@/lib/data";
import type { Order } from "@/types";
import { useTheme } from "@/themes/ThemeProvider";
import { EkomartCheckout } from "@/themes/ekomart/pages/EkomartCheckout";
import { AnvogueCheckout } from "@/themes/anvogue/pages/AnvogueCheckout";

type DeliveryMethod = "retiro" | "envio";
type PaymentMethod = "Tarjeta de crédito/débito (Bancard)" | "Efectivo en sucursal" | "Transferencia bancaria";

const INPUT_CLS =
  "w-full bg-search-bg rounded-md h-11 px-3 text-sm outline-none border border-transparent focus-visible:ring-2 focus-visible:ring-brand-orange/40 text-brand-text placeholder:text-brand-muted";

const LABEL_CLS = "block text-sm font-medium text-brand-text mb-1";

const SECTION_CLS = "rounded-xl border border-[#ededf1] bg-white p-6";

export default function CajaPage() {
  const theme = useTheme();
  const router = useRouter();
  const { lines, subtotal, coupon, discount, total, clear } = useCart();
  const { selected, open } = useSucursal();
  const { toast } = useToast();

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [direccion, setDireccion] = useState("");
  const [delivery, setDelivery] = useState<DeliveryMethod>("retiro");
  const [payment, setPayment] = useState<PaymentMethod>("Tarjeta de crédito/débito (Bancard)");
  const [submitting, setSubmitting] = useState(false);

  // Checkout tematizado por tema activo (farmatotal = base inline más abajo).
  if (theme === "ekomart") return <EkomartCheckout />;
  if (theme === "anvogue") return <AnvogueCheckout />;

  /* ── Empty cart ── */
  if (lines.length === 0) {
    return (
      <main className="flex-1">
        <div className="ft-container py-20 flex flex-col items-center gap-6 text-center">
          <p className="text-brand-muted text-lg">Tu carrito está vacío.</p>
          <Link
            href="/catalogo"
            className="brand-gradient focus-ring text-white rounded-[30px] h-11 px-6 text-sm font-semibold flex items-center justify-center"
          >
            Ver catálogo
          </Link>
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
      const paymentMethod = payment === "Tarjeta de crédito/débito (Bancard)" ? "online" : "contraentrega";
      const shippingMethod = delivery === "retiro" ? "pickup" : "delivery";

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
          branchId: shippingMethod === "pickup" ? selected?.id : undefined,
          billing: {
            name: `${nombre} ${apellido}`.trim(),
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

      // 2. If online payment, initiate Bancard
      if (paymentMethod === "online") {
        const payRes = await fetch("/api/payments/bancard/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.id }),
        });

        if (payRes.ok) {
          const payData = await payRes.json();
          // Redirect to Bancard checkout
          window.location.href = payData.checkoutUrl;
          return;
        }
        // If Bancard fails, order is still created as PENDING
      }

      // 3. Save to localStorage for "pedido-recibido" page
      try {
        localStorage.setItem("ft_last_order_v1", JSON.stringify({
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
        }));
      } catch { /* ignore */ }

      clear();
      router.push("/pedido-recibido");
    } catch {
      toast("Error de conexión. Intentá de nuevo.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1">
      <Breadcrumbs items={[{ label: "Finalizar compra" }]} />

      <div className="ft-container py-8">
        <h1 className="font-heading text-2xl text-brand-text mb-6">Finalizar compra</h1>

        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col lg:flex-row gap-8">
            {/* ── LEFT: forms ── */}
            <div className="flex-1 min-w-0 flex flex-col gap-6">

              {/* Billing data */}
              <section className={SECTION_CLS}>
                <h2 className="font-heading text-lg text-brand-text mb-5">Datos de facturación</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="nombre" className={LABEL_CLS}>Nombre <span className="text-[#c0392b]">*</span></label>
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
                    <label htmlFor="apellido" className={LABEL_CLS}>Apellido</label>
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
                    <label htmlFor="email" className={LABEL_CLS}>Email <span className="text-[#c0392b]">*</span></label>
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
                    <label htmlFor="telefono" className={LABEL_CLS}>Teléfono</label>
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
                  <div>
                    <label htmlFor="ciudad" className={LABEL_CLS}>Ciudad</label>
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
                    <label htmlFor="direccion" className={LABEL_CLS}>Dirección</label>
                    <input
                      id="direccion"
                      type="text"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      placeholder="Av. Mariscal López 1234"
                      className={INPUT_CLS}
                    />
                  </div>
                </div>
              </section>

              {/* Delivery */}
              <section className={SECTION_CLS}>
                <h2 className="font-heading text-lg text-brand-text mb-5">Entrega</h2>
                <div className="flex flex-col gap-3">
                  {(["retiro", "envio"] as const).map((opt) => (
                    <label
                      key={opt}
                      className={
                        "flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors " +
                        (delivery === opt
                          ? "border-brand-orange bg-[#fff4ec]"
                          : "border-[#ededf1] hover:border-brand-orange/40")
                      }
                    >
                      <input
                        type="radio"
                        name="delivery"
                        value={opt}
                        checked={delivery === opt}
                        onChange={() => setDelivery(opt)}
                        className="accent-brand-orange"
                      />
                      <span className="text-sm font-medium text-brand-text">
                        {opt === "retiro" ? "Retiro en sucursal" : "Envío a domicilio"}
                      </span>
                    </label>
                  ))}
                </div>

                {delivery === "retiro" && (
                  <div className="mt-4 flex items-center gap-3">
                    {selected ? (
                      <>
                        <span className="text-sm text-brand-text">
                          <span className="font-semibold">{selected.name}</span>
                          {selected.address && (
                            <span className="text-brand-muted"> — {selected.address}</span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={open}
                          className="text-xs text-brand-orange underline hover:opacity-80 transition-opacity"
                        >
                          Cambiar
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={open}
                        className="text-sm font-semibold text-brand-orange border border-brand-orange rounded-[30px] h-9 px-5 hover:bg-[#fff4ec] transition-colors focus-ring"
                      >
                        Seleccionar sucursal
                      </button>
                    )}
                  </div>
                )}
              </section>

              {/* Payment */}
              <section className={SECTION_CLS}>
                <h2 className="font-heading text-lg text-brand-text mb-5">Método de pago</h2>
                <div className="flex flex-col gap-3">
                  {(
                    [
                      "Tarjeta de crédito/débito (Bancard)",
                      "Efectivo en sucursal",
                      "Transferencia bancaria",
                    ] as PaymentMethod[]
                  ).map((opt) => (
                    <label
                      key={opt}
                      className={
                        "flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors " +
                        (payment === opt
                          ? "border-brand-orange bg-[#fff4ec]"
                          : "border-[#ededf1] hover:border-brand-orange/40")
                      }
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={opt}
                        checked={payment === opt}
                        onChange={() => setPayment(opt)}
                        className="accent-brand-orange"
                      />
                      <span className="text-sm font-medium text-brand-text">{opt}</span>
                    </label>
                  ))}
                </div>
              </section>
            </div>

            {/* ── RIGHT: order summary ── */}
            <aside className="lg:w-80 flex-none">
              <div className="border border-[#ededf1] rounded-xl p-6 bg-white sticky top-24">
                <h2 className="font-heading text-lg text-brand-text mb-5">Resumen del pedido</h2>

                <ul className="divide-y divide-[#ededf1] mb-5">
                  {lines.map(({ product, quantity }) => (
                    <li key={product.id} className="py-3 flex items-center gap-3">
                      <div className="relative size-12 flex-none border border-[#ededf1] rounded-md overflow-hidden bg-white">
                        <Image
                          src={product.image}
                          alt={product.title}
                          fill
                          sizes="48px"
                          className="object-contain p-0.5"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-brand-text line-clamp-2">{product.title}</p>
                        <p className="text-xs text-brand-muted mt-0.5">×{quantity}</p>
                      </div>
                      <p className="font-price text-xs text-brand-text whitespace-nowrap">
                        {formatGs(product.priceWeb * quantity)}
                      </p>
                    </li>
                  ))}
                </ul>

                <dl className="space-y-3 text-sm border-t border-[#ededf1] pt-4">
                  <div className="flex justify-between">
                    <dt className="text-brand-muted">Subtotal</dt>
                    <dd className="font-price text-brand-text">{formatGs(subtotal)}</dd>
                  </div>

                  {coupon && discount > 0 && (
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

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-6 w-full brand-gradient focus-ring text-white rounded-[30px] h-11 px-6 text-sm font-semibold flex items-center justify-center disabled:opacity-60"
                >
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
