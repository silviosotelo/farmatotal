"use client"

import { Suspense, useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useCart } from "@/components/providers/CartContext"
import { useMoney } from "@/components/providers/CurrencyContext"
import { Breadcrumbs } from "@/components/ui/Breadcrumbs"
import { Button, Spinner } from "@platform/ui"

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
  const [elapsed, setElapsed] = useState(0)

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

  useEffect(() => {
    if (status !== "pending") return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [status])

  return (
    <main className="flex-1">
      <Breadcrumbs items={[{ label: "Pago" }]} />
      <div className="ft-container py-10 max-w-xl mx-auto">
        {/* Pending */}
        {status === "pending" && (
          <div className="rounded-xl border border-[#ededf1] bg-white p-10 text-center">
            <Spinner className="mx-auto mb-4" />
            <h2 className="font-heading text-xl text-brand-text mb-2">Confirmando tu pago…</h2>
            <p className="text-sm text-brand-muted">
              Estamos verificando el estado de tu transacción.
              {elapsed > 10 && " Esto puede tomar unos segundos más. No cierre esta página."}
            </p>
          </div>
        )}

        {/* Approved */}
        {status === "approved" && (
          <div className="rounded-xl border border-success-subtle bg-success/5 p-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <span className="text-3xl text-success">✓</span>
            </div>
            <h2 className="font-heading text-xl text-success mb-2">¡Pago aprobado!</h2>
            <p className="text-sm text-brand-muted mb-6">Tu pago fue procesado exitosamente.</p>

            <div className="rounded-lg border border-[#ededf1] bg-white p-4 mb-6 text-left text-sm">
              <dl className="space-y-2">
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

        {/* Rejected */}
        {status === "rejected" && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <span className="text-3xl text-destructive">✗</span>
            </div>
            <h2 className="font-heading text-xl text-destructive mb-2">
              {cancelled ? "Pago cancelado" : "Pago no aprobado"}
            </h2>
            <p className="text-sm text-brand-muted mb-6">
              {cancelled
                ? "Cancelaste el proceso de pago."
                : "El pago no pudo ser procesado. Podés intentar nuevamente."}
            </p>

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
