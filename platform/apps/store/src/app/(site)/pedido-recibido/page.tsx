import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage } from "@/lib/api";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";

export const metadata: Metadata = { title: "Pedido recibido" };

function hasChaiBlocks(blocks: unknown): blocks is ChaiBlock[] {
  return Array.isArray(blocks) && blocks.length > 0;
}

export default async function PedidoRecibidoPage() {
  // Confirmación de pedido construida en el builder (editable, data-bound al
  // backend vía OrderConfirmationBlock). El doc "pedido-recibido" debe estar
  // publicado con bloques.
  const page = await getPage("pedido-recibido").catch(() => null);
  if (page?.published && hasChaiBlocks(page.blocks)) {
    return (
      <main className="flex-1">
        <ChaiRender blocks={page.blocks as ChaiBlock[]} />
      </main>
    );
  }

  notFound();
}
