import type { Metadata } from "next";
import { listProducts } from "@/lib/api";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ProductGrid } from "@/components/shop/ProductGrid";
import CmsZone from "@/components/cms/CmsZone";
import { getActiveTheme } from "@/themes/registry";
import { EkomartCatalog } from "@/themes/ekomart/pages/EkomartCatalog";
import { AnvogueCatalog } from "@/themes/anvogue/pages/AnvogueCatalog";
import { CatalogStockProvider } from "@/themes/CatalogStock";

export const metadata: Metadata = { title: "Catálogo - Farmatotal" };

type Args = { searchParams: Promise<{ page?: string }> };

export default async function CatalogoPage({ searchParams }: Args) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { products, total } = await listProducts({ page, perPage: 48 });
  const skus = products.map((p) => p.sku).filter((s): s is string => !!s);

  const theme = await getActiveTheme();
  const title = `Catálogo (${total.toLocaleString("es-PY")})`;
  if (theme === "ekomart") {
    return (
      <CatalogStockProvider skus={skus}>
        <EkomartCatalog products={products} total={total} page={page} title={title} />
      </CatalogStockProvider>
    );
  }
  if (theme === "anvogue") {
    return (
      <CatalogStockProvider skus={skus}>
        <AnvogueCatalog products={products} total={total} page={page} title={title} />
      </CatalogStockProvider>
    );
  }

  return (
    <CatalogStockProvider skus={skus}>
    <main className="flex-1">
      <Breadcrumbs items={[{ label: "Catálogo" }]} />
      <h1 className="sr-only">Catálogo</h1>
      {/* Zona editable arriba del catálogo (banners, promos) */}
      <CmsZone zone="catalogo-top" />
      <div className="ft-container py-6">
        <ProductGrid products={products} title={`Catálogo (${total.toLocaleString("es-PY")})`} />
      </div>
    </main>
    </CatalogStockProvider>
  );
}
