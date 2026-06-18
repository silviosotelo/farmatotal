import React from "react";
import { Truck, RotateCcw, ShieldCheck, Headphones } from "lucide-react";
import { HomeDealsBlock } from "./sectionBlocks";
import { ChaiProductGrid, ChaiCategoryShowcase } from "./chaiBlocks";
import { getActiveTheme, themeAccentVars, type ThemeKey } from "@/themes/registry";

/**
 * Render SSR de páginas creadas con el editor visual (Chai Builder).
 *
 * El admin guarda `pages.blocks` como un array plano de bloques Chai
 * (`ChaiBlock[]`), donde el anidamiento se expresa con `_parent`. Acá armamos el
 * árbol y mapeamos `_type` → componente. Los bloques de comercio (Hero,
 * ProductGrid, HomeDeals) reusan los componentes reales del store; los web-blocks
 * de Chai (Box/Text/Heading/Image/Button…) se renderizan de forma genérica
 * aplicando sus clases Tailwind.
 *
 * NOTA: este renderer cubre los bloques que la plataforma expone. Para fidelidad
 * total del catálogo de web-blocks de Chai se puede adoptar a futuro su
 * `AsyncRenderChaiBlocks` oficial (ver docs/research/visual-editor-comparison.md).
 */

export type ChaiBlock = {
  _id: string;
  _type: string;
  _parent?: string | null;
  styles?: string;
  content?: string;
  [k: string]: unknown;
};

