import { getPage } from "@/lib/api";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";

export default async function HomePage() {
  const page = await getPage("home").catch(() => null);
  if (!page?.blocks || !Array.isArray(page.blocks) || page.blocks.length === 0) {
    return (
      <div className="ft-container py-20 text-center">
        <h1>Bienvenido a tu tienda</h1>
        <p>Configurá tu homepage desde el CMS.</p>
      </div>
    );
  }
  return <ChaiRender blocks={page.blocks as ChaiBlock[]} />;
}
