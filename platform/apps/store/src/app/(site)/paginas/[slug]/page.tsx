import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage } from "@/lib/api";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";

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

  if (!Array.isArray(page.blocks) || page.blocks.length === 0) notFound();

  return (
    <main className="flex-1">
      <Breadcrumbs items={[{ label: page.title }]} />
      <div className="ft-container py-6">
        <ChaiRender blocks={page.blocks as ChaiBlock[]} />
      </div>
    </main>
  );
}
