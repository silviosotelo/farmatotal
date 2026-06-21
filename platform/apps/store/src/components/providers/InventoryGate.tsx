"use client";

import type { ReactNode } from "react";
import { useFlags } from "@/components/providers/FeatureFlagsContext";

/**
 * Wrapper cliente para gatear UI de stock dentro de componentes SERVER. Cuando el
 * tenant tiene inventory=false, oculta sus children (badges/textos "en stock /
 * sin stock"). Los children son markup estático serializable (spans), así que un
 * server component puede pasarlos sin problema. Default permisivo: inventory=true
 * → muestra (comportamiento actual intacto).
 */
export function InventoryGate({ children }: { children: ReactNode }) {
  const flags = useFlags();
  if (!flags.inventory) return null;
  return <>{children}</>;
}
