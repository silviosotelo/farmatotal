import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { getPage } from "@/lib/api";
import { getActiveTheme } from "@/themes/registry";
import { EkomartCart } from "@/themes/ekomart/pages/EkomartCart";
import { AnvogueCart } from "@/themes/anvogue/pages/AnvogueCart";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";

export const metadata: Metadata = { title: "Carrito" };

export default async function CarritoPage() {
  const theme = await getActiveTheme();
  if (theme === "ekomart") return <EkomartCart />;
  if (theme === "anvogue") return <AnvogueCart />;

  // Farmatotal: el carrito es un documento del builder (slug `carrito`). El
  // CartBlock (lógica de carrito embebida) debe vivir en ese doc publicado.
  const doc = await getPage("carrito").catch(() => null);
  if (doc?.published && Array.isArray(doc.blocks) && doc.blocks.length > 0) {
    return (
      <main className="flex-1">
        <Breadcrumbs items={[{ label: "Carrito" }]} />
        <ChaiRender blocks={doc.blocks as ChaiBlock[]} />
      </main>
    );
  }

  notFound();
}
