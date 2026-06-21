"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { tenantHeaders } from "@/lib/tenant";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type TreeNode = {
  id: string;
  slug: string;
  name: string;
  icon?: string | null;
  active?: boolean;
  children?: TreeNode[];
};

const href = (slug: string) => `/categorias/${slug}/`;
const isActive = (c: TreeNode) => c.active !== false;

/**
 * Bloque data-bound "Categorías" del editor visual. Documento de página: trae el
 * árbol de categorías del catálogo del tenant y lo muestra como grilla de tarjetas
 * (departamento + icono) con sus subcategorías como links. Reemplaza a la página
 * de listado de categorías hardcodeada — editable desde el builder.
 *
 * Categorías no manejan precios ni cantidades → useMoney()/lib/units no aplican;
 * tampoco hay UI gobernada por feature-flags en un árbol de categorías.
 */
export function CategoryBlock({
  title = "Categorías",
  columns = 4,
  className,
}: {
  title?: string;
  columns?: number;
  className?: string;
}) {
  const [roots, setRoots] = useState<TreeNode[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    fetch(`${API}/catalog/categories/tree`, { headers: tenantHeaders() })
      .then((r) => r.json())
      .then((d) => {
        const data = ((d.data as TreeNode[]) || []).filter(isActive);
        setRoots(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  return (
    <section className={className || "ft-container py-6"}>
      <h2 className="mb-4 font-heading text-xl font-bold text-brand-text">{title}</h2>

      {loaded && roots.length === 0 ? (
        <p className="py-12 text-center text-brand-muted">No hay categorías para mostrar.</p>
      ) : (
        <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-${columns}`}>
          {roots.map((cat) => {
            const subs = (cat.children || []).filter(isActive);
            return (
              <div
                key={cat.id}
                className="flex flex-col rounded-[10px] border border-[#ededf1] bg-white p-4 transition hover:border-brand-orange"
              >
                <Link
                  href={href(cat.slug)}
                  className="group flex items-center gap-3"
                >
                  {cat.icon ? (
                    <Image
                      src={cat.icon}
                      alt={cat.name}
                      width={48}
                      height={48}
                      unoptimized
                      className="shrink-0 transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-lg font-semibold text-brand-orange transition-transform duration-300 group-hover:scale-110"
                    >
                      {cat.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="font-heading text-base font-bold text-brand-text group-hover:text-brand-orange">
                    {cat.name}
                  </span>
                </Link>

                {subs.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-1.5 border-t border-[#f4f4f6] pt-3">
                    {subs.map((sub) => (
                      <li key={sub.id}>
                        <Link
                          href={href(sub.slug)}
                          className="text-sm text-[#202435] transition-colors hover:text-brand-orange"
                        >
                          {sub.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
