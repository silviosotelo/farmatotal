"use client"
import { useState } from "react"
import { useSucursal } from "./SucursalContext"
import { Truck, Store } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  config: {
    clickCollectEnable?: boolean
    deliveryInventory?: string
    textsDelivery?: string
    textsLocalPickup?: string
  }
  onSelect: (mode: 'delivery' | 'pickup', branchId?: string) => void
}

export default function ClickCollectToggle({ config, onSelect }: Props) {
  const [mode, setMode] = useState<'delivery' | 'pickup'>('pickup')
  const { selected } = useSucursal()

  if (!config.clickCollectEnable) return null

  const handleMode = (m: 'delivery' | 'pickup') => {
    setMode(m)
    onSelect(m, m === 'pickup' ? selected?.id : config.deliveryInventory)
  }

  return (
    <div className="flex gap-2 mb-4">
      <button
        type="button"
        onClick={() => handleMode('pickup')}
        className={cn(
          "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition",
          mode === 'pickup' ? "border-[var(--brand-orange)] bg-[var(--brand-orange)]/5 text-[var(--brand-orange)]" : "border-gray-200 text-gray-500 hover:border-gray-300"
        )}
      >
        <Store className="w-4 h-4" />
        {config.textsLocalPickup || "Retiro en sucursal"}
      </button>
      <button
        type="button"
        onClick={() => handleMode('delivery')}
        className={cn(
          "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition",
          mode === 'delivery' ? "border-[var(--brand-orange)] bg-[var(--brand-orange)]/5 text-[var(--brand-orange)]" : "border-gray-200 text-gray-500 hover:border-gray-300"
        )}
      >
        <Truck className="w-4 h-4" />
        {config.textsDelivery || "Envío a domicilio"}
      </button>
    </div>
  )
}
