import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ThemeCatalogProps } from "@/themes/types";
import { AnvogueProductCard } from "../AnvogueProductCard";
import { AnvogueBreadcrumb } from "../AnvogueBreadcrumb";
import { container, heading6, buttonMain } from "../sections/anvogueClasses";

const PER_PAGE = 48;

/** Construye la lista de páginas a mostrar alrededor de la actual (ventana de 5). */
function pageWindow(current: number, total: number): number[] {
  const span = 2;
  let start = Math.max(1, current - span);
  let end = Math.min(total, current + span);
  // Mantener una ventana estable de hasta 5 números cuando sea posible.
  if (end - start < 4) {
    if (start === 1) end = Math.min(total, start + 4);
    else if (end === total) start = Math.max(1, end - 4);
  }
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}

/**
 * Página de catálogo del tema Anvogue (fashion/retail minimalista). Server
 * component: recibe los productos ya resueltos por la ruta del clone y arma
 * breadcrumb, encabezado con conteo, grilla de tarjetas y paginación.
 */
export function AnvogueCatalog(props: ThemeCatalogProps) {
  const { products, total, page, title, basePath, paginated } = props;
  const base = basePath ?? "/catalogo";
  const totalPages = Math.ceil(total / PER_PAGE);
  const showPagination = paginated !== false && totalPages > 1;
  const pages = showPagination ? pageWindow(page, totalPages) : [];
  // El título puede venir con el conteo embebido ("Catálogo (3.000)"); para el
  // banner queremos sólo el nombre limpio. El conteo va aparte en la barra.
  const cleanTitle = title.replace(/\s*\(.*\)\s*$/, "").trim();

  return (
    <div className="anvogue-catalog bg-white text-[#1F1F1F]">
      {/* breadcrumb banner (.breadcrumb-block .bg-linear) */}
      <AnvogueBreadcrumb heading={cleanTitle} />

      <div className={`${container} py-10 md:py-14`}>
        {/* list-filtered: conteo de productos */}
        <div className="flex items-center gap-1.5 border-b border-[#E9E9E9] pb-6">
          <span className={heading6}>{total.toLocaleString("es-PY")}</span>
          <span className="text-[#696C70]">
            {total === 1 ? "producto encontrado" : "productos encontrados"}
          </span>
        </div>

        {/* grid */}
        {products.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl bg-[#F7F7F7] py-24 text-center">
            <p className="text-lg font-semibold text-[#1F1F1F]">No hay productos</p>
            <p className="mt-2 text-sm text-[#696C70]">
              Probá con otra categoría o volvé al inicio.
            </p>
            <Link
              href="/productos"
              className={`mt-6 ${buttonMain}`}
            >
              Ver catálogo
            </Link>
          </div>
        ) : (
          <div className="mt-7 grid grid-cols-2 gap-5 sm:grid-cols-3 sm:gap-[30px] lg:grid-cols-4">
            {products.map((product) => (
              <AnvogueProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* pagination */}
        {showPagination && (
          <nav
            aria-label="Paginación"
            className="mt-14 flex items-center justify-center gap-2"
          >
            {page > 1 && (
              <Link
                href={`${base}?page=${page - 1}`}
                aria-label="Página anterior"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E9E9E9] text-[#1F1F1F] transition-colors hover:border-[#1F1F1F]"
              >
                <ChevronLeft size={18} />
              </Link>
            )}

            {pages[0] > 1 && (
              <span className="px-1 text-sm text-[#696C70]">…</span>
            )}

            {pages.map((n) => {
              const active = n === page;
              return (
                <Link
                  key={n}
                  href={`${base}?page=${n}`}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "flex h-10 min-w-10 items-center justify-center rounded-full bg-[#1F1F1F] px-3 text-sm font-semibold text-white"
                      : "flex h-10 min-w-10 items-center justify-center rounded-full border border-[#E9E9E9] px-3 text-sm font-medium text-[#1F1F1F] transition-colors hover:border-[#1F1F1F]"
                  }
                >
                  {n}
                </Link>
              );
            })}

            {pages[pages.length - 1] < totalPages && (
              <span className="px-1 text-sm text-[#696C70]">…</span>
            )}

            {page < totalPages && (
              <Link
                href={`${base}?page=${page + 1}`}
                aria-label="Página siguiente"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E9E9E9] text-[#1F1F1F] transition-colors hover:border-[#1F1F1F]"
              >
                <ChevronRight size={18} />
              </Link>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
