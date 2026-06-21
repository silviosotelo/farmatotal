"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useMoney } from "@/components/providers/CurrencyContext";
import { useFlags } from "@/components/providers/FeatureFlagsContext";
import { formatQty } from "@/lib/units";

/**
 * Bloque funcional "Confirmación de pedido" del builder (estilo widget de
 * "order received" de Woo en Elementor): lee el id/número de la orden de la URL
 * (props del builder o query string) y trae la orden REAL del backend del tenant
 * (GET /orders/:id o /orders/by-number/:number) en vez de localStorage. La lógica
 * embebida; se coloca/posiciona desde el builder. Markup pixel-perfect.
 *
 * Es la versión data-bound (API) de app/(site)/pedido-recibido/page.tsx, que aún
 * lee de localStorage.
 */

// Cliente: la API pública (NEXT_PUBLIC). El backend resuelve el tenant por Host
// (multi-dominio) igual que el resto de hooks cliente (lib/checkout.ts).
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ── Forma de la orden tal cual la devuelve apps/api (GET /orders/:id) ─────────
type BackendOrderLine = {
  id: string;
  sku: string;
  title: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};
type BackendOrder = {
  id: string;
  number: string;
  currency: string;
  status: string;
  paymentMethod: "online" | "cash" | "transfer" | string;
  shippingMethod: "pickup" | "delivery" | string;
  shippingMethodName: string | null;
  subtotal: number;
  discount: number;
  shippingCost: number;
  taxTotal: number;
  taxRateName: string | null;
  taxRatePercent: number;
  total: number;
  couponCode: string | null;
  createdAt: string;
  lines: BackendOrderLine[];
};

// Etiquetas legibles (white-label: copy genérico, sin marca; los valores reales
// vienen del backend). El estado/medio de pago del backend → texto de UI.
const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  processing: "En proceso",
  fulfilled: "Preparado",
  delivered: "Entregado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};
const PAYMENT_LABELS: Record<string, string> = {
  online: "Tarjeta de crédito/débito",
  cash: "Efectivo",
  transfer: "Transferencia bancaria",
};

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 80 80"
      width="80"
      height="80"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="40" cy="40" r="38" fill="#27ae60" />
      <path
        d="M22 41 L34 53 L58 27"
        stroke="white"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Lee la referencia de la orden de la query string (cliente). Soporta `id` y
 * `order` (UUID → /orders/:id) y `number` (→ /orders/by-number/:number), que son
 * las convenciones ya usadas en el storefront (checkout y /pago/retorno?order=). */
function refFromQuery(): { id?: string; number?: string } {
  if (typeof window === "undefined") return {};
  const q = new URLSearchParams(window.location.search);
  return {
    id: q.get("id") || q.get("order") || undefined,
    number: q.get("number") || undefined,
  };
}

type LoadState =
  | { kind: "loading" }
  | { kind: "found"; order: BackendOrder }
  | { kind: "notfound" };

