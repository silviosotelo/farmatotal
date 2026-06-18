import type { ReactNode } from "react";
import { AnvogueHeader } from "./AnvogueHeader";
import { AnvogueFooter } from "./AnvogueFooter";
import type { StoreConfig } from "@/lib/api";

/**
 * Chrome del tema Anvogue (Tailwind, fashion/retail moderno). Header + footer
 * propios alrededor del contenido. White-label vía store config.
 */
export function AnvogueChrome({
  children,
  store,
}: {
  children: ReactNode;
  store: StoreConfig | null;
}) {
  return (
    <div className="anvogue-theme">
      <AnvogueHeader brandName={store?.brandName} logo={store?.logoUrl} />
      <div id="contenido">{children}</div>
      <AnvogueFooter brandName={store?.brandName} />
    </div>
  );
}
