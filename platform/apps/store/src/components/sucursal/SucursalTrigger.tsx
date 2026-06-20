"use client";

import { useSucursal } from "./SucursalContext";
import { cn } from "@/lib/utils";

/** The clickable "Seleccionar Sucursal" / selected-branch button used in the header. */
export function SucursalTrigger({ className }: { className?: string }) {
  const { selected, open } = useSucursal();
  return (
    <button type="button" onClick={open} className={cn("focus-ring rounded-sm hover:underline", className)}>
      {selected ? selected.name : "Seleccionar Sucursal"}
    </button>
  );
}
