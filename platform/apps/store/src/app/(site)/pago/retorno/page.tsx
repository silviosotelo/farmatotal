"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Result = "checking" | "approved" | "rejected" | "pending" | "cancelled";

const COPY: Record<Exclude<Result, "checking">, { title: string; text: string }> = {
  approved: {
    title: "¡Pago aprobado!",
    text: "Tu pago se procesó correctamente. Estamos preparando tu pedido.",
  },
  rejected: {
    title: "Pago rechazado",
    text: "No pudimos procesar tu pago. Podés intentar nuevamente con otra tarjeta.",
  },
  pending: {
    title: "Estamos confirmando tu pago",
    text: "Tu pago está siendo verificado. Te avisaremos apenas se confirme.",
  },
  cancelled: {
    title: "Pago cancelado",
    text: "Cancelaste el pago. Tu pedido quedó registrado y podés reintentarlo cuando quieras.",
  },
};

function RetornoContent() {
  const sp = useSearchParams();
  const orderId = sp.get("order");
  const cancelled = sp.get("cancel") === "1";
  const [result, setResult] = useState<Result>(cancelled ? "cancelled" : "checking");

  useEffect(() => {
    if (cancelled || !orderId) return;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      tries += 1;
      try {
        const r = await fetch(`/api/payments/bancard/status/${orderId}`);
        const d = (await r.json()) as { status?: string };
        if (d.status === "approved") return setResult("approved");
        if (d.status === "rejected") return setResult("rejected");
      } catch {
        /* reintenta */
      }
      // Aún pendiente: reintenta hasta 5 veces, luego marca "pending".
      if (tries >= 5) return setResult("pending");
      timer = setTimeout(poll, 2000);
    };
    poll();
    return () => clearTimeout(timer);
  }, [orderId, cancelled]);

  if (result === "checking") {
    return <p className="py-16 text-center text-sm text-gray-500">Confirmando tu pago…</p>;
  }

  const { title, text } = COPY[result];
  return (
    <div className="rounded-xl border border-gray-200 p-8 text-center">
      <h1 className="mb-3 text-2xl font-bold">{title}</h1>
      <p className="mb-6 text-sm text-gray-700">{text}</p>
      <div className="flex flex-wrap justify-center gap-3">
        {result === "rejected" && orderId && (
          <Link
            href={`/pago/${orderId}`}
            className="inline-flex h-11 items-center justify-center rounded-full border border-[#ee6c1e] px-6 text-sm font-semibold text-[#ee6c1e]"
          >
            Reintentar pago
          </Link>
        )}
        <Link
          href="/pedido-recibido"
          className="inline-flex h-11 items-center justify-center rounded-full bg-[#ee6c1e] px-8 text-sm font-semibold text-white"
        >
          Ver mi pedido
        </Link>
      </div>
    </div>
  );
}

export default function PagoRetornoPage() {
  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <Suspense fallback={<p className="py-16 text-center text-sm text-gray-500">Cargando…</p>}>
          <RetornoContent />
        </Suspense>
      </div>
    </main>
  );
}
