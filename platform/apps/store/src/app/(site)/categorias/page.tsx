import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage } from "@/lib/api";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";

export const metadata: Metadata = { title: "Categorías" };

export default async function CategoriasPage() {
  // El listado de departamentos es un documento del builder (slug `categorias`),
  // editable desde el admin. Debe estar publicado con bloques.
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

  notFound();
}
