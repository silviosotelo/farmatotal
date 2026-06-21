import type { Metadata } from "next";
import { listProductsByCategorySlug } from "@/lib/api";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { getActiveTheme } from "@/themes/registry";
import { EkomartCatalog } from "@/themes/ekomart/pages/EkomartCatalog";
import { AnvogueCatalog } from "@/themes/anvogue/pages/AnvogueCatalog";
import { CatalogStockProvider } from "@/themes/CatalogStock";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { name } = await listProductsByCategorySlug(slug, 1);
  return { title: `${name} - Farmatotal` };
}

export default async function CategoriaPage({ params }: Props) {
  const { slug } = await params;
  const { products, name } = await listProductsByCategorySlug(slug, 100);
  const skus = products.map((p) => p.sku).filter((s): s is string => !!s);

  // Categoría tematizada: reusa la grilla del catálogo del tema (sin paginación).
  const theme = await getActiveTheme();
  if (theme === "ekomart") {
    return (
      <CatalogStockProvider skus={skus}>
        <EkomartCatalog products={products} total={products.length} page={1} title={name} basePath={`/categorias/${slug}`} paginated={false} />
      </CatalogStockProvider>
    );
  }
  if (theme === "anvogue") {
    return (
      <CatalogStockProvider skus={skus}>
        <AnvogueCatalog products={products} total={products.length} page={1} title={name} basePath={`/categorias/${slug}`} paginated={false} />
      </CatalogStockProvider>
    );
  }

  return (
    <CatalogStockProvider skus={skus}>
    <main className="flex-1">
      <Breadcrumbs items={[{ label: name }]} />
      <h1 className="sr-only">{name}</h1>
      <div className="ft-container py-6">
        <ProductGrid products={products} />
      </div>
    </main>
    </CatalogStockProvider>
  );
}
