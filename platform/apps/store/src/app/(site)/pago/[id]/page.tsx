"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const CONTAINER_ID = "bancard-iframe-container";

declare global {
  interface Window {
    Bancard?: {
      Checkout: {
        createForm: (
          containerId: string,
          processId: string,
          options?: Record<string, unknown>,
        ) => void;
      };
    };
  }
}

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

type State =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "unavailable"; message: string }
  | { kind: "error"; message: string };

/**
 * Pasarela de pago Bancard (vPOS 4.0) — monta el iframe oficial vía SDK.
 * Pide processId+jsUrl al backend (/api/payments/bancard/create) y renderiza el
 * formulario con Bancard.Checkout.createForm. Al finalizar, Bancard redirige a la
 * returnUrl configurada en el backend (/pago/retorno?order=<id>).
 */
export default function PagoPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id;
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
        window.Bancard.Checkout.createForm(CONTAINER_ID, data.processId, {
          styles: { "header-background-color": "#ee6c1e", "button-background-color": "#ee6c1e" },
        });
        setState({ kind: "ready" });
      } catch {
        setState({ kind: "error", message: "No se pudo cargar el formulario de pago." });
      }
    })();
  }, [orderId]);

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <h1 className="mb-2 text-center text-2xl font-bold">Pago con tarjeta</h1>
        <p className="mb-8 text-center text-sm text-gray-500">Procesado de forma segura por Bancard.</p>

        {state.kind === "loading" && (
          <p className="py-16 text-center text-sm text-gray-500">Iniciando el pago…</p>
        )}

        {(state.kind === "unavailable" || state.kind === "error") && (
          <div className="rounded-xl border border-gray-200 p-8 text-center">
            <p className="mb-6 text-sm text-gray-700">{state.message}</p>
            <Link
              href="/pedido-recibido"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#ee6c1e] px-8 text-sm font-semibold text-white"
            >
              Ver mi pedido
            </Link>
          </div>
        )}

        {/* Contenedor donde Bancard inyecta el iframe del formulario. */}
        <div
          id={CONTAINER_ID}
          className={state.kind === "ready" ? "min-h-[520px]" : "hidden"}
        />
      </div>
    </main>
  );
}
