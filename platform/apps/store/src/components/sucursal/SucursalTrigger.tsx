"use client";

import { Button } from "@platform/ui";
import { useSucursal } from "./SucursalContext";
import { cn } from "@/lib/utils";

export function SucursalTrigger({ className }: { className?: string }) {
  const { selected, open } = useSucursal();
  return (
    <Button
      type="button"
      variant="plain"
      onClick={open}
      className={cn("rounded-sm hover:underline", className)}
    >
      {selected ? selected.name : "Seleccionar Sucursal"}
    </Button>
  );
}
