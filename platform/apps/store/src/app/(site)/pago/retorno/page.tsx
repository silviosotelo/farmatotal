"use client"

import { Suspense, useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useCart } from "@/components/providers/CartContext"
import { useMoney } from "@/components/providers/CurrencyContext"
import { Breadcrumbs } from "@/components/ui/Breadcrumbs"
import { Alert, Spinner } from "@platform/ui"

type PaymentStatus = "pending" | "approved" | "rejected"

function RetornoContent() {
  const sp = useSearchParams()
  const { clear } = useCart()
  const money = useMoney()
  const orderId = sp.get("order")
  const cancelled = sp.get("cancel") === "1"
  const bancardStatus = sp.get("status")
  const [status, setStatus] = useState<PaymentStatus>("pending")
  const [orderNumber, setOrderNumber] = useState("")
  const [orderTotal, setOrderTotal] = useState<number>(0)
  const [orderDate, setOrderDate] = useState("")

  const poll = useCallback(async () => {
    if (!orderId) return false
    try {
      const r = await fetch(`/api/payments/bancard/status/${orderId}`)
      const d = await r.json()
      if (d.status === "approved") {
        setOrderNumber(d.orderNumber ?? "")
        setOrderTotal(d.orderTotal ?? 0)
        setOrderDate(d.orderDate ?? new Date().toLocaleDateString("es-PY"))
        clear()
        setStatus("approved")
        return true
      }
      if (d.status === "rejected") {
        clear()
        setStatus("rejected")
        return true
      }
    } catch { /* retry */ }
    return false
  }, [orderId, clear])

  useEffect(() => {
    if (cancelled) { clear(); setStatus("rejected"); return }
    if (!orderId) { setStatus("rejected"); return }

    let tries = 0
    let timer: ReturnType<typeof setTimeout>
    let stopped = false

    const loop = async () => {
      tries += 1
      const done = await poll()
      if (done || stopped) return
      if (tries >= 20) {
        if (bancardStatus === "payment_fail") { clear(); setStatus("rejected") }
        return
      }
      timer = setTimeout(loop, 1500)
    }
    loop()
    return () => { stopped = true; clearTimeout(timer) }
  }, [orderId, cancelled, bancardStatus, poll, clear])

  return (
    <main className="flex-1">
      <Breadcrumbs items={[{ label: "Pago" }]} />
      <div className="ft-container py-10 max-w-xl mx-auto">
        {status === "pending" && (
          <div className="rounded-xl border border-[#ededf1] bg-white p-8">
            <div className="flex flex-col items-center text-center gap-3">
              <Spinner size={32} />
              <h2 className="font-heading text-xl text-brand-text">Confirmando tu pago…</h2>
              <p className="text-sm text-brand-muted">
                Estamos verificando el estado de tu transacción.
              </p>
            </div>
          </div>
        )}

        {status === "approved" && (
          <div className="space-y-4">
            <Alert showIcon type="success" title="¡Pago aprobado!">
              Tu pago fue procesado exitosamente.
            </Alert>

            <div className="rounded-xl border border-[#ededf1] bg-white p-6">
              <dl className="space-y-3 text-sm">
                {orderNumber && (
                  <div className="flex justify-between">
                    <dt className="text-brand-muted">Pedido</dt>
                    <dd className="font-semibold text-brand-text">{orderNumber}</dd>
                  </div>
                )}
                {orderDate && (
                  <div className="flex justify-between">
                    <dt className="text-brand-muted">Fecha</dt>
                    <dd className="font-semibold text-brand-text">{orderDate}</dd>
                  </div>
                )}
                {orderTotal > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-brand-muted">Total</dt>
                    <dd className="font-semibold text-brand-orange font-price">{money(orderTotal)}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/mi-cuenta"
                className="brand-gradient focus-ring text-white rounded-[30px] h-11 px-6 text-sm font-semibold flex items-center justify-center"
              >
                Ver mis pedidos
              </Link>
              <Link
                href="/catalogo"
                className="focus-ring text-brand-text border border-[#ededf1] rounded-[30px] h-11 px-6 text-sm font-semibold flex items-center justify-center hover:border-brand-orange hover:text-brand-orange transition-colors"
              >
                Volver a comprar
              </Link>
            </div>
          </div>
        )}

        {status === "rejected" && (
          <div className="space-y-4">
            <Alert showIcon type="danger" title={cancelled ? "Pago cancelado" : "Pago no aprobado"}>
              {cancelled
                ? "Cancelaste el proceso de pago."
                : "El pago no pudo ser procesado. Podés intentar nuevamente."}
            </Alert>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/mi-cuenta"
                className="brand-gradient focus-ring text-white rounded-[30px] h-11 px-6 text-sm font-semibold flex items-center justify-center"
              >
                Ver mis pedidos
              </Link>
              <Link
                href="/catalogo"
                className="focus-ring text-brand-text border border-[#ededf1] rounded-[30px] h-11 px-6 text-sm font-semibold flex items-center justify-center hover:border-brand-orange hover:text-brand-orange transition-colors"
              >
                Volver a comprar
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default function PagoRetornoPage() {
  return (
    <Suspense fallback={<main className="flex-1"><div className="ft-container py-20 text-center text-sm text-brand-muted">Cargando…</div></main>}>
      <RetornoContent />
    </Suspense>
  )
}
