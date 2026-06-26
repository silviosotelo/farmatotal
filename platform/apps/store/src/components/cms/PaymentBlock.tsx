"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useMoney } from "@/components/providers/CurrencyContext";

const CONTAINER_ID = "bancard-iframe-container";

/** Carga el JS de Bancard una sola vez y resuelve cuando window.Bancard está disponible. */
function loadBancardScript(jsUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Bancard) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[data-bancard="1"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("No se pudo cargar Bancard")));
      return;
    }
    const s = document.createElement("script");
    s.src = jsUrl;
    s.async = true;
    s.dataset.bancard = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("No se pudo cargar Bancard"));
    document.body.appendChild(s);
  });
}

/** Color de marca (token CSS) para estilar el formulario de Bancard, sin hardcodear. */
function brandHex(): string | null {
  if (typeof window === "undefined") return null;
  const v = getComputedStyle(document.documentElement).getPropertyValue("--brand-orange").trim();
  return /^#?[0-9a-fA-F]{3,8}$/.test(v) ? (v.startsWith("#") ? v : `#${v}`) : null;
}

type State =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "unavailable"; message: string }
  | { kind: "error"; message: string };

export type PaymentBlockProps = {
  /** Orden a pagar. Si se omite, se toma de la ruta (/pago/[id]). */
  orderId?: string;
  /** Monto a pagar (opcional). Si se provee, se muestra formateado con la moneda del tenant. */
  amount?: number;
  /** Copia configurable del encabezado. */
  title?: string;
  subtitle?: string;
  /** Destino del botón cuando el pago no está disponible / falla. */
  returnHref?: string;
  returnLabel?: string;
};

/**
 * Bloque funcional "Pago" del builder (estilo widget de pasarela de Woo en
 * Elementor): monta el iframe oficial de Bancard (vPOS 4.0) vía SDK. Reusa el
 * flujo de /pago/[id]: pide processId+jsUrl al BFF (/api/payments/bancard/create
 * → POST /payments/bancard/create del API) y renderiza el formulario con
 * Bancard.Checkout.createForm. Al finalizar, Bancard redirige a la returnUrl
 * configurada en el backend. Data-bound, white-label (color de marca por token).
 */
export function PaymentBlock({
  orderId: orderIdProp,
  amount,
  title = "Pago con tarjeta",
  subtitle = "Procesado de forma segura por Bancard.",
  returnHref = "/pedido-recibido",
  returnLabel = "Ver mi pedido",
}: PaymentBlockProps = {}) {
  const money = useMoney();
  const params = useParams<{ id: string }>();
  const orderId = orderIdProp ?? params?.id;
  const [state, setState] = useState<State>({ kind: "loading" });
  const mounted = useRef(false);

  useEffect(() => {
    if (!orderId || mounted.current) return;
    mounted.current = true;

    (async () => {
      let res: Response;
      try {
        res = await fetch("/api/payments/bancard/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
      } catch {
        setState({ kind: "error", message: "No se pudo conectar con el servidor de pagos." });
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (res.status === 503) {
        setState({
          kind: "unavailable",
          message:
            "El pago con tarjeta no está disponible en este momento. Tu pedido quedó registrado y nos pondremos en contacto para coordinar el pago.",
        });
        return;
      }
      if (!res.ok || !data.processId || !data.jsUrl) {
        setState({ kind: "error", message: data.error ?? "No se pudo iniciar el pago." });
        return;
      }

      try {
        await loadBancardScript(data.jsUrl);
        if (!window.Bancard) throw new Error("Bancard no disponible");
        const hex = brandHex();
        const options = hex
          ? { styles: { "header-background-color": hex, "button-background-color": hex } }
          : undefined;
        window.Bancard.Checkout.createForm(CONTAINER_ID, data.processId, options);
        setState({ kind: "ready" });
      } catch {
        setState({ kind: "error", message: "No se pudo cargar el formulario de pago." });
      }
    })();
  }, [orderId]);

  return (
    <div className="ft-container py-10">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="mb-2 text-center font-heading text-2xl text-brand-text">{title}</h1>
        <p className="mb-2 text-center text-sm text-brand-muted">{subtitle}</p>

        {typeof amount === "number" && (
          <p className="mb-8 text-center">
            <span className="text-sm text-brand-muted">Total a pagar: </span>
            <span className="font-price text-xl font-bold text-brand-orange">{money(amount)}</span>
          </p>
        )}

        {!orderId && (
          <p className="py-16 text-center text-sm text-brand-muted">
            No se encontró el pedido a pagar.
          </p>
        )}

        {orderId && state.kind === "loading" && (
          <p className="py-16 text-center text-sm text-brand-muted">Iniciando el pago…</p>
        )}

        {(state.kind === "unavailable" || state.kind === "error") && (
          <div className="rounded-xl border border-[#ededf1] bg-white p-8 text-center">
            <p className="mb-6 text-sm text-brand-text">{state.message}</p>
            <Link
              href={returnHref}
              className="brand-gradient focus-ring inline-flex h-11 items-center justify-center rounded-full px-8 text-sm font-semibold text-white"
            >
              {returnLabel}
            </Link>
          </div>
        )}

        {/* Contenedor donde Bancard inyecta el iframe del formulario. */}
        <div id={CONTAINER_ID} className={state.kind === "ready" ? "min-h-[520px]" : "hidden"} />
      </div>
    </div>
  );
}
