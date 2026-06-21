import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { getPage } from "@/lib/api";
import { getActiveTheme } from "@/themes/registry";
import { EkomartCart } from "@/themes/ekomart/pages/EkomartCart";
import { AnvogueCart } from "@/themes/anvogue/pages/AnvogueCart";
import { CartBlock } from "@/components/cms/CartBlock";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";

export const metadata: Metadata = { title: "Carrito" };

export default async function CarritoPage() {
  const theme = await getActiveTheme();
  if (theme === "ekomart") return <EkomartCart />;
  if (theme === "anvogue") return <AnvogueCart />;

  // Farmatotal: el carrito es un documento del builder (slug `carrito`). El
  // CartBlock es un bloque funcional (toda la lógica de carrito embebida).
  const doc = await getPage("carrito").catch(() => null);
  return (
    <main className="flex-1">
      <Breadcrumbs items={[{ label: "Carrito" }]} />
      {doc?.published && Array.isArray(doc.blocks) && doc.blocks.length > 0 ? (
        <ChaiRender blocks={doc.blocks as ChaiBlock[]} />
      ) : (
        <CartBlock />
      )}
    </main>
  );
}
