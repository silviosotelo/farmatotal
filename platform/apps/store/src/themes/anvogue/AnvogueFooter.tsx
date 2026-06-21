import Link from "next/link";
import { ArrowRight, Send } from "lucide-react";

/**
 * Footer del tema Anvogue (fashion): columnas (info, accesos rápidos, atención),
 * newsletter y barra inferior. White-label vía brandName (fallback "Tienda").
 * Fondo gris claro (#F7F7F7) con texto negro/gris — palette propia de Anvogue.
 */
export function AnvogueFooter({ brandName }: { brandName?: string }) {
  const name = brandName || "Tienda";
  const year = new Date().getFullYear();

  return (
    <footer className="anvogue-footer mt-20 bg-[#F7F7F7] text-[#1F1F1F]">
      <div className="mx-auto max-w-[1322px] px-4">
        <div className="flex flex-wrap justify-between gap-y-10 py-14">
          {/* marca + contacto */}
          <div className="basis-full pr-7 lg:basis-1/4">
            <Link href="/" className="text-xl font-bold uppercase tracking-[0.18em]">
              {name}
            </Link>
            <div className="mt-4 flex gap-3 text-sm">
              <div className="flex flex-col gap-3 font-semibold">
                <span>Mail:</span>
                <span>Tel:</span>
                <span>Dirección:</span>
              </div>
              <div className="flex flex-col gap-3 text-[#696C70]">
                <span>hola@tienda.com</span>
                <span>+595 21 000 000</span>
                <span>Asunción, Paraguay</span>
              </div>
            </div>
          </div>

          {/* columnas de enlaces + newsletter */}
          <div className="flex basis-full flex-wrap gap-y-10 lg:basis-3/4">
            <div className="flex basis-full justify-between gap-4 md:basis-2/3">
              <div className="flex basis-1/3 flex-col gap-2">
                <div className="pb-2 text-sm font-semibold uppercase tracking-[0.06em]">
                  Información
                </div>
                <FooterLink href="/sucursales/">Sucursales</FooterLink>
                <FooterLink href="/cuenta">Mi cuenta</FooterLink>
                <FooterLink href="/rastrear-pedido/">Mis pedidos</FooterLink>
                <FooterLink href="/productos">Productos</FooterLink>
              </div>
              <div className="flex basis-1/3 flex-col gap-2">
                <div className="pb-2 text-sm font-semibold uppercase tracking-[0.06em]">
                  Comprar
                </div>
                <FooterLink href="/productos">Novedades</FooterLink>
                <FooterLink href="/categorias/ofertas/">Ofertas</FooterLink>
                <FooterLink href="/categorias/">Categorías</FooterLink>
                <FooterLink href="/carrito">Carrito</FooterLink>
              </div>
              <div className="flex basis-1/3 flex-col gap-2">
                <div className="pb-2 text-sm font-semibold uppercase tracking-[0.06em]">
                  Atención
                </div>
                <FooterLink href="/rastrear-pedido/">Seguimiento</FooterLink>
                <FooterLink href="/sucursales/">Envíos</FooterLink>
                <FooterLink href="/cuenta">Devoluciones</FooterLink>
              </div>
            </div>

            {/* newsletter */}
            <div className="basis-full pl-0 md:basis-1/3 md:pl-7">
              <div className="text-sm font-semibold uppercase tracking-[0.06em]">Newsletter</div>
              <p className="mt-3 text-sm text-[#696C70]">
                Suscribite para recibir novedades y ofertas.
              </p>
              <form action="#" className="relative mt-4 h-[52px] w-full">
                <input
                  type="email"
                  placeholder="Ingresá tu e-mail"
                  className="h-full w-full rounded-xl border border-[#E9E9E9] bg-white pl-4 pr-14 text-sm focus:border-[#1F1F1F] focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label="Suscribirse"
                  className="absolute right-1 top-1 flex h-[44px] w-[44px] items-center justify-center rounded-xl bg-[#1F1F1F] text-white transition-colors hover:bg-[var(--brand-orange)]"
                >
                  <ArrowRight size={22} />
                </button>
              </form>
              <div className="mt-5 flex items-center gap-3 text-sm text-[#696C70]">
                <Send size={18} className="text-[#1F1F1F]" />
                <span>Seguinos en redes</span>
              </div>
            </div>
          </div>
        </div>

        {/* barra inferior */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E9E9E9] py-5 text-sm text-[#696C70] md:flex-row">
          <div>
            © {year} {name}. Todos los derechos reservados.
          </div>
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/themes/anvogue/images/payment/Frame-0.png" alt="" className="h-6 w-auto" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/themes/anvogue/images/payment/Frame-1.png" alt="" className="h-6 w-auto" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/themes/anvogue/images/payment/Frame-2.png" alt="" className="h-6 w-auto" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/themes/anvogue/images/payment/Frame-3.png" alt="" className="h-6 w-auto" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/themes/anvogue/images/payment/Frame-4.png" alt="" className="h-6 w-auto" />
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="w-fit text-sm text-[#696C70] transition-colors hover:text-[#1F1F1F]"
    >
      {children}
    </Link>
  );
}
