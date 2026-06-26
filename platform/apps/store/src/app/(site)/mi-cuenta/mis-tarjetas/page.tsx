"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { CreditCard, Trash2, Plus, Loader2 } from "lucide-react"
import { useAuth } from "@/components/providers/AuthContext"
import { Breadcrumbs } from "@/components/ui/Breadcrumbs"

type Card = { card_id: number; card_masked_number: string; card_brand: string; alias_token: string }

export default function MisTarjetas() {
  const { user } = useAuth()
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [addingCard, setAddingCard] = useState(false)
  const [processId, setProcessId] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user?.id) return
    fetch("/api/payments/bancard/users-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: parseInt(user.id) }),
    })
      .then(r => r.json())
      .then(d => { setCards(d?.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [user?.id])

  const startAddCard = async () => {
    if (!user?.id) return
    setAddingCard(true)
    setError("")
    try {
      const res = await fetch("/api/payments/bancard/cards/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: parseInt(user.id) * 10000 + Date.now(),
          userId: parseInt(user.id),
          userCellPhone: "021",
          userMail: user.email || "",
          returnUrl: window.location.href,
        }),
      })
      const data = await res.json()
      if (data.process_id) {
        setProcessId(data.process_id)
        const script = document.createElement("script")
        script.src = data.jsUrl || "https://vpos.infonet.com.py:8888/checkout/javascript/dist/bancard-checkout-3.0.0.js"
        script.onload = () => {
          if (window.Bancard?.Cards) {
            window.Bancard.Cards.createForm("card-iframe-container", data.process_id, {})
          }
        }
        document.body.appendChild(script)
      } else {
        setError(data.message || "Error al iniciar registro de tarjeta")
        setAddingCard(false)
      }
    } catch {
      setError("Error de conexión")
      setAddingCard(false)
    }
  }

  const deleteCard = async (cardToken: string) => {
    if (!user?.id || !confirm("¿Eliminar esta tarjeta?")) return
    try {
      await fetch("/api/payments/bancard/delete-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: parseInt(user.id), cardToken }),
      })
      setCards(c => c.filter(x => x.alias_token !== cardToken))
    } catch {}
  }

  const refreshCards = async () => {
    if (!user?.id) return
    setAddingCard(false)
    setProcessId(null)
    const res = await fetch("/api/payments/bancard/users-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: parseInt(user.id) }),
    })
    const data = await res.json()
    setCards(data?.data || [])
  }

  return (
    <main className="flex-1">
      <Breadcrumbs items={[{ label: "Mi cuenta", href: "/mi-cuenta" }, { label: "Mis tarjetas" }]} />
      <div className="ft-container py-10 max-w-2xl mx-auto">
        <div className="rounded-xl border border-[#ededf1] bg-white p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-heading text-xl text-brand-text">Mis tarjetas</h1>
            {!addingCard && (
              <button
                onClick={startAddCard}
                className="brand-gradient focus-ring text-white rounded-[30px] h-11 px-6 text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Agregar Tarjeta
              </button>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive mb-4">
              {error}
            </div>
          )}

          {loading && (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-brand-muted">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Cargando tarjetas…</p>
            </div>
          )}

          {addingCard && processId && (
            <div className="mb-6">
              <p className="text-sm text-brand-muted mb-2">
                Ingresá los datos de tu nueva tarjeta en el formulario seguro de Bancard.
              </p>
              <div id="card-iframe-container" className="min-h-[200px] border border-[#ededf1] rounded-xl" />
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={refreshCards}
                  className="brand-gradient focus-ring text-white rounded-[30px] h-11 px-6 text-sm font-semibold flex items-center justify-center"
                >
                  Tarjeta registrada, ver lista
                </button>
                <button
                  onClick={() => { setAddingCard(false); setProcessId(null) }}
                  className="focus-ring text-brand-text border border-[#ededf1] rounded-[30px] h-11 px-6 text-sm font-semibold flex items-center justify-center hover:border-brand-orange hover:text-brand-orange transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {!loading && cards.length === 0 && !addingCard && (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
              <CreditCard className="h-10 w-10 text-brand-muted/60" />
              <p className="text-sm text-brand-muted">No tenés tarjetas registradas.</p>
              <p className="text-xs text-brand-muted">Agregá una tarjeta para pagar más rápido.</p>
            </div>
          )}

          {!loading && cards.length > 0 && !addingCard && (
            <div className="space-y-3">
              {cards.map(c => (
                <div
                  key={c.card_id}
                  className="flex items-center justify-between p-4 border border-[#ededf1] rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-14 items-center justify-center rounded-md border border-[#ededf1] bg-[#f8f8f8]">
                      <CreditCard className="h-5 w-5 text-brand-muted" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-brand-text">{c.card_masked_number}</p>
                      <p className="text-xs text-brand-muted">{c.card_brand}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteCard(c.alias_token)}
                    className="text-destructive text-xs font-medium hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/mi-cuenta"
            className="focus-ring text-brand-text border border-[#ededf1] rounded-[30px] h-11 px-6 text-sm font-semibold inline-flex items-center justify-center hover:border-brand-orange hover:text-brand-orange transition-colors"
          >
            Volver a mi cuenta
          </Link>
        </div>
      </div>
    </main>
  )
}
