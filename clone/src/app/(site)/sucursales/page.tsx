import type { Metadata } from "next";
import { getPage } from "@/lib/api";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";
import { SucursalesList } from "@/components/sections/SucursalesList";

const SLUG = "sucursales";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage(SLUG);
  return {
    title: page?.seo?.title || page?.title || "Sucursales",
    description: page?.seo?.description,
  };
}

/**
 * Sucursales híbrido: el contenido editable (constructor visual, slug
 * `sucursales`) se renderiza arriba; debajo, el widget funcional con filtro por
 * zona, geolocalización y listado.
 */
export default async function SucursalesPage() {
  const page = await getPage(SLUG);
  const blocks =
    page?.published && Array.isArray(page.blocks) ? (page.blocks as ChaiBlock[]) : null;

  return (
    <main className="flex-1">
      <Breadcrumbs items={[{ label: page?.title || "Sucursales" }]} />
      <div className="ft-container py-6">
        {blocks && <ChaiRender blocks={blocks} />}
        <div className="mt-8">
          <SucursalesList />
        </div>
      </div>
    </main>
  );
}
