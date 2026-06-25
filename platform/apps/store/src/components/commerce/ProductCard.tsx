"use client"
import Link from "next/link"
import Image from "next/image"
import { ShoppingCart, Heart, Eye } from "lucide-react"
import { useCart } from "@/components/providers/CartContext"

type Props = {
  product: {
    id: string
    name: string
    slug: string
    priceWeb: number
    priceNormal?: number
    image?: string
    images?: string[]
    unit?: string
    onPromo?: boolean
    rating?: number
    reviewCount?: number
  }
  variant?: "grid" | "list" | "compact"
}

export default function ProductCard({ product, variant = "grid" }: Props) {
  const { addItem } = useCart()
  const discount = product.priceNormal && product.priceWeb < product.priceNormal
    ? Math.round((1 - product.priceWeb / product.priceNormal) * 100)
    : 0

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
        <Image src={product.image || "/img/placeholder.png"} alt={product.name} width={48} height={48} className="rounded object-cover" />
        <div className="min-w-0 flex-1">
          <Link href={`/productos/${product.slug}`} className="text-sm font-medium truncate block hover:text-primary">{product.name}</Link>
          <p className="text-sm font-bold text-primary">${product.priceWeb.toFixed(2)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative bg-surface rounded-xl border border-border overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5" style={{ borderRadius: "var(--radius, 0.5rem)" }}>
      <div className="relative aspect-square overflow-hidden bg-background">
        <Image src={product.image || "/img/placeholder.png"} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">-{discount}%</span>
        )}
        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-1.5 bg-white/90 rounded-full shadow hover:bg-white" aria-label="Agregar al carrito" onClick={() => addItem({ productId: product.id, name: product.name, slug: product.slug, price: product.priceWeb, image: product.image, quantity: 1 })}>
            <ShoppingCart className="w-4 h-4" />
          </button>
          <button className="p-1.5 bg-white/90 rounded-full shadow hover:bg-white" aria-label="Favoritos">
            <Heart className="w-4 h-4" />
          </button>
          <Link href={`/productos/${product.slug}`} className="p-1.5 bg-white/90 rounded-full shadow hover:bg-white" aria-label="Ver detalle">
            <Eye className="w-4 h-4" />
          </Link>
        </div>
      </div>
      <div className="p-3">
        <Link href={`/productos/${product.slug}`} className="text-sm font-semibold line-clamp-2 hover:text-primary transition-colors">{product.name}</Link>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold" style={{ color: "var(--primary)" }}>${product.priceWeb.toFixed(2)}</span>
          {product.priceNormal && product.priceNormal > product.priceWeb && (
            <span className="text-sm text-muted-foreground line-through">${product.priceNormal.toFixed(2)}</span>
          )}
        </div>
        {product.unit && <p className="text-xs text-muted-foreground mt-1">{product.unit}</p>}
        {discount > 0 && (
          <div className="mt-2 flex items-center gap-1">
            <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(discount * 2, 100)}%`, background: "var(--secondary)" }} />
            </div>
            <span className="text-xs font-medium" style={{ color: "var(--secondary)" }}>{discount}% OFF</span>
          </div>
        )}
      </div>
    </div>
  )
}
