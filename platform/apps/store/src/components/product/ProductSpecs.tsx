import type { Product } from "@/types";

/**
 * Ficha técnica del producto: tabla de atributos flexibles (label/value) que el
 * backend expone en `product.attributes`. Render compartido por todas las fichas
 * de detalle (builder + temas). No renderiza nada si no hay atributos. Estilo
 * coherente con la tabla "Información adicional" de ProductTabs (tokens de marca).
 */
export function ProductSpecs({
  product,
  title = "Ficha técnica",
  className,
}: {
  product: Product;
  title?: string;
  className?: string;
}) {
  const attrs = product.attributes;
  if (!attrs || attrs.length === 0) return null;

  return (
    <section className={className}>
      <h2 className="mb-4 font-heading text-lg font-bold text-brand-text">{title}</h2>
      <table className="w-full max-w-md border-collapse text-sm">
        <tbody>
          {attrs.map((a, i) => (
            <tr key={`${a.label}-${i}`} className="border-b border-[#ededf1]">
              <th className="py-2 pr-4 text-left font-medium text-brand-muted">{a.label}</th>
              <td className="py-2 text-brand-text">{a.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
