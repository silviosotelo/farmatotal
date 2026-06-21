import { notFound } from "next/navigation";
import { getPage } from "@/lib/api";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";

function hasChaiBlocks(blocks: unknown): blocks is ChaiBlock[] {
  return Array.isArray(blocks) && blocks.length > 0;
}

export default async function RastrearPedidoPage() {
  // Rastreo de pedido construido en el builder (slug `rastrear-pedido`, editable
  // con el OrderTrackingBlock data-bound al API). El doc debe estar publicado con bloques.
  const page = await getPage("rastrear-pedido").catch(() => null);
  if (page?.published && hasChaiBlocks(page.blocks)) {
    return (
      <main className="flex-1">
        <h1 className="sr-only">¿Dónde está mi pedido?</h1>
        <ChaiRender blocks={page.blocks as ChaiBlock[]} />
      </main>
    );
  }
  notFound();
}
