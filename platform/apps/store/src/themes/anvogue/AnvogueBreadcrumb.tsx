import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { bgLinear, container, heading2, caption1, C } from "./sections/anvogueClasses";

/**
 * Banner de breadcrumb del tema Anvogue (.breadcrumb-block .breadcrumb-main).
 * Fondo degradado `bg-linear`, heading2 centrado y enlace "Inicio > sub".
 * Es el elemento visual más reconocible de las páginas internas del template
 * original (shop / cart / checkout lo usan vía <Breadcrumb heading subHeading/>).
 */
export function AnvogueBreadcrumb({
  heading,
  sub,
}: {
  heading: string;
  /** Texto secundario del enlace (default = heading). */
  sub?: string;
}) {
  const subText = sub ?? heading;
  return (
    <div className="overflow-hidden" style={{ background: bgLinear }}>
      <div className={`${container} relative pb-10 pt-16 md:pt-20 lg:pt-[88px]`}>
        <div className="relative z-[1] flex w-full flex-col items-center justify-center">
          <h1 className={`${heading2} text-center`} style={{ color: C.black }}>
            {heading}
          </h1>
          <div className={`mt-3 flex items-center justify-center gap-1.5 ${caption1}`}>
            <Link href="/" className="transition-colors hover:text-[var(--brand-orange)]">
              Inicio
            </Link>
            <ChevronRight size={14} style={{ color: C.secondary2 }} />
            <span className="capitalize" style={{ color: C.secondary2 }}>
              {subText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
