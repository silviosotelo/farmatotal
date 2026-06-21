"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { FeatureFlags } from "@/lib/api";

/**
 * Feature-flags / perfil de rubro del tenant para componentes cliente. Se siembra
 * en el layout desde getTenantFlags(). Controla la UI de sucursales (branches),
 * stock (inventory), variantes (variants) y unidades (units). Defaults permisivos:
 * un tenant sin config se comporta como hasta ahora.
 */
const DEFAULTS: FeatureFlags = { branches: true, inventory: true, variants: true, units: false };

const FeatureFlagsContext = createContext<FeatureFlags>(DEFAULTS);

export function FeatureFlagsProvider({
  flags,
  children,
}: {
  flags: FeatureFlags;
  children: ReactNode;
}) {
  const value = useMemo(() => flags, [flags.branches, flags.inventory, flags.variants, flags.units]);
  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}

export function useFlags(): FeatureFlags {
  return useContext(FeatureFlagsContext);
}
