import { notFound } from "next/navigation";
import { getPage } from "@/lib/api";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";

function hasChaiBlocks(blocks: unknown): blocks is ChaiBlock[] {
  return Array.isArray(blocks) && blocks.length > 0;
}

export default async function MiCuentaPage() {
  // Mi cuenta construido en el builder (editable, AccountBlock data-bound al
  // backend). El doc "mi-cuenta" debe estar publicado con bloques.
  const page = await getPage("mi-cuenta").catch(() => null);
  if (page?.published && hasChaiBlocks(page.blocks)) {
    return (
      <main className="flex-1">
        <h1 className="sr-only">Mi Cuenta</h1>
        <ChaiRender blocks={page.blocks as ChaiBlock[]} />
      </main>
    );
  }
  notFound();
}
