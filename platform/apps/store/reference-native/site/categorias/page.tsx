import type { Metadata } from "next";
import { getPage } from "@/lib/api";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { CategoryBlock } from "@/components/cms/CategoryBlock";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";

export const metadata: Metadata = { title: "Categorías" };

export default async function CategoriasPage() {
  // El listado de departamentos es un documento del builder (slug `categorias`),
  // editable desde el admin. Si está publicado y tiene bloques, manda el builder;
  // si no, cae al listado nativo data-bound (CategoryBlock) como respaldo.
  const page = await getPage("categorias").catch(() => null);
  if (page?.published && Array.isArray(page.blocks) && page.blocks.length > 0) {
    return (
      <main className="flex-1">
        <Breadcrumbs items={[{ label: page.title || "Categorías" }]} />
        <h1 className="sr-only">Categorías</h1>
        <ChaiRender blocks={page.blocks as ChaiBlock[]} />
      </main>
    );
  }

  // Fallback nativo: el árbol de categorías del tenant en vivo desde el API
  // (`/catalog/categories/tree` vía CategoryBlock). CategoryBlock ya provee su
  // propio `ft-container`/heading, así que se renderiza sin envoltorio extra.
  return (
    <main className="flex-1">
      <Breadcrumbs items={[{ label: "Categorías" }]} />
      <h1 className="sr-only">Categorías</h1>
      <CategoryBlock />
    </main>
  );
}
