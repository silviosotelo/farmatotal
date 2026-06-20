import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage } from "@/lib/api";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import PuckRender from "@/components/cms/PuckRender";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";
import type { Data } from "@measured/puck";

type Args = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return { title: "Página no encontrada - Farmatotal" };
  return {
    title: page.seo?.title || `${page.title} - Farmatotal`,
    description: page.seo?.description,
  };
}

export default async function CmsPage({ params }: Args) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page || !page.published) notFound();

  const blocks = page.blocks as unknown;
  // Nuevo formato del editor visual (Chai): array plano de bloques.
  const isChai = Array.isArray(blocks);
  // Legacy Puck: objeto { content, root, zones }.
  const puckData =
    blocks && typeof blocks === "object" && !Array.isArray(blocks) && "content" in (blocks as object)
      ? (blocks as Data)
      : ({ content: [], root: {} } as unknown as Data);

  return (
    <main className="flex-1">
      <Breadcrumbs items={[{ label: page.title }]} />
      <div className="ft-container py-6">
        {isChai ? (
          <ChaiRender blocks={blocks as ChaiBlock[]} />
        ) : (
          <PuckRender data={puckData} />
        )}
      </div>
    </main>
  );
}
