"use client"
import { useCart } from "@/components/providers/CartContext"
import { usePluginConfig } from "@/components/providers/PluginConfigContext"
import { AlertTriangle } from "lucide-react"

export default function CartInventoryGuard() {
  const config = usePluginConfig()
  const { lines } = useCart()

  const showInfo = config.showInventoryInCartAndCheckout as boolean
  const restrict = config.restrictInventoryCart as boolean
  const showMixed = config.mixedCartInfo as boolean
  const mixedText = (config.mixedCartInfoText as string) || "Tenés productos de diferentes sucursales. Algunos podrían no estar disponibles."

  if (!showInfo && !showMixed) return null
  if (lines.length <= 1) return null

  // Check if items have different branchId
  const branches = new Set(lines.map((l: any) => l.branchId).filter(Boolean))
  if (branches.size <= 1) return null

  if (restrict) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
        No podés mezclar productos de diferentes sucursales.
      </div>
    )
  }

  if (showMixed) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-sm text-amber-700">
        <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
        <p>{mixedText}</p>
      </div>
    )
  }

  return null
}
