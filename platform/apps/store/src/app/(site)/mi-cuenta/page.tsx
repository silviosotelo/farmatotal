import { getPage } from "@/lib/api";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";
import MiCuentaNative from "./MiCuentaNative";

function hasChaiBlocks(blocks: unknown): blocks is ChaiBlock[] {
  return Array.isArray(blocks) && blocks.length > 0;
}

export default async function MiCuentaPage() {
  // Mi cuenta construido en el builder (editable, AccountBlock data-bound al
  // backend). Si el doc "mi-cuenta" está publicado, manda el builder; si no, cae
  // al contenido nativo (mismos datos/API) como respaldo.
  const page = await getPage("mi-cuenta").catch(() => null);
  if (page?.published && hasChaiBlocks(page.blocks)) {
    return (
      <main className="flex-1">
        <h1 className="sr-only">Mi Cuenta</h1>
        <ChaiRender blocks={page.blocks as ChaiBlock[]} />
      </main>
    );
  }
  return <MiCuentaNative />;
}
