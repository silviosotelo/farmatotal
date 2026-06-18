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

  // Override por contenido: si el admin armó una página "home" en el builder
  // (bloques Chai), esa composición manda y se renderiza con el estilo del tema
  // activo (ChaiRender es theme-aware). Aplica a cualquier tema.
  const page = await getPage("home").catch(() => null);
  if (page?.published && hasChaiBlocks(page.blocks)) {
    return (
      <main className="flex-1 pb-14">
        <h1 className="sr-only">Tu tienda online</h1>
        <ChaiRender blocks={page.blocks as ChaiBlock[]} />
      </main>
    );
  }

  // Sin página "home" del builder: home por defecto del tema.
  if (theme === "ekomart") {
    return <EkomartHome />;
  }
  if (theme === "anvogue") {
    return <AnvogueHome />;
  }
  return (
    <main className="flex-1 pb-14">
      <h1 className="sr-only">Tu tienda online</h1>
      {hasPuckBlocks(page?.blocks) ? <PuckRender data={page!.blocks as Data} /> : null}
    </main>
  );
}
