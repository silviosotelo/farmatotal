import Link from "next/link";
import { Input, Button } from "@platform/ui";

/**
 * Footer del tema Ekomart, white-label (usa brandName, fallback "Tienda").
 */
export function EkomartFooter({ brandName }: { brandName?: string }) {
  const name = brandName || "Tienda";
  const year = new Date().getFullYear();

  return (
    <>
      {/* rts footer one area start */}
      <div className="rts-footer-area pt--80 bg_light-1">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="footer-main-content-wrapper pb--70 pb_sm--30">
                <div className="single-footer-wized">
                  <h3 className="footer-title">{name}</h3>
                  <div className="call-area">
                    <div className="icon">
                      <i className="fa-light fa-headset" />
                    </div>
                    <div className="info">
                      <span>¿Tenés dudas? Estamos para ayudarte</span>
                      <Link href="/sucursales/" className="number">
                        Encontrá tu sucursal
                      </Link>
                    </div>
                  </div>
                  <div className="opening-hour">
                    <div className="single">
                      <p>
                        Lunes - Viernes: <span>8:00 - 20:00</span>
                      </p>
                    </div>
                    <div className="single">
                      <p>
                        Sábados: <span>8:00 - 18:00</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="single-footer-wized">
                  <h3 className="footer-title">Comprar</h3>
                  <div className="footer-nav">
                    <ul>
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
                        <Link href="/carrito">Carrito</Link>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="single-footer-wized">
                  <h3 className="footer-title">Mi cuenta</h3>
                  <div className="footer-nav">
                    <ul>
                      <li>
                        <Link href="/cuenta">Mi cuenta</Link>
                      </li>
                      <li>
                        <Link href="/rastrear-pedido/">Rastrear pedido</Link>
                      </li>
                      <li>
                        <Link href="/sucursales/">Sucursales</Link>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="single-footer-wized">
                  <h3 className="footer-title">Novedades</h3>
                  <p className="disc-news-letter">
                    Suscribite para recibir nuestras ofertas y novedades.
                  </p>
                  <form className="footersubscribe-form" action="#">
                    <Input type="email" placeholder="Tu correo electrónico" required />
                    <Button type="submit" variant="plain" className="rts-btn btn-primary">
                      Suscribirme
                    </Button>
                  </form>
                </div>
              </div>

              <div className="social-and-payment-area-wrapper">
                <div className="social-one-wrapper">
                  <span>Seguinos:</span>
                  <ul>
                    <li>
                      <a href="#" aria-label="Facebook">
                        <i className="fa-brands fa-facebook-f" />
                      </a>
                    </li>
                    <li>
                      <a href="#" aria-label="Instagram">
                        <i className="fa-brands fa-instagram" />
                      </a>
                    </li>
                    <li>
                      <a href="#" aria-label="WhatsApp">
                        <i className="fa-brands fa-whatsapp" />
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* rts footer one area end */}

      {/* rts copyright-area start */}
      <div className="rts-copyright-area">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="copyright-between-1">
                <p className="disc">
                  Copyright {year} © {name}. Todos los derechos reservados.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* rts copyright-area end */}
    </>
  );
}
