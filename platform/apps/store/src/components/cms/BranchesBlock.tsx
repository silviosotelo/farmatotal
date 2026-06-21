"use client";

import { SucursalesList } from "@/components/sections/SucursalesList";
import { useFlags } from "@/components/providers/FeatureFlagsContext";

/**
 * Bloque data-bound "Sucursales" del editor visual. Reusa el widget nativo
 * SucursalesList (filtro por zona + geolocalización + listado), que consume las
 * sucursales reales del tenant desde /branches vía SucursalContext.
 * Gateado por flags.branches: un tenant sin sucursales no renderiza la sección.
 */
export function BranchesBlock({ className }: { className?: string } = {}) {
  const flags = useFlags();

  // Tenant sin sucursales (branches=false): la sección no aplica → no se renderiza.
  if (!flags.branches) return null;

  return (
    <section className={className || "ft-container py-6"}>
      <SucursalesList />
    </section>
  );
}