/** Chai serializa estilos como "#styles:<binding>,<clases tailwind>". */
function cls(styles?: unknown): string {
  if (!styles || typeof styles !== "string") return "";
  if (styles.startsWith("#styles:")) {
    const i = styles.indexOf(",");
    return i >= 0 ? styles.slice(i + 1).trim() : "";
  }
  return styles;
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function num(v: unknown, fallback: number): number {
  return typeof v === "number" ? v : fallback;
}

function childrenOf(all: ChaiBlock[], parentId: string | null): ChaiBlock[] {
  return all.filter((b) => (b._parent || null) === parentId);
}

function HeroBlock({ b }: { b: ChaiBlock }) {
  const image = str(b.image);
  const align = str(b.align, "left") === "center" ? "center" : "left";
  return (
    <section
      className="relative overflow-hidden rounded-2xl px-8 py-16 text-white"
      style={{
        background: image
          ? `linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.45)), url(${image}) center/cover`
          : "var(--brand-gradient)",
        textAlign: align as "left" | "center",
      }}
    >
      <div className={align === "center" ? "mx-auto max-w-2xl" : "max-w-2xl"}>
        <h2 className="text-3xl font-bold sm:text-4xl">{str(b.title, "Bienvenido a la tienda")}</h2>
        {str(b.subtitle) && <p className="mt-3 text-lg opacity-95">{str(b.subtitle)}</p>}
        {str(b.ctaLabel) && (
          <a
            href={str(b.ctaHref, "#")}
            className="mt-6 inline-block rounded-lg bg-white px-5 py-2.5 font-semibold text-brand-orange no-underline"
          >
            {str(b.ctaLabel)}
          </a>
        )}
      </div>
    </section>
  );
}

function BannerBlock({ b }: { b: ChaiBlock }) {
  const image = str(b.image);
  const align = str(b.align, "left") === "center" ? "center" : "left";
  return (
    <section
      className="relative overflow-hidden rounded-2xl px-8 py-12 text-white"
      style={{
        background: image
          ? `linear-gradient(rgba(0,0,0,.4),rgba(0,0,0,.4)), url(${image}) center/cover`
          : "var(--brand-gradient)",
        textAlign: align as "left" | "center",
      }}
    >
      <div className={align === "center" ? "mx-auto max-w-2xl" : "max-w-2xl"}>
        <h3 className="text-2xl font-bold sm:text-3xl">{str(b.title, "Banner promocional")}</h3>
        {str(b.subtitle) && <p className="mt-2 text-base opacity-95">{str(b.subtitle)}</p>}
        {str(b.ctaLabel) && (
          <a
            href={str(b.ctaHref, "#")}
            className="mt-5 inline-block rounded-lg bg-white px-5 py-2.5 font-semibold text-brand-orange no-underline"
          >
            {str(b.ctaLabel)}
          </a>
        )}
      </div>
    </section>
  );
}

function BrandsBlock({ b }: { b: ChaiBlock }) {
  const urls = str(b.logos)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const cells: string[] = urls.length ? urls : Array.from({ length: 6 }, () => "");
  return (
    <section className="py-6">
      {str(b.title) && <h3 className="mb-4 text-xl font-bold">{str(b.title)}</h3>}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {cells.map((u, i) => (
          <div
            key={i}
            className="flex h-16 items-center justify-center rounded-lg border border-[#ededf1] bg-white px-3"
          >
            {u ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u} alt="" className="max-h-full max-w-full object-contain grayscale" />
            ) : (
              <span className="h-3 w-16 rounded bg-gray-100" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function BenefitsBlock({ b }: { b: ChaiBlock }) {
  const items = [
    { Icon: Truck, t: "Envío a domicilio", s: "En todo el país" },
    { Icon: RotateCcw, t: "Devoluciones", s: "Hasta 30 días" },
    { Icon: ShieldCheck, t: "Pago seguro", s: "Compra protegida" },
    { Icon: Headphones, t: "Atención", s: "Soporte dedicado" },
  ];
  return (
    <section className="py-6">
      {str(b.title) && <h3 className="mb-4 text-xl font-bold">{str(b.title)}</h3>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ Icon, t, s }) => (
          <div key={t} className="flex items-center gap-3 rounded-xl border border-[#ededf1] bg-white p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange">
              <Icon size={22} strokeWidth={1.8} />
            </span>
            <div>
              <div className="text-sm font-semibold">{t}</div>
              <div className="text-xs text-gray-500">{s}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RenderBlock({
  block,
  all,
  theme,
}: {
  block: ChaiBlock;
  all: ChaiBlock[];
  theme: ThemeKey;
}): React.ReactNode {
  const kids = childrenOf(all, block._id);
  const renderKids = () =>
    kids.map((k) => <RenderBlock key={k._id} block={k} all={all} theme={theme} />);
  const className = cls(block.styles);
  const html = str(block.content);

  switch (block._type) {
    // ── Bloques de comercio (data-bound) ──
    case "Hero":
      return <HeroBlock b={block} />;
    case "ProductGrid":
      return (
        <ChaiProductGrid
          title={str(block.title, "Destacados")}
          categorySlug={str(block.categorySlug) || undefined}
          limit={num(block.limit, 8)}
          columns={num(block.columns, 4)}
        />
      );
    case "HomeDeals":
      return <HomeDealsBlock limit={num(block.limit, 6)} theme={theme} />;
    case "Banner":
      return <BannerBlock b={block} />;
    case "CategoryShowcase":
      return (
        <ChaiCategoryShowcase
          title={str(block.title) || undefined}
          limit={num(block.limit, 8)}
        />
      );
    case "Brands":
      return <BrandsBlock b={block} />;
    case "Benefits":
      return <BenefitsBlock b={block} />;
    case "Titulo": {
      const lvl = str(block.level, "h2");
      const Tag = (["h2", "h3", "h4"].includes(lvl) ? lvl : "h2") as React.ElementType;
      const size = lvl === "h3" ? "text-xl" : lvl === "h4" ? "text-lg" : "text-2xl";
      const align = str(block.align) === "center" ? "text-center" : "";
      return <Tag className={`${size} mt-2 font-bold text-brand-text ${align}`}>{str(block.text, "Título de sección")}</Tag>;
    }
    case "Texto": {
      const align = str(block.align) === "center" ? "text-center" : "";
      return (
        <div
          className={`text-[15px] leading-relaxed text-gray-600 ${align}`}
          dangerouslySetInnerHTML={{ __html: str(block.html) }}
        />
      );
    }

    // ── Web-blocks genéricos de Chai ──
    case "Box":
    case "Container":
    case "Section":
    case "Div":
    case "Row":
    case "Column":
      return <div className={className}>{renderKids()}</div>;
    case "Heading": {
      // Chai serializa el nivel como `tag`; aceptamos `level` por compat.
      const level = str(block.tag) || str(block.level, "h2");
      const Tag = (["h1", "h2", "h3", "h4", "h5", "h6"].includes(level) ? level : "h2") as React.ElementType;
      return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
    }
    case "Text":
    case "Paragraph":
      return <p className={className} dangerouslySetInnerHTML={{ __html: html }} />;
    case "Span":
      return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
    case "RichText":
      return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
    case "Image": {
      const src = str(block.image) || str(block.src);
      if (!src) return null;
      // eslint-disable-next-line @next/next/no-img-element
      return <img className={className} src={src} alt={str(block.alt)} />;
    }
    case "Button":
    case "Link":
      return (
        <a className={className} href={str(block.link) || str(block.href, "#")}>
          {html ? <span dangerouslySetInnerHTML={{ __html: html }} /> : renderKids()}
        </a>
      );
    case "Divider":
      return <hr className={className} />;
    case "List":
      return <ul className={className}>{renderKids()}</ul>;
    case "ListItem":
      return <li className={className} dangerouslySetInnerHTML={html ? { __html: html } : undefined}>{html ? undefined : renderKids()}</li>;

    default:
      // Desconocido: si tiene hijos, los renderizamos en un wrapper; si no, nada.
      return kids.length ? <div className={className}>{renderKids()}</div> : null;
  }
}

export default async function ChaiRender({ blocks }: { blocks: ChaiBlock[] }) {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;
  const roots = childrenOf(blocks, null);
  // Tema activo: re-tinta los bloques de comercio (Hero/precios via brand-*) para
  // que las páginas del builder matcheen el storefront.
  const theme = await getActiveTheme();
  return (
    <div className="flex flex-col gap-6" style={themeAccentVars(theme) as React.CSSProperties}>
      {roots.map((b) => (
        <RenderBlock key={b._id} block={b} all={blocks} theme={theme} />
      ))}
    </div>
  );
}
