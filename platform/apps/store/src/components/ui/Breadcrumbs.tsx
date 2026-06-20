import Link from "next/link";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items, className = "" }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Migas de pan" className={"border-b border-[#ededf1] bg-[#f8f8f8] " + className}>
      <ol className="ft-container flex flex-wrap items-center gap-1 py-3 text-sm text-brand-muted">
        <li>
          <Link href="/" className="hover:text-brand-orange transition-colors">
            Inicio
          </Link>
        </li>
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1">
            <span className="px-1 text-brand-muted/60" aria-hidden="true">
              /
            </span>
            {c.href && i < items.length - 1 ? (
              <Link href={c.href} className="hover:text-brand-orange transition-colors">
                {c.label}
              </Link>
            ) : (
              <span className="text-brand-text" aria-current="page">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
