import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { getPage } from "@/lib/api";
import { getActiveTheme } from "@/themes/registry";
import { EkomartCheckout } from "@/themes/ekomart/pages/EkomartCheckout";
import { AnvogueCheckout } from "@/themes/anvogue/pages/AnvogueCheckout";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";

export const metadata: Metadata = { title: "Finalizar compra" };

export default async function CajaPage() {
  const theme = await getActiveTheme();
  if (theme === "ekomart") return <EkomartCheckout />;
  if (theme === "anvogue") return <AnvogueCheckout />;

  // Farmatotal: el checkout es un documento del builder (slug `checkout`). El
  // CheckoutBlock (formulario + orden + Bancard) debe vivir en ese doc publicado.
  const doc = await getPage("checkout").catch(() => null);
  if (doc?.published && Array.isArray(doc.blocks) && doc.blocks.length > 0) {
    return (
      <main className="flex-1">
        <Breadcrumbs items={[{ label: "Finalizar compra" }]} />
        <ChaiRender blocks={doc.blocks as ChaiBlock[]} />
      </main>
    );
  }

  notFound();
}
