import Link from "next/link";
import type { ThemeCatalogProps } from "@/themes/types";
import { EkomartProductCard } from "../EkomartProductCard";

const PAGE_SIZE = 48;

/** Construye una ventana de números de página alrededor de la página actual. */
function pageWindow(current: number, total: number): number[] {
  const span = 2;
  let start = Math.max(1, current - span);
  let end = Math.min(total, current + span);
  // Mantener un ancho estable de hasta 5 números cuando sea posible.
  if (end - start < 4) {
    if (start === 1) end = Math.min(total, start + 4);
    else if (end === total) start = Math.max(1, end - 4);
  }
  const pages: number[] = [];
  for (let p = start; p <= end; p += 1) pages.push(p);
  return pages;
}

/**
 * Página de catálogo en estilo Ekomart (markup rts-* + grilla Bootstrap).
 * Server component: el fetch lo hace la ruta del clone y pasa los datos por props.
 */
export function EkomartCatalog({ products, total, page, title, basePath, paginated }: ThemeCatalogProps) {
  const base = basePath ?? "/catalogo";
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const current = Math.min(Math.max(page, 1), Math.max(totalPages, 1));
  const pages = pageWindow(current, totalPages);
  const showPagination = paginated !== false && totalPages > 1;

  return (
    <div className="shop-page">
      {/* Breadcrumb */}
      <div className="rts-navigation-area-breadcrumb bg_light-1">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="navigator-breadcrumb-wrapper">
                <Link href="/">Inicio</Link>
                <i className="fa-regular fa-chevron-right" />
                <span className="current">Catálogo</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-seperator bg_light-1">
        <div className="container">
          <hr className="section-seperator" />
        </div>
      </div>

      <div className="shop-grid-sidebar-area rts-section-gap">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="title-area-between mb--30">
                <h2 className="title-left mb-0">{title}</h2>
              </div>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="row">
              <div className="col-12 text-center py-5">
                <i className="fa-light fa-box-open" />
                <h4 className="mt--20">Sin productos</h4>
              </div>
            </div>
          ) : (
            <>
              <div className="row g-4">
                {products.map((product) => (
                  <div
                    key={product.slug}
                    className="col-xl-3 col-lg-4 col-md-6 col-sm-6"
                  >
                    <EkomartProductCard product={product} />
                  </div>
                ))}
              </div>

              {showPagination && (
                <div className="row">
                  <div className="col-lg-12">
                    <div className="rts-pagination-area text-center mt--50">
                      <ul className="pagination justify-content-center align-items-center">
                        {current > 1 && (
                          <li>
                            <Link
                              href={`${base}?page=${current - 1}`}
                              aria-label="Página anterior"
                            >
                              <i className="fa-regular fa-chevron-left" />
                            </Link>
                          </li>
                        )}

                        {pages[0] > 1 && (
                          <>
                            <li>
                              <Link href={`${base}?page=1`}>1</Link>
                            </li>
                            {pages[0] > 2 && (
                              <li className="dots">
                                <span>...</span>
                              </li>
                            )}
                          </>
                        )}

                        {pages.map((p) => (
                          <li key={p} className={p === current ? "active" : ""}>
                            <Link href={`${base}?page=${p}`}>{p}</Link>
                          </li>
                        ))}

                        {pages[pages.length - 1] < totalPages && (
                          <>
                            {pages[pages.length - 1] < totalPages - 1 && (
                              <li className="dots">
                                <span>...</span>
                              </li>
                            )}
                            <li>
                              <Link href={`${base}?page=${totalPages}`}>
                                {totalPages}
                              </Link>
                            </li>
                          </>
                        )}

                        {current < totalPages && (
                          <li>
                            <Link
                              href={`${base}?page=${current + 1}`}
                              aria-label="Página siguiente"
                            >
                              <i className="fa-regular fa-chevron-right" />
                            </Link>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
