import { notFound } from "next/navigation";
import { getActiveTheme } from "@/themes/registry";
import { EkomartHome } from "@/themes/ekomart/EkomartHome";
import { AnvogueHome } from "@/themes/anvogue/AnvogueHome";
import { getPage } from "@/lib/api";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";

function hasChaiBlocks(blocks: unknown): blocks is ChaiBlock[] {
  return Array.isArray(blocks) && blocks.length > 0;
}

export default async function Home() {
  const theme = await getActiveTheme();

  if (theme === "ekomart") {
    return <EkomartHome />;
  }
  if (theme === "anvogue") {
    return <AnvogueHome />;
  }

  // Farmatotal: home construido en el builder (editable, bloques data-bound que
  // consumen el backend). El doc "home" debe estar publicado con bloques.
  const page = await getPage("home").catch(() => null);
  if (page?.published && hasChaiBlocks(page.blocks)) {
    return (
      <main className="flex-1 pb-14">
        <h1 className="sr-only">Tu tienda online</h1>
        <ChaiRender blocks={page.blocks as ChaiBlock[]} />
      </main>
    );
  }
  notFound();
}
