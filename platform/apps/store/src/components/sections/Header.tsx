"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { TOP_NAV } from "@/lib/data";
import { formatGs } from "@/lib/format";
import type { NavItem } from "@/lib/api";
import {
  GridIcon,
  ChevronDownIcon,
  SearchIcon,
  UserIcon,
  CartIcon,
  LocationIcon,
  MenuIcon,
} from "@/components/icons";
import { SucursalTrigger } from "@/components/sucursal/SucursalTrigger";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/providers/CartContext";

/* ─── TopBar (desktop only) ──────────────────────────────────────────────── */
export function TopBar({ topNav }: { topNav: NavItem[] }) {
  return (
    <div
      className="hidden lg:flex w-full"
      style={{ background: "#f9f9f9", height: "40px" }}
    >
      <div className="ft-container flex items-center justify-between h-full">
        {/* Left: nav links */}
        <nav className="flex items-center gap-5">
          {topNav.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[12px] text-[#3e445a] hover:text-[var(--brand-orange)] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right: location + selectors */}
        <div className="flex items-center gap-4 text-[12px] text-[#3e445a]">
          {/* Location — prod has no language/currency switchers, only this */}
          <div className="flex items-center gap-1">
            <LocationIcon width={14} height={14} stroke="#3e445a" />
            <span>Sucursal más cercana:&nbsp;</span>
            <SucursalTrigger className="font-medium text-brand-orange-ink" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Mega-menu dropdown ─────────────────────────────────────────────────── */
export function MegaMenu({ onClose, categories }: { onClose: () => void; categories: NavItem[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg z-50 overflow-hidden"
    >
      <ul>
        {categories.map((cat) => (
          <li key={cat.href}>
            <Link
              href={cat.href}
              onClick={onClose}
              className="block px-4 py-2.5 text-sm text-[#202435] hover:bg-[#f3f4f7] hover:text-[var(--brand-orange)] transition-colors"
            >
              {cat.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Mobile Drawer ──────────────────────────────────────────────────────── */
function MobileDrawer({
  open,
  onClose,
  topNav,
  categories,
  logo,
  brandName,
}: {
  open: boolean;
  onClose: () => void;
  topNav: NavItem[];
  categories: NavItem[];
  logo: string;
  brandName: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const getFocusable = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key === "Tab") {
        const f = getFocusable();
        if (f.length === 0) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    requestAnimationFrame(() => getFocusable()[0]?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 lg:hidden",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
        aria-hidden={!open}
        className={cn(
          "fixed top-0 left-0 h-full w-72 bg-white z-50 shadow-xl transition-transform duration-300 lg:hidden overflow-y-auto overscroll-contain",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-3 brand-gradient">
          <Link href="/" onClick={onClose}>
            <Image
              src={logo}
              alt={brandName}
              width={150}
              height={32}
              style={{ height: "auto" }}
              unoptimized
            />
          </Link>
          <button
            onClick={onClose}
            className="text-white text-2xl leading-none rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            aria-label="Cerrar menú"
          >
            ×
          </button>
        </div>

        {/* Categories */}
        <div className="px-4 pt-4">
          <p className="text-xs font-semibold text-[#7a7a7a] uppercase tracking-wide mb-2">
            Categorías
          </p>
          <ul>
            {categories.map((cat) => (
              <li key={cat.href}>
                <Link
                  href={cat.href}
                  onClick={onClose}
                  className="block py-2.5 text-sm text-[#202435] hover:text-[var(--brand-orange)] border-b border-[#ededf1] transition-colors"
                >
                  {cat.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Top nav */}
        <div className="px-4 pt-4 pb-6">
          <p className="text-xs font-semibold text-[#7a7a7a] uppercase tracking-wide mb-2">
            Más
          </p>
          <ul>
            {topNav.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={onClose}
                  className="block py-2.5 text-sm text-[#202435] hover:text-[var(--brand-orange)] border-b border-[#ededf1] transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

/* ─── Search bar (shared) — live autocomplete tipo Amazon ────────────────── */
type Suggestion = { id: string; slug: string; title: string; price: number; priceNormal: number; image: string };

export function SearchBar({ className }: { className?: string }) {
  const searchId = useId();
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const go = (path: string) => {
    setOpen(false);
    setQ("");
    router.push(path);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = q.trim();
    if (t) go(`/buscar?q=${encodeURIComponent(t)}`);
  };

  // Debounce: consulta sugerencias 250ms después de tipear.
  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search/suggest?q=${encodeURIComponent(t)}`, { signal: ctrl.signal });
        const data = (await r.json()) as Suggestion[];
        setResults(data);
        setOpen(true);
      } catch {
        /* abort/red */
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [q]);

  // Cerrar al click afuera / Escape.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={boxRef} className={cn("relative flex-1", className)}>
      <form role="search" onSubmit={submit}>
        <label htmlFor={searchId} className="sr-only">
          Buscar productos
        </label>
        <input
          id={searchId}
          name="q"
          type="search"
          autoComplete="off"
          aria-label="Buscar productos"
          aria-expanded={open}
          placeholder="Buscar productos…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          className="w-full bg-search-bg rounded-full h-12 pl-5 pr-14 text-[15px] text-brand-text placeholder:text-brand-muted border border-transparent outline-none transition-colors focus-visible:border-white focus-visible:ring-2 focus-visible:ring-white/70"
        />
        <button
          type="submit"
          aria-label="Buscar"
          className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-[#3e445a] transition-colors hover:text-brand-orange active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50 rounded-sm"
        >
          <SearchIcon width={20} height={20} />
        </button>
      </form>

      {/* Dropdown de resultados */}
      {open && (q.trim().length >= 2) && (
        <div className="absolute left-0 right-0 top-full mt-2 z-[60] overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
          {loading && results.length === 0 ? (
            <div className="px-4 py-4 text-sm text-brand-muted">Buscando…</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-4 text-sm text-brand-muted">Sin resultados para “{q.trim()}”.</div>
          ) : (
            <>
              <ul className="max-h-[70vh] overflow-y-auto py-1">
                {results.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => go(`/productos/${p.slug}/`)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[#f6f6f8]"
                    >
                      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-[#f3f4f7]">
                        <Image src={p.image} alt={p.title} fill sizes="44px" className="object-contain" unoptimized />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-brand-text">{p.title}</span>
                        <span className="font-price text-sm font-bold text-brand-orange">{formatGs(p.price)}</span>
                        {p.priceNormal > p.price && (
                          <span className="ml-2 text-xs text-price-muted line-through">{formatGs(p.priceNormal)}</span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => go(`/buscar?q=${encodeURIComponent(q.trim())}`)}
                className="block w-full border-t border-[#ededf1] px-4 py-2.5 text-center text-sm font-semibold text-brand-orange hover:bg-[#fff7f2]"
              >
                Ver todos los resultados de “{q.trim()}”
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main header inner content ──────────────────────────────────────────── */
function MainHeaderContent({
  topNav,
  categories,
  logo,
  brandName,
}: {
  topNav: NavItem[];
  categories: NavItem[];
  logo: string;
  brandName: string;
}) {
  const [megaOpen, setMegaOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { count, openCart } = useCart();

  return (
    <>
      {/* ── Desktop layout (lg+) ── */}
      <div className="hidden lg:flex ft-container items-center gap-6 h-full">
        {/* Logo */}
        <Link href="/" className="shrink-0">
          <Image
            src={logo}
            alt={brandName}
            width={200}
            height={43}
            style={{ height: "auto" }}
            unoptimized
            priority
            loading="eager"
          />
        </Link>

        {/* Categorías button + mega-menu */}
        <div className="relative shrink-0">
          <button
            onClick={() => setMegaOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-md px-1 py-0.5 text-white font-medium text-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            aria-haspopup="true"
            aria-expanded={megaOpen}
          >
            <MenuIcon width={20} height={20} />
            <span>Categorías</span>
            <ChevronDownIcon width={16} height={16} />
          </button>
          {megaOpen && <MegaMenu onClose={() => setMegaOpen(false)} categories={categories} />}
        </div>

        {/* Search */}
        <SearchBar />

        {/* Account */}
        <Link
          href="/mi-cuenta/"
          className="shrink-0 p-2 rounded-full text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          aria-label="Mi cuenta"
        >
          <UserIcon width={24} height={24} />
        </Link>

        {/* Cart */}
        <button
          type="button"
          onClick={openCart}
          className="relative shrink-0 p-2 rounded-full text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          aria-label={`Carrito (${count} ítems)`}
        >
          <CartIcon width={24} height={24} />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 rounded-full bg-white text-[var(--brand-orange)] text-[10px] font-bold flex items-center justify-center">
              {count}
            </span>
          )}
        </button>
      </div>

      {/* ── Mobile layout (<lg) ── */}
      <div className="flex lg:hidden ft-container items-center justify-between h-full">
        {/* Left: hamburger + location */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-md text-white touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            aria-label="Menú"
          >
            <MenuIcon width={24} height={24} />
          </button>
          <button className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-md text-white touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80" aria-label="Ubicación">
            <LocationIcon width={20} height={20} />
          </button>
        </div>

        {/* Center: logo */}
        <Link href="/">
          <Image
            src={logo}
            alt={brandName}
            width={150}
            height={32}
            style={{ height: "auto" }}
            unoptimized
            priority
            loading="eager"
          />
        </Link>

        {/* Right: account + cart */}
        <div className="flex items-center gap-1">
          <Link
            href="/mi-cuenta/"
            className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-full text-white touch-manipulation transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            aria-label="Mi cuenta"
          >
            <UserIcon width={22} height={22} />
          </Link>
          <button
            type="button"
            onClick={openCart}
            className="relative inline-flex items-center justify-center min-h-11 min-w-11 rounded-full text-white touch-manipulation transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            aria-label={`Carrito (${count} ítems)`}
          >
            <CartIcon width={22} height={22} />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-white text-[var(--brand-orange)] text-[9px] font-bold flex items-center justify-center">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        topNav={topNav}
        categories={categories}
        logo={logo}
        brandName={brandName}
      />
    </>
  );
}

/* ─── Root Header ─────────────────────────────────────────────────────────── */
export default function Header({
  topNav = TOP_NAV,
  categories = [],
  logo = "/brand/logo-farmatotal.svg",
  brandName = "Farmatotal",
  showTopBar = true,
}: {
  topNav?: NavItem[];
  categories?: NavItem[];
  logo?: string;
  brandName?: string;
  showTopBar?: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 200);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header className="w-full z-40">
        {/* Row 1 — TopBar */}
        {showTopBar && <TopBar topNav={topNav} />}

        {/* Row 2 — Main header (always in normal flow; acts as spacer) */}
        <div className="brand-gradient" style={{ height: "87px" }}>
          <MainHeaderContent topNav={topNav} categories={categories} logo={logo} brandName={brandName} />
        </div>

        {/* Mobile: yellow strip */}
        <div className="lg:hidden bg-brand-yellow text-brand-text text-sm py-2 text-center flex items-center justify-center gap-1">
          <LocationIcon width={14} height={14} stroke="#202435" />
          <span>Sucursal más cercana:&nbsp;</span>
          <SucursalTrigger className="font-semibold" />
        </div>

        {/* Mobile: full-width search */}
        <div className="lg:hidden brand-gradient px-4 pb-3">
          <SearchBar className="w-full" />
        </div>
      </header>

      {/* Sticky clone — slides in from top when scrolled > 200px */}
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-50 brand-gradient shadow-md transition-transform duration-300",
          scrolled ? "translate-y-0" : "-translate-y-full"
        )}
        style={{ height: "87px" }}
        aria-hidden={!scrolled}
      >
        <MainHeaderContent topNav={topNav} categories={categories} logo={logo} brandName={brandName} />
      </div>
    </>
  );
}
