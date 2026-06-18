"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ThemeKey } from "./registry";

/**
 * Expone el tema activo (resuelto en el server con getActiveTheme) a los
 * componentes cliente (carrito, checkout, modal de sucursal, mini-carrito) para
 * que puedan branchear su layout por tema. El layout server lo alimenta.
 */
const ThemeContext = createContext<ThemeKey>("farmatotal");

export function ThemeProvider({ theme, children }: { theme: ThemeKey; children: ReactNode }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeKey {
  return useContext(ThemeContext);
}

// themeAccentVars vive en registry.ts (server-safe); se re-exporta acá para los
// consumidores client (SucursalModal, MiniCart) que ya lo importan desde acá.
export { themeAccentVars } from "./registry";
