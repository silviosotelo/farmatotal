import { notFound } from "next/navigation";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";

/**
 * Vista previa de una página del constructor con el render REAL del store
 * (componentes + CSS del template + tema de marca, vía el layout (site)).
 *
 * A diferencia del home, NO exige `published`: muestra el estado guardado actual
 * (también borradores) para que el editor pueda "ver la página real" antes de
 * publicar. Siempre fresco (force-dynamic + no-store).
 */
export const dynamic = "force-dynamic";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type BackendPage = { id: string; slug: string; title: string; blocks: unknown; published: boolean };

async function getPageFresh(slug: string): Promise<BackendPage | null> {
  const tenant = process.env.STORE_TENANT || "default";
  const res = await fetch(`${API}/cms/pages/by-slug/${encodeURIComponent(slug)}`, {
    cache: "no-store",
    headers: { "x-tenant": tenant },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getPageFresh ${res.status}`);
  return (await res.json()) as BackendPage;
}

export default async function PreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPageFresh(slug).catch(() => null);
  if (!page) notFound();
  const blocks = Array.isArray(page.blocks) ? (page.blocks as ChaiBlock[]) : [];
  return (
    <main className="flex-1 pb-14">
      <ChaiRender blocks={blocks} />
    </main>
  );
}
