"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { TOP_NAV } from "@/lib/data";
import type { NavItem } from "@/lib/api";
import { UserIcon, CartIcon, MenuIcon, ChevronDownIcon } from "@/components/icons";
import { useCart } from "@/components/providers/CartContext";
import { SucursalTrigger } from "@/components/sucursal/SucursalTrigger";
import { SearchBar, MegaMenu, TopBar } from "@/components/sections/Header";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Bloques del HEADER para el builder — el encabezado deja de ser un widget opaco
 * y pasa a ser construible: cada pieza es un bloque colocable/reordenable, y las
 * partes interactivas (buscador, menú, carrito, sucursal) son bloques funcionales
 * (estilo Elementor header builder). El layout (gradiente, filas) se arma con
 * primitivas Box en el documento `header`.
 */

export function HeaderTopBarBlock() {
  return <TopBar topNav={TOP_NAV} />;
}

export function HeaderLogoBlock({
  logo = "/brand/logo-farmatotal.svg",
  brandName = "Farmatotal",
}: {
  logo?: string;
  brandName?: string;
}) {
  return (
    <Link href="/" className="shrink-0">
      <Image src={logo} alt={brandName} width={200} height={43} style={{ height: "auto" }} unoptimized priority />
    </Link>
  );
}

export function HeaderSearchBlock() {
  return <SearchBar />;
}

export function HeaderCategoriesBlock() {
  const [open, setOpen] = useState(false);
  const [cats, setCats] = useState<NavItem[]>([]);
  useEffect(() => {
    fetch(`${API}/catalog/categories/tree`)
      .then((r) => r.json())
      .then((d) =>
        setCats(
          ((d.data as { name: string; slug: string; children?: unknown[] }[]) || [])
            .filter((c) => Array.isArray(c.children) && c.children.length > 0)
            .map((c) => ({ label: c.name, href: `/categorias/${c.slug}/` })),
        ),
      )
      .catch(() => setCats([]));
  }, []);
  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md px-1 py-0.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <MenuIcon width={20} height={20} />
        <span>Categorías</span>
        <ChevronDownIcon width={16} height={16} />
      </button>
      {open && cats.length > 0 && <MegaMenu onClose={() => setOpen(false)} categories={cats} />}
    </div>
  );
}

export function HeaderAccountBlock() {
  return (
    <Link
      href="/mi-cuenta/"
      className="shrink-0 rounded-full p-2 text-white transition-colors hover:bg-white/20"
      aria-label="Mi cuenta"
    >
      <UserIcon width={24} height={24} />
    </Link>
  );
}

export function HeaderCartBlock() {
  const { count, openCart } = useCart();
  return (
    <button
      type="button"
      onClick={openCart}
      className="relative shrink-0 rounded-full p-2 text-white transition-colors hover:bg-white/20"
      aria-label={`Carrito (${count} ítems)`}
    >
      <CartIcon width={24} height={24} />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-[var(--brand-orange)]">
          {count}
        </span>
      )}
    </button>
  );
}

export function HeaderSucursalBlock() {
  return (
    <div className="flex items-center gap-1 text-sm text-white">
      <span className="opacity-90">Sucursal:</span>
      <SucursalTrigger className="font-semibold text-white" />
    </div>
  );
}
