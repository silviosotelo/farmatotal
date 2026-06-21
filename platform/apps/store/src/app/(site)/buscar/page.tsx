import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage } from "@/lib/api";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";

export const metadata: Metadata = { title: "Buscar" };

export default async function BuscarPage() {
  // Búsqueda construida en el builder (slug `buscar`). El SearchBlock es data-bound
  // y lee `?q=` de la URL. El doc debe estar publicado con bloques.
  const doc = await getPage("buscar").catch(() => null);
  if (doc?.published && Array.isArray(doc.blocks) && doc.blocks.length > 0) {
    return (
      <main className="flex-1">
        <Breadcrumbs items={[{ label: "Catálogo", href: "/catalogo" }, { label: doc.title || "Búsqueda" }]} />
        <h1 className="sr-only">Búsqueda</h1>
        <ChaiRender blocks={doc.blocks as ChaiBlock[]} />
      </main>
    );
  }

  notFound();
}
