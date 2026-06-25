import type { Metadata } from "next";
import { getPage } from "@/lib/api";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";

export const metadata: Metadata = { title: "Catálogo - Farmatotal" };

export default async function CatalogPage() {
  const page = await getPage("catalogo").catch(() => null);
  if (!page?.blocks || !Array.isArray(page.blocks) || page.blocks.length === 0) {
    return (
      <div className="ft-container py-20 text-center">
        <h1>Catálogo</h1>
        <p>Configurá tu catálogo desde el CMS.</p>
      </div>
    );
  }
  return <ChaiRender blocks={page.blocks as ChaiBlock[]} />;
}
