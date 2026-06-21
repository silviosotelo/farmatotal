import type { Metadata } from "next";
import { Inter, Dosis } from "next/font/google";
import "../globals.css";
import Header from "@/components/sections/Header";
import Footer from "@/components/sections/Footer";
import FloatingButtons from "@/components/sections/FloatingButtons";
import { SucursalProvider } from "@/components/sucursal/SucursalContext";
import { SucursalModal } from "@/components/sucursal/SucursalModal";
import { ToastProvider } from "@/components/providers/ToastContext";
import { AuthProvider } from "@/components/providers/AuthContext";
import { WishlistProvider } from "@/components/providers/WishlistContext";
import { CartProvider } from "@/components/providers/CartContext";
import { CurrencyProvider } from "@/components/providers/CurrencyContext";
import { FeatureFlagsProvider } from "@/components/providers/FeatureFlagsContext";
import { MiniCart } from "@/components/sections/MiniCart";
import { getHeaderConfig, getFooterConfig, getStoreConfig, brandColorVars, getPage, getTenantFlags } from "@/lib/api";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";
import { getActiveTheme } from "@/themes/registry";
import { ThemeProvider } from "@/themes/ThemeProvider";
import { EkomartChrome } from "@/themes/ekomart/EkomartChrome";
import { AnvogueChrome } from "@/themes/anvogue/AnvogueChrome";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
});

// Production (theme Bacola) loads only Inter (--font-primary) + Dosis (--font-secondary).
// Inter = body + headings (h1-h6); Dosis = prices/countdown/badges/card titles. No Ubuntu.
const dosis = Dosis({
  variable: "--font-price",
  subsets: ["latin", "latin-ext"],
});

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStoreConfig().catch(() => null);
  const brand = store?.brandName ?? "Mi Tienda";
  const desc = store?.description ?? "tu farmacia online. Medicamentos, belleza, higiene y más.";
  const favicon = store?.faviconUrl ?? "/brand/isotipo.svg";
  const locale = (store?.locale ?? "es-PY").replace("-", "_");
  return {
    title: `Inicio - ${brand}`,
    description: desc,
    icons: { icon: favicon, apple: favicon },
    openGraph: {
      title: `Inicio - ${brand}`,
      description: desc,
      siteName: brand,
      locale,
      type: "website",
    },
  };
}

export const viewport = {
  themeColor: "#f16522",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [header, footer, store, theme, headerPage, footerPage, flags] = await Promise.all([
    getHeaderConfig().catch(() => null),
    getFooterConfig().catch(() => null),
    getStoreConfig().catch(() => null),
    getActiveTheme(),
    getPage("header").catch(() => null),
    getPage("footer").catch(() => null),
    getTenantFlags().catch(() => ({ branches: true, inventory: true, variants: true, units: false })),
  ]);
  const brandCss = store ? brandColorVars(store.colors) : "";
  // Theme Builder: si el tenant tiene una plantilla 'header'/'footer' publicada en
  // el builder, se renderiza con el motor; si no, el header/footer nativos.
  const hasBlocks = (b: unknown): b is ChaiBlock[] => Array.isArray(b) && b.length > 0;
  const headerTpl = headerPage?.published && hasBlocks(headerPage.blocks) ? (headerPage.blocks as ChaiBlock[]) : null;
  const footerTpl = footerPage?.published && hasBlocks(footerPage.blocks) ? (footerPage.blocks as ChaiBlock[]) : null;
  return (
    <html
      lang="es"
      className={`${inter.variable} ${dosis.variable} antialiased`}
    >
      <body className="flex min-h-screen flex-col bg-background text-foreground" suppressHydrationWarning>
        {/* White-label: override de tokens de marca por vertical (editable en admin) */}
        {brandCss && <style dangerouslySetInnerHTML={{ __html: brandCss }} />}
        <CurrencyProvider currency={store?.currency ?? "PYG"} locale={store?.locale ?? "es-PY"}>
        <FeatureFlagsProvider flags={flags}>
        <ThemeProvider theme={theme}>
        <ToastProvider>
          <AuthProvider>
            <WishlistProvider>
              <CartProvider>
                <SucursalProvider>
                  <a
                    href="#contenido"
                    className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[3000] focus:rounded-md focus:bg-brand-orange focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
                  >
                    Saltar al contenido
                  </a>
                  {theme === "ekomart" ? (
                    <EkomartChrome store={store}>{children}</EkomartChrome>
                  ) : theme === "anvogue" ? (
                    <AnvogueChrome store={store}>{children}</AnvogueChrome>
                  ) : (
                    <>
                      {/* Header: plantilla del builder (Theme Builder) si existe; si no, nativo. */}
                      {headerTpl ? (
                        <ChaiRender blocks={headerTpl} />
                      ) : (
                        <Header
                          topNav={header?.topNav}
                          categories={header?.categories}
                          logo={store?.logoUrl}
                          brandName={store?.brandName}
                        />
                      )}
                      <div id="contenido" className="flex flex-1 flex-col">
                        {children}
                      </div>
                      {footerTpl ? (
                        <ChaiRender blocks={footerTpl} />
                      ) : (
                        <Footer
                          columns={footer?.columns}
                          copyright={footer?.copyright}
                          partner={footer?.partner}
                        />
                      )}
                    </>
                  )}
                  <FloatingButtons />
                  <SucursalModal />
                  <MiniCart />
                </SucursalProvider>
              </CartProvider>
            </WishlistProvider>
          </AuthProvider>
        </ToastProvider>
        </ThemeProvider>
        </FeatureFlagsProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
