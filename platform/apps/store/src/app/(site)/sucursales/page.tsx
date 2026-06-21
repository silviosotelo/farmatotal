import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage } from "@/lib/api";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";

const SLUG = "sucursales";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage(SLUG).catch(() => null);
  return {
    title: page?.seo?.title || page?.title || "Sucursales",
    description: page?.seo?.description,
  };
}

/**
 * Sucursales construido en el builder (slug `sucursales`, bloques data-bound que
 * consumen el backend). El doc debe estar publicado con bloques.
 */
export default async function SucursalesPage() {
  const page = await getPage(SLUG).catch(() => null);
  if (page?.published && Array.isArray(page.blocks) && page.blocks.length > 0) {
    return (
      <main className="flex-1">
        <Breadcrumbs items={[{ label: page.title || "Sucursales" }]} />
        <h1 className="sr-only">Sucursales</h1>
        <ChaiRender blocks={page.blocks as ChaiBlock[]} />
      </main>
    );
  }

  notFound();
}
