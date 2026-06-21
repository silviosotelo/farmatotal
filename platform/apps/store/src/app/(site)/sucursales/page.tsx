import type { Metadata } from "next";
import { getPage } from "@/lib/api";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";
import { SucursalesList } from "@/components/sections/SucursalesList";

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
 * consumen el backend). Si el doc está publicado, manda el builder; si no, cae al
 * widget nativo (SucursalesList: filtro por zona + geolocalización + listado, que
 * consume las sucursales reales del tenant desde /branches) como respaldo.
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

  // Fallback nativo: el mismo widget data-bound que usa el BranchesBlock del editor.
  return (
    <main className="flex-1">
      <Breadcrumbs items={[{ label: "Sucursales" }]} />
      <h1 className="sr-only">Sucursales</h1>
      <div className="ft-container py-6">
        <SucursalesList />
      </div>
    </main>
  );
}
