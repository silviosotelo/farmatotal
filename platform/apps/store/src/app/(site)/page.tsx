import { getPage } from "@/lib/api";
import PuckRender from "@/components/cms/PuckRender";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";
import type { Data } from "@measured/puck";
import { getActiveTheme } from "@/themes/registry";
import { EkomartHome } from "@/themes/ekomart/EkomartHome";
import { AnvogueHome } from "@/themes/anvogue/AnvogueHome";

// Detección de formato de bloques de la página "home".
function hasPuckBlocks(blocks: unknown): blocks is Data {
  return (
    !!blocks &&
    typeof blocks === "object" &&
    !Array.isArray(blocks) &&
    "content" in (blocks as object) &&
    Array.isArray((blocks as { content: unknown[] }).content) &&
    (blocks as { content: unknown[] }).content.length > 0
  );
}
function hasChaiBlocks(blocks: unknown): blocks is ChaiBlock[] {
  return Array.isArray(blocks) && blocks.length > 0;
}

export default async function Home() {
  const theme = await getActiveTheme();

  // Home nativo, system-driven (consume datos del backend). Ya NO usamos el page
  // builder para el home: cada tema renderiza su propia composición nativa.
  if (theme === "ekomart") {
    return <EkomartHome />;
  }
  if (theme === "anvogue") {
    return <AnvogueHome />;
  }
  // farmatotal (default): home builder interino hasta migrar a home nativo.
  const page = await getPage("home").catch(() => null);
  if (page?.published && hasChaiBlocks(page.blocks)) {
    return (
      <main className="flex-1 pb-14">
        <h1 className="sr-only">Tu tienda online</h1>
        <ChaiRender blocks={page.blocks as ChaiBlock[]} />
      </main>
    );
  }
  return (
    <main className="flex-1 pb-14">
      <h1 className="sr-only">Tu tienda online</h1>
      {hasPuckBlocks(page?.blocks) ? <PuckRender data={page!.blocks as Data} /> : null}
    </main>
  );
}
