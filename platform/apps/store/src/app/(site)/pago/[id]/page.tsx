import type { Metadata } from "next";
import { getPage } from "@/lib/api";
import { PaymentBlock } from "@/components/cms/PaymentBlock";
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender";

export const metadata: Metadata = { title: "Pago" };

export default async function PagoPage() {
  // Farmatotal: el pago es un documento del builder (slug `pago`). El PaymentBlock
  // es un bloque funcional (monta el iframe oficial de Bancard vPOS 4.0 vía SDK y
  // toma el orderId de la ruta /pago/[id]). Si el doc está publicado, manda el
  // builder; si no, cae al bloque funcional nativo como respaldo.
  const doc = await getPage("pago").catch(() => null);
  return (
    <main className="flex-1">
      {doc?.published && Array.isArray(doc.blocks) && doc.blocks.length > 0 ? (
        <ChaiRender blocks={doc.blocks as ChaiBlock[]} />
      ) : (
        <PaymentBlock />
      )}
    </main>
  );
}