export function OrderConfirmationBlock({
  orderId,
  orderNumber,
  title = "¡Gracias por tu compra!",
  subtitle = "Tu pedido fue recibido y está siendo procesado.",
  catalogHref = "/catalogo",
  accountHref = "/mi-cuenta",
}: {
  /** Id (UUID) de la orden; si no se pasa, se lee de la query (`id`/`order`). */
  orderId?: string;
  /** Número de la orden; si no se pasa, se lee de la query (`number`). */
  orderNumber?: string;
  title?: string;
  subtitle?: string;
  catalogHref?: string;
  accountHref?: string;
} = {}) {
  const money = useMoney();
  const flags = useFlags();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  // Locale del tenant para la fecha (sin hardcodear es-PY).
  const locale =
    typeof navigator !== "undefined" && navigator.language ? navigator.language : "es-PY";

  useEffect(() => {
    let alive = true;
    const fromQuery = refFromQuery();
    const id = orderId || fromQuery.id;
    const number = orderNumber || fromQuery.number;

    if (!id && !number) {
      setState({ kind: "notfound" });
      return;
    }

    setState({ kind: "loading" });
    const path = id
      ? `/orders/${encodeURIComponent(id)}`
      : `/orders/by-number/${encodeURIComponent(number!)}`;

    fetch(`${API}${path}`, { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? (r.json() as Promise<BackendOrder>) : null))
      .then((d) => {
        if (!alive) return;
        setState(d && d.id ? { kind: "found", order: d } : { kind: "notfound" });
      })
      .catch(() => {
        if (alive) setState({ kind: "notfound" });
      });

    return () => {
      alive = false;
    };
  }, [orderId, orderNumber]);

  if (state.kind === "loading") {
    return (
      <div className="ft-container py-20 text-center">
        <p className="text-brand-muted text-sm">Cargando tu pedido…</p>
      </div>
    );
  }

  /* ── Fallback elegante: sin orden ── */
  if (state.kind === "notfound") {
    return (
      <div className="ft-container py-20 flex flex-col items-center gap-6 text-center">
        <p className="text-brand-muted text-lg">No encontramos tu pedido.</p>
        <Link
          href={catalogHref}
          className="brand-gradient focus-ring text-white rounded-[30px] h-11 px-6 text-sm font-semibold flex items-center justify-center"
        >
          Ver catálogo
        </Link>
      </div>
    );
  }

  /* ── Éxito ── */
  const { order } = state;
  const statusLabel = STATUS_LABELS[order.status] ?? order.status;
  const paymentLabel = PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod;
  // El bloque de retiro en sucursal solo aplica si el tenant tiene sucursales.
  const isPickup = flags.branches && order.shippingMethod === "pickup";

  return (
    <>
      <Breadcrumbs items={[{ label: "Pedido recibido" }]} />

      <div className="ft-container py-10 max-w-2xl">
        {/* Encabezado */}
        <div className="flex flex-col items-center text-center gap-4 mb-8">
          <CheckIcon />
          <h1 className="font-heading text-2xl text-brand-text">{title}</h1>
          <p className="text-brand-muted text-sm">{subtitle}</p>
        </div>

        {/* Metadatos de la orden */}
        <div className="rounded-xl border border-[#ededf1] bg-white p-6 mb-6">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-brand-muted mb-0.5">Número de pedido</dt>
              <dd className="font-semibold text-brand-text">{order.number}</dd>
            </div>
            <div>
              <dt className="text-brand-muted mb-0.5">Fecha</dt>
              <dd className="font-semibold text-brand-text">{formatDate(order.createdAt, locale)}</dd>
            </div>
            <div>
              <dt className="text-brand-muted mb-0.5">Estado</dt>
              <dd className="font-semibold text-brand-text">{statusLabel}</dd>
            </div>
            {paymentLabel && (
              <div>
                <dt className="text-brand-muted mb-0.5">Método de pago</dt>
                <dd className="font-semibold text-brand-text">{paymentLabel}</dd>
              </div>
            )}
            <div>
              <dt className="text-brand-muted mb-0.5">Entrega</dt>
              <dd className="font-semibold text-brand-text">
                {isPickup
                  ? "Retiro en sucursal"
                  : order.shippingMethodName || "Envío a domicilio"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Tabla de líneas */}
        <div className="rounded-xl border border-[#ededf1] bg-white overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-[#f8f8f8] border-b border-[#ededf1]">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-brand-muted uppercase tracking-wide text-xs">
                  Producto
                </th>
                <th className="text-center px-4 py-3 font-semibold text-brand-muted uppercase tracking-wide text-xs">
                  Cant.
                </th>
                <th className="text-right px-4 py-3 font-semibold text-brand-muted uppercase tracking-wide text-xs">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ededf1]">
              {order.lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-4 py-3">
                    <p className="text-brand-text leading-snug">{line.title}</p>
                    {line.sku && (
                      <p className="text-xs text-brand-muted mt-0.5">SKU: {line.sku}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-brand-text">
                    {formatQty(line.quantity)}
                  </td>
                  <td className="px-4 py-3 text-right font-price text-brand-text whitespace-nowrap">
                    {money(line.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-[#ededf1] bg-[#f8f8f8]">
              {order.discount > 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-2 text-right text-brand-muted">
                    Subtotal
                  </td>
                  <td className="px-4 py-2 text-right font-price text-brand-text whitespace-nowrap">
                    {money(order.subtotal)}
                  </td>
                </tr>
              )}
              {order.discount > 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-2 text-right text-[#c0392b]">
                    Descuento{order.couponCode ? ` (${order.couponCode})` : ""}
                  </td>
                  <td className="px-4 py-2 text-right font-price text-[#c0392b] whitespace-nowrap">
                    −{money(order.discount)}
                  </td>
                </tr>
              )}
              {order.shippingCost > 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-2 text-right text-brand-muted">
                    Envío{order.shippingMethodName ? ` (${order.shippingMethodName})` : ""}
                  </td>
                  <td className="px-4 py-2 text-right font-price text-brand-text whitespace-nowrap">
                    {money(order.shippingCost)}
                  </td>
                </tr>
              )}
              {order.taxTotal > 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-2 text-right text-brand-muted">
                    {order.taxRateName || "Impuesto"}
                  </td>
                  <td className="px-4 py-2 text-right font-price text-brand-text whitespace-nowrap">
                    {money(order.taxTotal)}
                  </td>
                </tr>
              )}
              <tr>
                <td colSpan={2} className="px-4 py-3 text-right font-semibold text-brand-text">
                  Total
                </td>
                <td className="px-4 py-3 text-right font-price text-brand-orange font-bold text-base whitespace-nowrap">
                  {money(order.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={catalogHref}
            className="brand-gradient focus-ring text-white rounded-[30px] h-11 px-6 text-sm font-semibold flex items-center justify-center flex-1"
          >
            Seguir comprando
          </Link>
          <Link
            href={accountHref}
            className="focus-ring text-brand-text border border-[#ededf1] rounded-[30px] h-11 px-6 text-sm font-semibold flex items-center justify-center flex-1 hover:border-brand-orange hover:text-brand-orange transition-colors"
          >
            Ver mis pedidos
          </Link>
        </div>
      </div>
    </>
  );
}
