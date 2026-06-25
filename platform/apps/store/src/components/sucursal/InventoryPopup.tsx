"use client"
import { useEffect, useState, useCallback } from "react"
import { X, MapPin, Navigation, Search } from "lucide-react"
import { useSucursal } from "./SucursalContext"
import { cn } from "@/lib/utils"

type InventoryWithDistance = {
  id: string
  name: string
  address?: string
  zona?: string
  lat: number
  lng: number
  distance?: number
  stock?: number
  deliveryTime?: string
  deliveryCost?: number
}

type Props = {
  isOpen: boolean
  onClose: () => void
  config: {
    popupLayout?: string
    popupShowStock?: boolean
    popupShowSearch?: boolean
    popupMiles?: boolean
    popupMaxResults?: number
    popupBackgroundColor?: string
    popupTextColor?: string
    popupButtonBackgroundColor?: string
    popupButtonTextColor?: string
    textsPopupSearchAddress?: string
  }
  productId?: string
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export default function InventoryPopup({ isOpen, onClose, config, productId }: Props) {
  const { sucursales, select } = useSucursal()
  const [inventories, setInventories] = useState<InventoryWithDistance[]>([])
  const [search, setSearch] = useState("")
  const [userLat, setUserLat] = useState(0)
  const [userLng, setUserLng] = useState(0)

  useEffect(() => {
    if (!isOpen) return
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude) },
      () => {}
    )
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !sucursales.length) return
    const list = sucursales
      .map(s => ({
        id: s.id,
        name: s.name,
        address: s.address,
        city: s.zona,
        lat: Number(s.lat) || 0,
        lng: Number(s.lng) || 0,
        distance: userLat && userLng ? haversineKm(userLat, userLng, Number(s.lat) || 0, Number(s.lng) || 0) : undefined,
      }))
      .sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999))
      .slice(0, config.popupMaxResults || 100)
    setInventories(list)
  }, [isOpen, sucursales, userLat, userLng, config.popupMaxResults])

  const filtered = inventories.filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.address?.toLowerCase().includes(search.toLowerCase())
  )

  const selectInventory = useCallback((inv: InventoryWithDistance) => {
    const s = sucursales.find(s => s.id === inv.id)
    if (s) select(s)
    onClose()
  }, [sucursales, select, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: config.popupBackgroundColor || '#fff' }}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-bold" style={{ color: config.popupTextColor || '#000' }}>Seleccioná tu sucursal</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>

        {config.popupShowSearch && (
          <div className="px-4 py-3 border-b flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={config.textsPopupSearchAddress || "Ingresá tu dirección"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            {userLat === 0 && (
              <button
                onClick={() => navigator.geolocation?.getCurrentPosition(
                  (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude) },
                  () => {}
                )}
                className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200"
              >
                <Navigation className="w-4 h-4" />
                Mi ubicación
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 py-8">No se encontraron sucursales</p>
          )}
          {filtered.map(inv => (
            <button
              key={inv.id}
              onClick={() => selectInventory(inv)}
              className={cn(
                "w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition hover:border-[var(--brand-orange)]",
                "border-gray-100"
              )}
            >
              <MapPin className="w-5 h-5 mt-0.5 shrink-0 text-[var(--brand-orange)]" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{inv.name}</p>
                {inv.address && <p className="text-xs text-gray-500 mt-0.5 truncate">{inv.address}</p>}
                {inv.zona && <p className="text-xs text-gray-400">{inv.zona}</p>}
              </div>
              {inv.distance !== undefined && (
                <span className="text-xs font-medium text-gray-400 shrink-0 mt-0.5">
                  {inv.distance.toFixed(1)} km
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
