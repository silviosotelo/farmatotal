import { getPage } from "@/lib/api";
import PuckRender from "./PuckRender";
import type { Data } from "@measured/puck";

function hasBlocks(blocks: unknown): blocks is Data {
  return (
    !!blocks &&
    typeof blocks === "object" &&
    !Array.isArray(blocks) &&
    "content" in (blocks as object) &&
    Array.isArray((blocks as { content: unknown[] }).content) &&
    (blocks as { content: unknown[] }).content.length > 0
  );
}

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
  if (!page?.published || !hasBlocks(page.blocks)) return null;
  return (
    <div className={className ?? "ft-container py-4"}>
      <PuckRender data={page.blocks as Data} />
    </div>
  );
}
