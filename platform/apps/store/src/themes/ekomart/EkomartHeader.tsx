import Link from "next/link";
import { EkomartSearch } from "./EkomartSearch";

/**
 * Header del tema Ekomart, cableado a nuestras rutas. White-label: usa brandName
 * (fallback "Tienda") y un logo opcional. La búsqueda es un subcomponente cliente.
 */
export function EkomartHeader({ brandName, logo }: { brandName?: string; logo?: string }) {
  const name = brandName || "Tienda";

  return (
    <div className="rts-header-one-area-one">
      {/* top bar */}
      <div className="header-top-area">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="bwtween-area-header-top">
                <div className="discount-area">
                  <p className="disc">Envío gratis en tu primera compra. Aprovechá nuestras ofertas.</p>
                </div>
                <div className="contact-number-area">
                  <p>
                    ¿Necesitás ayuda? <Link href="/sucursales/">Encontrá tu sucursal</Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* mid bar */}
      <div className="header-mid-one-wrapper">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="header-mid-wrapper-between">
                <div className="nav-sm-left">
                  <ul className="nav-h_top">
                    <li>
                      <Link href="/productos">Productos</Link>
                    </li>
                    <li>
                      <Link href="/categorias/ofertas/">Ofertas</Link>
                    </li>
                    <li>
                      <Link href="/cuenta">Mi cuenta</Link>
                    </li>
                  </ul>
                  <p className="para">Comprá online, recibí en tu casa o retirá en sucursal.</p>
                </div>
                <div className="nav-sm-left">
                  <ul className="nav-h_top language">
                    <li>
                      <Link href="/rastrear-pedido/">Rastrear pedido</Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* logo + search + actions */}
      <div className="search-header-area-main">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="logo-search-category-wrapper">
                <Link href="/" className="logo-area">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt={name} className="logo" />
                  ) : (
                    <span className="logo-text">{name}</span>
                  )}
                </Link>

                <div className="category-search-wrapper">
                  <div className="category-btn category-hover-header">
                    <i className="fa-light fa-bars" />
                    <span>
                      <Link href="/categorias/">Categorías</Link>
                    </span>
                  </div>
                  <EkomartSearch />
                </div>

                <div className="accont-wishlist-cart-area-header">
                  <Link href="/productos" className="btn-border-only account">
                    <i className="fa-light fa-grid-2" />
                    <span>Productos</span>
                  </Link>
                  <Link href="/cuenta" className="btn-border-only account">
                    <i className="fa-light fa-user" />
                    <span>Cuenta</span>
                  </Link>
                  <Link href="/carrito" className="btn-border-only account cart-account">
                    <i className="fa-light fa-cart-shopping" />
                    <span>Carrito</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* category nav row */}
      <div className="category-nav-area-wrapper">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <nav className="nav-h_top main-nav-one">
                <ul>
                  <li>
                    <Link href="/">Inicio</Link>
                  </li>
                  <li>
                    <Link href="/productos">Productos</Link>
                  </li>
                  <li>
                    <Link href="/categorias/">Categorías</Link>
                  </li>
                  <li>
                    <Link href="/categorias/ofertas/">Ofertas</Link>
                  </li>
                  <li>
                    <Link href="/sucursales/">Sucursales</Link>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
