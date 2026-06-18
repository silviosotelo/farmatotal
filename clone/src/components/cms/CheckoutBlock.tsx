"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/providers/CartContext";
import { useSucursal } from "@/components/sucursal/SucursalContext";
import { useToast } from "@/components/providers/ToastContext";
import { formatGs } from "@/lib/data";

type DeliveryMethod = "retiro" | "envio";
type PaymentMethod = "Tarjeta de crédito/débito (Bancard)" | "Efectivo en sucursal" | "Transferencia bancaria";

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
          branchId: shippingMethod === "pickup" ? selected?.branchId : undefined,
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
              <div className="flex flex-col gap-3">
                {(["retiro", "envio"] as const).map((opt) => (
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
            </section>

            <section className={SECTION_CLS}>
              <h3 className="font-heading text-lg text-brand-text mb-5">Método de pago</h3>
              <div className="flex flex-col gap-3">
                {(["Tarjeta de crédito/débito (Bancard)", "Efectivo en sucursal", "Transferencia bancaria"] as PaymentMethod[]).map((opt) => (
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
                      <p className="text-xs text-brand-muted mt-0.5">×{quantity}</p>
                    </div>
                    <p className="font-price text-xs text-brand-text whitespace-nowrap">{formatGs(product.priceWeb * quantity)}</p>
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
