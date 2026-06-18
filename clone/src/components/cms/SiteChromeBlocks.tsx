import Header from "@/components/sections/Header";
import Footer from "@/components/sections/Footer";
import CmsZone from "@/components/cms/CmsZone";
import { getHeaderConfig, getFooterConfig, getStoreConfig } from "@/lib/api";

/**
 * Bloques funcionales de chrome para el builder (estilo Theme Builder de
 * Elementor: header/footer como plantillas). Son server components que cargan su
 * config (header_config / footer_config / store_config) y renderizan el Header /
 * Footer reales con todas sus partes interactivas (buscador, mega-menú,
 * carrito, sucursal). Se colocan en los documentos `header` / `footer`.
 */
export async function SiteHeaderBlock({ showTopBar = true }: { showTopBar?: boolean } = {}) {
  const [header, store] = await Promise.all([
    getHeaderConfig().catch(() => null),
    getStoreConfig().catch(() => null),
  ]);
  return (
    <Header
      topNav={header?.topNav}
      categories={header?.categories}
      logo={store?.logoUrl}
      brandName={store?.brandName}
      showTopBar={showTopBar}
    />
  );
}

export async function SiteFooterBlock() {
  const footer = await getFooterConfig().catch(() => null);
  return (
    <>
      {/* Zona editable global antes del footer (widget-area estilo WP) */}
      <CmsZone zone="footer-top" />
      <Footer copyright={footer?.copyright} partner={footer?.partner} />
    </>
  );
}
