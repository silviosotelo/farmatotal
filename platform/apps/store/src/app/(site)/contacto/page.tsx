import type { Metadata } from "next";
import { getPage } from "@/lib/api";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";
import { ContactForm } from "@/components/sections/ContactForm";

const SLUG = "contacto";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage(SLUG);
  return {
    title: page?.seo?.title || page?.title || "Contacto",
    description: page?.seo?.description,
  };
}

/**
 * Contacto híbrido: el contenido editable (constructor visual, slug `contacto`)
 * se renderiza arriba; debajo se mantiene el formulario funcional de contacto.
 */
export default async function ContactoPage() {
  const page = await getPage(SLUG);
  const blocks =
    page?.published && Array.isArray(page.blocks) ? (page.blocks as ChaiBlock[]) : null;

  return (
    <main className="flex-1">
      <Breadcrumbs items={[{ label: page?.title || "Contacto" }]} />
      <div className="ft-container py-6">
        {blocks && <ChaiRender blocks={blocks} />}
        <div className="mt-8">
          <ContactForm />
        </div>
      </div>
    </main>
  );
}
