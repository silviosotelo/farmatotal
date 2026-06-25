"use client"
import Link from "next/link"
import { Search, ShoppingCart, Heart, User, Phone, MapPin, Menu, ChevronDown } from "lucide-react"
import { useCart } from "@/components/providers/CartContext"

type NavItem = { label: string; href: string; children?: NavItem[] }

type HeaderProps = {
  config: {
    brandName?: string
    logo?: string
    phone?: string
    navItems?: NavItem[]
    topNav?: NavItem[]
    categories?: NavItem[]
  } | null
  tokens: {
    headerVariant: string
    primary: string
  }
}

export default function StoreHeader({ config, tokens }: HeaderProps) {
  const { items } = useCart()
  const itemCount = items.reduce((s, i) => s + i.quantity, 0)
  const nav = config?.navItems ?? config?.topNav ?? []

  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-border shadow-sm" style={{ fontFamily: "var(--font-family)" }}>
      {/* Top bar */}
      <div className="hidden md:block border-b border-border">
        <div className="mx-auto flex items-center justify-between px-4 py-1.5 text-xs text-muted-foreground" style={{ maxWidth: "var(--container-max)" }}>
          <div className="flex items-center gap-4">
            {config?.phone && <a href={`tel:${config.phone}`} className="flex items-center gap-1 hover:text-primary"><Phone className="w-3 h-3" />{config.phone}</a>}
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />Envíos a todo Paraguay</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/mi-cuenta" className="hover:text-primary">Mi cuenta</Link>
            <Link href="/mis-favoritos" className="hover:text-primary">Favoritos</Link>
          </div>
        </div>
      </div>
      {/* Main bar */}
      <div className="mx-auto flex items-center gap-4 px-4 py-3" style={{ maxWidth: "var(--container-max)" }}>
        <Link href="/" className="shrink-0">
          {config?.logo ? <img src={config.logo} alt={config.brandName ?? 'Tienda'} className="h-8" /> : <span className="text-xl font-bold" style={{ color: "var(--primary)" }}>{config?.brandName ?? 'Tienda'}</span>}
        </Link>
        <form action="/buscar" method="get" className="flex-1 hidden md:flex items-center max-w-xl">
          <input name="q" placeholder="Buscar productos..." className="flex-1 px-4 py-2 rounded-l-lg border border-r-0 border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ borderRadius: "var(--radius) 0 0 var(--radius)" }} />
          <button className="px-4 py-2 text-white rounded-r-lg" style={{ background: "var(--primary)", borderRadius: "0 var(--radius) var(--radius) 0" }} aria-label="Buscar"><Search className="w-4 h-4" /></button>
        </form>
        <div className="flex items-center gap-3">
          <Link href="/mis-favoritos" className="p-2 rounded-full hover:bg-muted transition-colors relative" aria-label="Favoritos"><Heart className="w-5 h-5" /></Link>
          <Link href="/mi-cuenta" className="p-2 rounded-full hover:bg-muted transition-colors relative hidden md:block" aria-label="Mi cuenta"><User className="w-5 h-5" /></Link>
          <Link href="/carrito" className="p-2 rounded-full hover:bg-muted transition-colors relative" aria-label="Carrito">
            <ShoppingCart className="w-5 h-5" />
            {itemCount > 0 && <span className="absolute -top-0.5 -right-0.5 text-[10px] font-bold text-white rounded-full w-4 h-4 flex items-center justify-center" style={{ background: "var(--secondary)" }}>{itemCount}</span>}
          </Link>
        </div>
      </div>
      {/* Navigation */}
      {nav.length > 0 && (
        <nav className="hidden md:block border-t border-border">
          <div className="mx-auto flex items-center gap-1 px-4 py-1.5 overflow-x-auto" style={{ maxWidth: "var(--container-max)" }}>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white" style={{ background: "var(--primary)" }}><Menu className="w-4 h-4" /> Categorías</button>
            {nav.map((item) => (
              <div key={item.href} className="relative group">
                <Link href={item.href} className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg hover:bg-muted transition-colors whitespace-nowrap">{item.label}{item.children && <ChevronDown className="w-3 h-3" />}</Link>
                {item.children && item.children.length > 0 && (
                  <div className="absolute top-full left-0 hidden group-hover:block bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[200px] z-50">
                    {item.children.map((child) => <Link key={child.href} href={child.href} className="block px-4 py-2 text-sm hover:bg-muted transition-colors">{child.label}</Link>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}
