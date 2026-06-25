import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage } from "@/lib/api";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";

const SLUG = "politica-de-privacidad";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage(SLUG).catch(() => null);
  if (!page) return { title: "Política de privacidad" };
  return {
    title: page?.seo?.title || page?.title || "Política de privacidad",
    description: page?.seo?.description,
  };
}

/**
 * Página de Política de privacidad: 100% editable desde el constructor visual.
 * El contenido vive en la página CMS con slug `politica-de-privacidad`.
 */
export default async function PoliticaPrivacidadPage() {
  const page = await getPage(SLUG).catch(() => null);
  if (!page || !page.published || !Array.isArray(page.blocks)) notFound();

  return (
    <main className="flex-1">
      <Breadcrumbs items={[{ label: page.title }]} />
      <div className="ft-container py-6">
        <ChaiRender blocks={page.blocks as ChaiBlock[]} />
      </div>
    </main>
  );
}
