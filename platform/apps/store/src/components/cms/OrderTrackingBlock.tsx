"use client";

import { useState } from "react";
import { Input, Button, Alert } from "@platform/ui";
import { useToast } from "@/components/providers/ToastContext";
import { useCurrency } from "@/components/providers/CurrencyContext";
import { useFlags } from "@/components/providers/FeatureFlagsContext";
import { formatMoney } from "@/lib/money";
import { formatQty } from "@/lib/units";
import { cn } from "@/lib/utils";

/**
 * Bloque funcional "Seguimiento de pedido" del builder (estilo widget de
 * Order Tracking de Woo en Elementor): input de número de pedido + lógica real
 * (GET /orders/by-number/:n) embebida; se coloca/posiciona desde el builder.
 */

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const STEPS = ["Recibido", "En preparación", "Listo / En camino", "Entregado"];
const STATUS_STEP: Record<string, number> = {
  pending: 0,
  paid: 1,
  processing: 1,
  fulfilled: 2,
  delivered: 3,
};

type TrackedLine = {
  id?: string;
  sku: string;
  title: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

type TrackedOrder = {
  id?: string;
  number: string;
  status: string;
  total: number;
  currency?: string;
  customerEmail?: string | null;
  shippingMethod?: string;
  shippingMethodName?: string | null;
  createdAt?: string;
  lines?: TrackedLine[];
};

export function OrderTrackingBlock({
  title = "¿Dónde está mi pedido?",
  subtitle = "Ingresá el número de pedido y el correo con el que compraste.",
  requireEmail = false,
  showItems = true,
}: {
  title?: string;
  subtitle?: string;
  requireEmail?: boolean;
  showItems?: boolean;
} = {}) {
  const { currency, locale } = useCurrency();
  const flags = useFlags();
  const { toast } = useToast();

  const [nro, setNro] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = nro.trim();
    if (!n) {
      toast("Ingresá el número de pedido", "error");
      return;
    }
    if (requireEmail && !email.trim()) {
      toast("Ingresá el correo con el que compraste", "error");
      return;
    }
    setLoading(true);
    setOrder(null);
    try {
      let r = await fetch(`${API}/orders/by-number/${encodeURIComponent(n)}`);
      if (r.status === 404) {
        r = await fetch(`${API}/orders/${encodeURIComponent(n)}`);
      }
      if (!r.ok) {
        toast("No encontramos un pedido con ese número", "error");
        setLoading(false);
        return;
      }
      const o = (await r.json()) as TrackedOrder;
      if (
        email.trim() &&
        o.customerEmail &&
        o.customerEmail.toLowerCase() !== email.trim().toLowerCase()
      ) {
        toast("El correo no coincide con el pedido", "error");
        setLoading(false);
        return;
      }
      setOrder(o);
    } catch {
      toast("Error de conexión. Intentá de nuevo.", "error");
    }
    setLoading(false);
  }

  const cancelled = order ? order.status === "cancelled" || order.status === "refunded" : false;
  const activeStep = order ? (STATUS_STEP[order.status] ?? 0) : 0;
  const isPickup = order?.shippingMethod === "pickup";
  const money = (v: number) => formatMoney(v, { currency: order?.currency ?? currency, locale });

  return (
    <div className="ft-container max-w-2xl py-8">
      <h2 className="mb-2 font-heading text-2xl font-bold text-brand-text">{title}</h2>
      <p className="mb-6 text-sm text-brand-muted">{subtitle}</p>

      <form onSubmit={submit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="ot-nro" className="mb-1 block text-sm text-brand-text">
            N° de pedido <span className="text-[#c0392b]">*</span>
          </label>
          <Input
            id="ot-nro"
            value={nro}
            onChange={(e) => setNro(e.target.value)}
            placeholder="Ej. 000123"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="ot-email" className="mb-1 block text-sm text-brand-text">
            Correo {requireEmail && <span className="text-[#c0392b]">*</span>}
          </label>
          <Input
            id="ot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
          />
        </div>
        <Button
          type="submit"
          variant="solid"
          shape="round"
          loading={loading}
          disabled={loading}
          className="brand-gradient h-[44px] shrink-0 px-8"
        >
          {loading ? "Buscando…" : "Rastrear"}
        </Button>
      </form>

      {order && (
        <div className="mt-8 rounded-[10px] border border-[#ededf1] p-6">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm">
              Pedido <span className="font-bold text-brand-text">{order.number}</span>
              {!cancelled && (
                <>
                  {" — "}
                  <span className="font-medium text-brand-orange-ink">{STEPS[activeStep]}</span>
                </>
              )}
            </p>
            <span className="font-price text-sm font-semibold text-brand-text">
              {money(order.total)}
            </span>
          </div>

          {flags.branches && isPickup && (
            <p className="mb-4 text-sm text-brand-muted">
              Retiro en sucursal
              {order.shippingMethodName ? ` — ${order.shippingMethodName}` : ""}
            </p>
          )}

          {cancelled ? (
            <Alert type="danger" showIcon>
              Este pedido figura como{" "}
              {order.status === "refunded" ? "reembolsado" : "cancelado"}.
            </Alert>
          ) : (
            <ol className="flex items-center">
              {STEPS.map((s, i) => (
                <li key={s} className="flex flex-1 flex-col items-center text-center last:flex-none">
                  <div className="flex w-full items-center">
                    <span
                      className={cn(
                        "z-10 flex size-8 items-center justify-center rounded-full text-xs font-bold",
                        i <= activeStep ? "bg-brand-orange text-white" : "bg-search-bg text-brand-muted",
                      )}
                    >
                      {i < activeStep ? "✓" : i + 1}
                    </span>
                    {i < STEPS.length - 1 && (
                      <span
                        className={cn("h-1 flex-1", i < activeStep ? "bg-brand-orange" : "bg-[#ededf1]")}
                      />
                    )}
                  </div>
                  <span
                    className={cn("mt-2 text-xs", i <= activeStep ? "text-brand-text" : "text-brand-muted")}
                  >
                    {s}
                  </span>
                </li>
              ))}
            </ol>
          )}

          {showItems && order.lines && order.lines.length > 0 && (
            <ul className="mt-6 space-y-2 border-t border-[#ededf1] pt-4 text-sm">
              {order.lines.map((l, i) => (
                <li key={l.id ?? i} className="flex items-baseline justify-between gap-3">
                  <span className="text-brand-muted">
                    {formatQty(l.quantity)}× {l.title}
                  </span>
                  <span className="font-price whitespace-nowrap text-brand-text">
                    {money(l.lineTotal)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
