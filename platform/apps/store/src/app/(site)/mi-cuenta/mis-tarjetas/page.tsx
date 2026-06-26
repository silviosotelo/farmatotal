"use client"
import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/components/providers/AuthContext"

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
          if ((window.Bancard as any)?.Cards) {
            (window.Bancard as any).Cards.createForm("card-iframe-container", data.process_id, {})
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

  if (loading) return <div className="py-10 text-center text-gray-400">Cargando tarjetas...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Mis Tarjetas</h3>
        {!addingCard && (
          <button onClick={startAddCard} className="px-4 py-2 text-sm font-medium text-white rounded-lg" style={{ background: "var(--brand-orange)" }}>
            Agregar Tarjeta
          </button>
        )}
      </div>

      {error && <div className="p-4 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">{error}</div>}

      {addingCard && processId && (
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-2">Ingresá los datos de tu nueva tarjeta en el formulario seguro de Bancard.</p>
          <div id="card-iframe-container" className="min-h-[200px] border border-gray-200 rounded-lg" />
          <div className="mt-4 flex gap-2">
            <button onClick={refreshCards} className="px-4 py-2 text-sm font-medium text-white rounded-lg" style={{ background: "var(--brand-orange)" }}>
              Tarjeta registrada, ver lista
            </button>
            <button onClick={() => { setAddingCard(false); setProcessId(null) }} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {cards.length === 0 && !addingCard ? (
        <div className="py-10 text-center text-gray-400">
          <p>No tenés tarjetas registradas.</p>
          <p className="text-sm mt-2">Agregá una tarjeta para pagar más rápido.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map(c => (
            <div key={c.card_id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-6 bg-gray-200 rounded flex items-center justify-center text-xs font-bold text-gray-500">
                  {c.card_brand?.substring(0, 4).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{c.card_masked_number}</p>
                  <p className="text-xs text-gray-400">{c.card_brand}</p>
                </div>
              </div>
              <button onClick={() => deleteCard(c.alias_token)} className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
