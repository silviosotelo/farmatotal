import type { ReactNode } from "react";
import { EkomartHeader } from "./EkomartHeader";
import { EkomartFooter } from "./EkomartFooter";
import type { StoreConfig } from "@/lib/api";

/**
 * Chrome del tema Ekomart: carga su CSS (Bootstrap + estilos compilados) SOLO
 * cuando el tema está activo (evita conflicto con Tailwind en el resto), envuelve
 * el contenido con header + footer propios.
 */
export function EkomartChrome({
  children,
  store,
}: {
  children: ReactNode;
  store: StoreConfig | null;
}) {
  return (
    <>
      {/* CSS del tema (scoped por ruta: sólo se sirve con el tema activo) */}
      <link rel="stylesheet" href="/themes/ekomart/assets/css/bootstrap.min.css" />
      <link rel="stylesheet" href="/themes/ekomart/assets/css/plugins.css" />
      <link rel="stylesheet" href="/themes/ekomart/assets/css/style.css" />
      <div className="ekomart-theme">
        <EkomartHeader brandName={store?.brandName} logo={store?.logoUrl} />
        <div id="contenido">{children}</div>
        <EkomartFooter brandName={store?.brandName} />
      </div>
    </>
  );
}
