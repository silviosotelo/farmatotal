"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/components/providers/CartContext";

function RetornoContent() {
  const sp = useSearchParams();
  const router = useRouter();
  const { clear } = useCart();
  const orderId = sp.get("order");
  const cancelled = sp.get("cancel") === "1";
  const [msg, setMsg] = useState("Confirmando tu pago…");

  useEffect(() => {
    // Cancelado por el usuario en el vPOS → vuelve a la caja con el aviso.
    if (cancelled) {
      router.replace("/caja?pago=cancelado");
      return;
    }
    if (!orderId) {
      router.replace("/caja?pago=error");
      return;
    }
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    let done = false;

    // El veredicto autoritativo es el de la API (consulta activa a Bancard),
    // NO el status de la URL del iframe (puede llegar como fail aún aprobado).
    const poll = async () => {
      tries += 1;
      try {
        const r = await fetch(`/api/payments/bancard/status/${orderId}`);
        const d = (await r.json()) as { status?: string };
        if (d.status === "approved") {
          done = true;
          clear(); // pago confirmado → vaciar carrito y al comprobante
          router.replace("/pedido-recibido");
          return;
        }
        if (d.status === "rejected") {
          done = true;
          router.replace("/caja?pago=rechazado"); // carrito intacto → puede reintentar
          return;
        }
      } catch {
        /* reintenta */
      }
      if (done) return;
      // Sigue pendiente: reintenta unas veces; si no se confirma, vuelve a la caja.
      if (tries >= 6) {
        setMsg("No pudimos confirmar tu pago a tiempo. Te llevamos de vuelta a la caja…");
        timer = setTimeout(() => router.replace("/caja?pago=pendiente"), 1500);
        return;
      }
      timer = setTimeout(poll, 2000);
    };
    poll();
    return () => clearTimeout(timer);
  }, [orderId, cancelled, router, clear]);

  return <p className="py-16 text-center text-sm text-gray-500">{msg}</p>;
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
