import { notFound } from "next/navigation";
import { getActiveTheme } from "@/themes/registry";
import { EkomartHome } from "@/themes/ekomart/EkomartHome";
import { AnvogueHome } from "@/themes/anvogue/AnvogueHome";
import { getPage } from "@/lib/api";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";

function hasChaiBlocks(blocks: unknown): blocks is ChaiBlock[] {
  return Array.isArray(blocks) && blocks.length > 0;
}

function HomeFallback() {
  return (
    <main className="flex-1 pb-14">
      <div className="ft-container py-10">
        <div className="text-center mb-12">
          <h1 className="font-heading text-3xl text-brand-text mb-2">Tu tienda online</h1>
          <p className="text-sm text-brand-muted">Configura tu homepage desde el CMS del admin.</p>
        </div>
      </div>
    </main>
  );
}

export default async function Home() {
  const theme = await getActiveTheme();

  if (theme === "ekomart") {
    return <EkomartHome />;
  }
  if (theme === "anvogue") {
    return <AnvogueHome />;
  }

  const page = await getPage("home").catch(() => null);
  if (page?.published && hasChaiBlocks(page.blocks)) {
    return (
      <main className="flex-1 pb-14">
        <h1 className="sr-only">Tu tienda online</h1>
        <ChaiRender blocks={page.blocks as ChaiBlock[]} />
      </main>
    );
  }

  return <HomeFallback />;
}
