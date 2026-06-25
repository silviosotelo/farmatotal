"use client"
import { useEffect, useState } from "react"
import { useSucursal } from "./SucursalContext"
import { usePluginConfig } from "../providers/PluginConfigContext"
import { cn } from "@/lib/utils"

type BranchStock = {
  branchId: string
  branchName: string
  stock: number
}

type Props = {
  productId: string
  onSelect?: (branchId: string) => void
}

export default function BranchStockSelector({ productId, onSelect }: Props) {
  const config = usePluginConfig()
  const { selected } = useSucursal()
  const [stocks, setStocks] = useState<BranchStock[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>(selected?.id || '')
  const [expanded, setExpanded] = useState(false)

  const display = (config.productPageDisplay as string) || 'label'
  const stockDisplay = (config.productPageStockDisplay as string) || 'count'
  const hideEmpty = config.productPageHideEmptyInventories as boolean
  const order = (config.productPageOrder as string) || 'most_stock'

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || ''
    const TENANT = process.env.NEXT_PUBLIC_STORE_TENANT || 'default'
    fetch(`${API}/inventory/product/${productId}`, { headers: { 'x-tenant': TENANT } })
      .then(r => r.json())
      .then(d => {
        let items: BranchStock[] = (d?.data || []).map((s: any) => ({
          branchId: s.branchId,
          branchName: s.branchName || s.branchId,
          stock: s.stock || 0,
        }))
        if (hideEmpty) items = items.filter(i => i.stock > 0)
        if (order === 'most_stock') items.sort((a, b) => b.stock - a.stock)
        else if (order === 'lowest_stock') items.sort((a, b) => a.stock - b.stock)
        else items.sort((a, b) => a.branchName.localeCompare(b.branchName))
        setStocks(items)
      })
      .catch(() => {})
  }, [productId, hideEmpty, order])

  const formatStock = (stock: number) => {
    if (stockDisplay === 'hidden') return null
    if (stockDisplay === 'inout') return stock > 0 ? 'Disponible' : 'Sin stock'
    return `${stock} en stock`
  }

  const select = (branchId: string) => {
    setSelectedBranch(branchId)
    onSelect?.(branchId)
  }

  if (display === 'hidden') return null
  if (stocks.length === 0) return null

  if (display === 'text' || display === 'textOnlySelected') {
    const shown = display === 'textOnlySelected'
      ? stocks.filter(s => s.branchId === selectedBranch)
      : stocks
    return (
      <div className="text-sm text-gray-500 space-y-1 my-2">
        {shown.map(s => (
          <p key={s.branchId}>
            <span className="font-medium text-gray-700">{s.branchName}:</span>{' '}
            {formatStock(s.stock)}
          </p>
        ))}
      </div>
    )
  }

  if (display === 'radio') {
    return (
      <div className="space-y-2 my-3">
        {stocks.map(s => (
          <label key={s.branchId} className={cn(
            "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition",
            selectedBranch === s.branchId ? "border-[var(--brand-orange)] bg-[var(--brand-orange)]/5" : "border-gray-100 hover:border-gray-200"
          )}>
            <input type="radio" name="branch_stock" checked={selectedBranch === s.branchId} onChange={() => select(s.branchId)} className="accent-[var(--brand-orange)]" />
            <span className="flex-1 text-sm font-medium">{s.branchName}</span>
            <span className="text-xs text-gray-400">{formatStock(s.stock)}</span>
          </label>
        ))}
      </div>
    )
  }

  if (display === 'select') {
    return (
      <select
        value={selectedBranch}
        onChange={(e) => select(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange)]/30"
      >
        <option value="">Seleccionar sucursal...</option>
        {stocks.map(s => (
          <option key={s.branchId} value={s.branchId}>
            {s.branchName} ({formatStock(s.stock)})
          </option>
        ))}
      </select>
    )
  }

  // label or labelPopup (default)
  const current = stocks.find(s => s.branchId === selectedBranch)
  return (
    <div className="my-3">
      {current ? (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          <span className="text-sm">
            <span className="text-gray-400">Disponible en</span>{' '}
            <span className="font-medium">{current.branchName}</span>{' '}
            <span className="text-gray-400">· {formatStock(current.stock)}</span>
          </span>
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-[var(--brand-orange)] font-medium">
            Cambiar
          </button>
        </div>
      ) : (
        <button onClick={() => setExpanded(true)} className="text-sm text-[var(--brand-orange)] font-medium">
          Seleccionar sucursal
        </button>
      )}
      {expanded && (
        <div className="mt-2 space-y-1">
          {stocks.map(s => (
            <button
              key={s.branchId}
              onClick={() => { select(s.branchId); setExpanded(false) }}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded-xl text-left text-sm transition",
                selectedBranch === s.branchId ? "bg-[var(--brand-orange)]/5 font-medium" : "hover:bg-gray-50"
              )}
            >
              <span>{s.branchName}</span>
              <span className="text-xs text-gray-400">{formatStock(s.stock)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
