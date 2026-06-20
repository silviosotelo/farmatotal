import Image from "next/image";
import Link from "next/link";
import type { FooterConfig } from "@/lib/api";

const DEFAULT_COPYRIGHT =
  "Copyright 2023 © Defensores S.A. Todos los derechos reservados.";
const DEFAULT_PARTNER = {
  href: "https://www.century.com.py/",
  image: "/brand/century.webp",
  alt: "Century — medios de pago",
};

/**
 * Footer nativo, system-driven: las columnas/links, el copyright y el partner se
 * editan desde el admin (setting `footer_config`). Estructura fija, contenido
 * configurable (crear/editar/eliminar columnas y links).
 */
export default function Footer({
  columns = [],
  copyright = DEFAULT_COPYRIGHT,
  partner = DEFAULT_PARTNER,
}: Partial<FooterConfig> = {}) {
  return (
    <footer className="bg-white border-t border-[#ededf1] mt-10">
      {columns.length > 0 && (
        <div className="ft-container grid grid-cols-2 gap-8 py-10 sm:grid-cols-3 md:grid-cols-4">
          {columns.map((col, i) => (
            <div key={i}>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand-text">
                {col.title}
              </h3>
              <ul className="space-y-2">
                {col.links.map((l, j) => (
                  <li key={j}>
                    <Link
                      href={l.href}
                      className="text-sm text-brand-muted transition-colors hover:text-brand-orange-ink"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-[#ededf1] py-6">
        <div className="ft-container flex flex-col gap-3 text-center md:flex-row md:items-center md:justify-between md:text-left">
          <p className="text-[14px] text-brand-text">{copyright}</p>
          {partner && (
            <a
              href={partner.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${partner.alt} (se abre en una pestaña nueva)`}
              className="focus-ring mx-auto inline-flex rounded-sm md:mx-0"
            >
              <Image src={partner.image} width={120} height={30} alt={partner.alt} unoptimized />
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
