import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage } from "@/lib/api";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";

const SLUG = "contacto";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage(SLUG);
  return {
    title: page?.seo?.title || page?.title || "Contacto",
    description: page?.seo?.description,
  };
}

/**
 * Contacto: 100% editable desde el constructor visual (slug `contacto`),
 * incluido el bloque de formulario funcional. Debe estar publicado con bloques.
 */
export default async function ContactoPage() {
  const page = await getPage(SLUG).catch(() => null);
  if (page?.published && Array.isArray(page.blocks) && page.blocks.length > 0) {
    return (
      <main className="flex-1">
        <Breadcrumbs items={[{ label: page.title || "Contacto" }]} />
        <div className="ft-container py-6">
          <ChaiRender blocks={page.blocks as ChaiBlock[]} />
        </div>
      </main>
    );
  }

  notFound();
}
