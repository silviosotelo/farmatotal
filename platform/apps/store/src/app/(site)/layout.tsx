import type { Metadata } from "next";
import { Inter, Dosis } from "next/font/google";
import "../globals.css";
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
import { getHeaderConfig, getFooterConfig, getStoreConfig, brandColorVars, getTenantFlags } from "@/lib/api";
import { getActiveTheme, getThemeManifest, themeAccentVars } from "@/themes/registry";
import { ThemeProvider } from "@/themes/ThemeProvider";
import StoreHeader from "@/components/commerce/StoreHeader";
import StoreFooter from "@/components/commerce/StoreFooter";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
});

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

function recordToCssVars(record: Record<string, string>): string {
  return Object.entries(record)
    .map(([k, v]) => `${k}: ${v}`)
    .join(";\n");
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [header, footer, store, theme, flags] = await Promise.all([
    getHeaderConfig().catch(() => null),
    getFooterConfig().catch(() => null),
    getStoreConfig().catch(() => null),
    getActiveTheme(),
    getTenantFlags().catch(() => ({ branches: true, inventory: true, variants: true, units: false })),
  ]);

  const manifest = getThemeManifest(theme);
  const brandCss = store ? brandColorVars(store.colors) : "";
  const themeCss = recordToCssVars(themeAccentVars(manifest.tokens));

  return (
    <html
      lang="es"
      className={`${inter.variable} ${dosis.variable} antialiased`}
    >
      <body className="flex min-h-screen flex-col bg-background text-foreground" suppressHydrationWarning>
        {(brandCss || themeCss) && (
          <style dangerouslySetInnerHTML={{ __html: [brandCss, themeCss].filter(Boolean).join("\n") }} />
        )}
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
                  <StoreHeader config={header} tokens={manifest.tokens} />
                  <div id="contenido" className="flex flex-1 flex-col">
                    {children}
                  </div>
                  <StoreFooter config={footer} tokens={manifest.tokens} />
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
