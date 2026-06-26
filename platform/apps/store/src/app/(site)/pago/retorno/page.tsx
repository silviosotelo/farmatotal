"use client"

import { Suspense, useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useCart } from "@/components/providers/CartContext"

type PaymentStatus = "none" | "pending" | "approved" | "rejected"

function RetornoContent() {
  const sp = useSearchParams()
  const { clear } = useCart()
  const orderId = sp.get("order")
  const bancardStatus = sp.get("status")
  const cancelled = sp.get("cancel") === "1"
  const [status, setStatus] = useState<PaymentStatus>("pending")
  const [orderNumber, setOrderNumber] = useState("")
  const [orderTotal, setOrderTotal] = useState("")
  const [orderDate, setOrderDate] = useState("")
  const [elapsed, setElapsed] = useState(0)

  const poll = useCallback(async () => {
    if (!orderId) return
    try {
      const r = await fetch(`/api/payments/bancard/status/${orderId}`)
      const d = await r.json()
      if (d.status === "approved") {
        setStatus("approved")
        setOrderNumber(d.orderNumber ?? "")
        setOrderTotal(d.orderTotal ?? "")
        setOrderDate(d.orderDate ?? new Date().toLocaleDateString("es-PY"))
        clear()
        return true
      }
      if (d.status === "rejected") {
        setStatus("rejected")
        return true
      }
    } catch {
      /* retry */
    }
    return false
  }, [orderId, clear])

  useEffect(() => {
    // Cancelación explícita del usuario
    if (cancelled || bancardStatus === "cancel") {
      setStatus("rejected")
      clear()
      return
    }

    // Si no hay orderId, rechazar
    if (!orderId) {
      setStatus("rejected")
      return
    }

    // Siempre poll — el status de la URL de Bancard puede no coincidir con el webhook
    let tries = 0
    let timer: ReturnType<typeof setTimeout>
    let stopped = false

    const pollLoop = async () => {
      tries += 1
      const done = await poll()
      if (done || stopped) return
      if (tries >= 20) {
        // Si después de 20 intentos no hay webhook, mostrar el status de la URL
        if (bancardStatus === "payment_fail") {
          setStatus("rejected")
          clear()
        }
        return
      }
      timer = setTimeout(pollLoop, 1500)
    }

    pollLoop()
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [orderId, cancelled, bancardStatus, poll, clear])

  useEffect(() => {
    if (status !== "pending") return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [status])

  const borderColor =
    status === "approved"
      ? "border-green-200"
      : status === "rejected"
        ? "border-red-200"
        : "border-yellow-200"
  const bgColor =
    status === "approved"
      ? "bg-green-50"
      : status === "rejected"
        ? "bg-red-50"
        : "bg-yellow-50"
  const iconBg =
    status === "approved"
      ? "bg-green-100"
      : status === "rejected"
        ? "bg-red-100"
        : "bg-yellow-100"
  const textColor =
    status === "approved"
      ? "text-green-700"
      : status === "rejected"
        ? "text-red-700"
        : "text-yellow-700"
  const icon =
    status === "approved" ? "✓" : status === "rejected" ? "✗" : "⏳"

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-lg px-4 py-16">
        <div className={`rounded-2xl border ${borderColor} ${bgColor} p-8 text-center`}>
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${iconBg}`}>
            <span className={`text-3xl font-bold ${textColor}`}>{icon}</span>
          </div>

          {status === "approved" && (
            <>
              <h1 className="mb-2 text-xl font-bold text-green-800">¡Pago aprobado!</h1>
              <p className="mb-6 text-sm text-green-600">Tu pago fue procesado exitosamente.</p>
            </>
          )}

          {status === "rejected" && (
            <>
              <h1 className="mb-2 text-xl font-bold text-red-800">
                {cancelled ? "Pago cancelado" : "Pago no aprobado"}
              </h1>
              <p className="mb-6 text-sm text-red-600">
                {cancelled
                  ? "Cancelaste el proceso de pago."
                  : "El pago no pudo ser procesado. Podés intentar nuevamente."}
              </p>
            </>
          )}

          {status === "pending" && (
            <>
              <h1 className="mb-2 text-xl font-bold text-yellow-800">Confirmando tu pago…</h1>
              <p className="mb-2 text-sm text-yellow-600">
                Estamos verificando el estado de tu transacción.
              </p>
              {elapsed > 10 && (
                <p className="text-xs text-yellow-500">
                  Esto puede tomar unos segundos más. No cierre esta página.
                </p>
              )}
            </>
          )}

          {orderId && (
            <div className="mx-auto mb-6 mt-4 max-w-xs rounded-lg bg-white/70 p-4 text-left text-sm">
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Orden</span>
                <span className="font-medium">
                  {orderNumber || orderId.slice(0, 8)}
                </span>
              </div>
              {orderDate && (
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Fecha</span>
                  <span className="font-medium">{orderDate}</span>
                </div>
              )}
              {orderTotal && (
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Total</span>
                  <span className="font-medium">{orderTotal}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/mi-cuenta"
              className="inline-block rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors"
              style={{ background: "var(--brand-orange)" }}
            >
              Ver mis pedidos
            </Link>
            <Link
              href="/catalogo"
              className="inline-block rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Volver a comprar
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function PagoRetornoPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1">
          <div className="mx-auto w-full max-w-lg px-4 py-16 text-center text-sm text-gray-400">
            Cargando…
          </div>
        </main>
      }
    >
      <RetornoContent />
    </Suspense>
  )
}
