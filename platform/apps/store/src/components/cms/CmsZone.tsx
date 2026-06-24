import { getPage } from "@/lib/api";
import ChaiRender, { type ChaiBlock } from "./ChaiRender";

/**
 * Zona modular editable (estilo widget-area de WordPress). Renderiza los bloques
 * de la "zona" guardada como página CMS con slug `zone-<name>`. Si no existe o
 * está vacía, no renderiza nada — así se insertan zonas opcionales en cualquier
 * punto del sitio (top de catálogo, footer, etc.) sin romper el layout.
 */
export default async function CmsZone({
  zone,
  className,
}: {
  zone: string;
  className?: string;
}) {
  const page = await getPage(`zone-${zone}`).catch(() => null);
  if (!page?.published || !Array.isArray(page.blocks) || page.blocks.length === 0)
    return null;
  return (
    <div className={className ?? "ft-container py-4"}>
      <ChaiRender blocks={page.blocks as ChaiBlock[]} />
    </div>
  );
}
