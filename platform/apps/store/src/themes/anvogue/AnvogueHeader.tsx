import Link from "next/link";
import { User, Heart, ShoppingBag } from "lucide-react";
import { AnvogueSearch } from "./AnvogueSearch";

/**
 * Header del tema Anvogue (fashion/retail, blanco y negro con acento rojo).
 * White-label: usa brandName (fallback "Tienda") y un logo opcional. Reproduce
 * el look de Anvogue con clases Tailwind (top bar negro + barra principal blanca).
 */
export function AnvogueHeader({ brandName, logo }: { brandName?: string; logo?: string }) {
  const name = brandName || "Tienda";

  return (
    <header className="anvogue-header w-full border-b border-[#E9E9E9] bg-white">
      {/* top bar — slogan sobre fondo negro */}
      <div className="bg-[#1F1F1F] text-white">
        <div className="mx-auto flex h-10 max-w-[1322px] items-center justify-center px-4 text-center text-xs font-semibold uppercase tracking-[0.08em] sm:justify-between">
          <span className="hidden sm:block text-[#A0A0A0]">Envío en todo el país</span>
          <span>Tu tienda online de confianza</span>
          <span className="hidden sm:block text-[#A0A0A0]">Comprá fácil y seguro</span>
        </div>
      </div>

      {/* barra principal — logo + búsqueda + acciones */}
      <div className="mx-auto max-w-[1322px] px-4">
        <div className="flex h-[74px] items-center justify-between gap-6">
          {/* logo */}
          <Link href="/" className="flex shrink-0 items-center">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={name} className="h-9 w-auto" />
            ) : (
              <span className="text-2xl font-bold uppercase tracking-[0.18em] text-[#1F1F1F]">
                {name}
              </span>
            )}
          </Link>

          {/* nav desktop */}
          <nav className="hidden lg:block">
            <ul className="flex items-center gap-8 text-sm font-semibold uppercase tracking-[0.06em] text-[#1F1F1F]">
              <li>
                <Link href="/" className="transition-colors hover:text-[var(--brand-orange)]">
                  Inicio
                </Link>
              </li>
              <li>
                <Link href="/productos" className="transition-colors hover:text-[var(--brand-orange)]">
                  Productos
                </Link>
              </li>
              <li>
                <Link href="/categorias/" className="transition-colors hover:text-[var(--brand-orange)]">
                  Categorías
                </Link>
              </li>
            </ul>
          </nav>

          {/* búsqueda */}
          <div className="hidden max-w-[360px] flex-1 md:block">
            <AnvogueSearch />
          </div>

          {/* acciones */}
          <div className="flex items-center gap-5 text-[#1F1F1F]">
            <Link
              href="/cuenta"
              aria-label="Mi cuenta"
              className="transition-colors hover:text-[var(--brand-orange)]"
            >
              <User size={22} />
            </Link>
            <Link
              href="/productos"
              aria-label="Favoritos"
              className="hidden transition-colors hover:text-[var(--brand-orange)] sm:block"
            >
              <Heart size={22} />
            </Link>
            <Link
              href="/carrito"
              aria-label="Carrito"
              className="relative transition-colors hover:text-[var(--brand-orange)]"
            >
              <ShoppingBag size={22} />
            </Link>
          </div>
        </div>

        {/* búsqueda mobile */}
        <div className="pb-3 md:hidden">
          <AnvogueSearch />
        </div>
      </div>
    </header>
  );
}
