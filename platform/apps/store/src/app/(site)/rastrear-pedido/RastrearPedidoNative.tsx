"use client";

import { useState } from "react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useToast } from "@/components/providers/ToastContext";
import { formatMoney } from "@/lib/money";
import { useCurrency } from "@/components/providers/CurrencyContext";
import { formatQty } from "@/lib/units";
import { cn } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const STEPS = ["Recibido", "En preparación", "Listo / En camino", "Entregado"];
// Estado del backend → índice del stepper.
const STATUS_STEP: Record<string, number> = {
  pending: 0,
  paid: 1,
  processing: 1,
  fulfilled: 2,
  delivered: 3,
};
const inputClass =
  "w-full bg-search-bg rounded-md h-11 px-3 text-sm outline-none border border-transparent focus-visible:ring-2 focus-visible:ring-brand-orange/40";

type TrackedOrder = {
  number: string;
  status: string;
  total: number;
  currency?: string;
  customerEmail?: string | null;
  createdAt?: string;
  lines?: { title: string; quantity: number }[];
};

/**
 * Fallback nativo de /rastrear-pedido cuando el documento del builder
 * ("rastrear-pedido") no está publicado. Mismo wiring de API que
 * OrderTrackingBlock: GET /orders/by-number/:n con reintento a /orders/:id.
 */
export default function RastrearPedidoNative() {
  const { toast } = useToast();
  // Orden histórica: se formatea con la moneda guardada de la orden (order.currency),
  // nunca con la moneda viva del store. El locale sí es el del tenant.
  const { locale } = useCurrency();
  const [nro, setNro] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = nro.trim();
    if (!n) return toast("Ingresá el número de pedido", "error");
    setLoading(true);
    setOrder(null);
    try {
      // Búsqueda por número; si no aparece, reintenta por id (GET /orders/:id).
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
      // Privacidad: si ingresó correo, debe coincidir con el del pedido.
      if (email.trim() && o.customerEmail && o.customerEmail.toLowerCase() !== email.trim().toLowerCase()) {
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

  return (
    <main className="flex-1">
      <Breadcrumbs items={[{ label: "¿Donde está mi pedido?" }]} />
      <div className="ft-container max-w-2xl py-8">
        <h1 className="mb-2 font-heading text-2xl font-bold text-brand-text">¿Dónde está mi pedido?</h1>
        <p className="mb-6 text-sm text-brand-muted">Ingresá el número de pedido y el correo con el que compraste.</p>

        <form onSubmit={submit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="t-nro" className="mb-1 block text-sm text-brand-text">N° de pedido *</label>
            <input id="t-nro" placeholder="Ej. 000123" value={nro} onChange={(e) => setNro(e.target.value)} className={inputClass} />
          </div>
          <div className="flex-1">
            <label htmlFor="t-email" className="mb-1 block text-sm text-brand-text">Correo</label>
            <input id="t-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>
          <button type="submit" disabled={loading} className="brand-gradient focus-ring h-[44px] shrink-0 rounded-[30px] px-8 text-sm font-semibold text-white disabled:opacity-60">
            {loading ? "Buscando…" : "Rastrear"}
          </button>
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
              <span className="font-price text-sm font-semibold text-brand-text">{formatMoney(order.total, { currency: order.currency ?? "PYG", locale })}</span>
            </div>

            {cancelled ? (
              <p className="rounded-md bg-[#fdecea] px-4 py-3 text-sm font-medium text-[#c0392b]">
                Este pedido figura como {order.status === "refunded" ? "reembolsado" : "cancelado"}.
              </p>
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
                        <span className={cn("h-1 flex-1", i < activeStep ? "bg-brand-orange" : "bg-[#ededf1]")} />
                      )}
                    </div>
                    <span className={cn("mt-2 text-xs", i <= activeStep ? "text-brand-text" : "text-brand-muted")}>{s}</span>
                  </li>
                ))}
              </ol>
            )}

            {order.lines && order.lines.length > 0 && (
              <ul className="mt-6 space-y-1 border-t border-[#ededf1] pt-4 text-sm text-brand-muted">
                {order.lines.map((l, i) => (
                  <li key={i}>
                    {formatQty(l.quantity)}× {l.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
