import React from "react";
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { Truck, RotateCcw, ShieldCheck, Headphones } from "lucide-react";
import {
  HomeDealsBlock,
  HomeCategoriesBlock,
  HomeFeaturedBlock,
  HomePromoBannerBlock,
} from "./sectionBlocks";
import { HeroSlider } from "@/components/sections/HeroSlider";
import { CatalogBlock } from "./CatalogBlock";
import { ProductDetailBlock } from "./ProductDetailBlock";
import { CartBlock } from "./CartBlock";
import { CheckoutBlock } from "./CheckoutBlock";
import { SearchBlock } from "./SearchBlock";
import { CategoryBlock } from "./CategoryBlock";
import { BranchesBlock } from "./BranchesBlock";
import { OrderConfirmationBlock } from "./OrderConfirmationBlock";
import { OrderTrackingBlock } from "./OrderTrackingBlock";
import { AccountBlock } from "./AccountBlock";
import { ContactFormFields } from "../sections/ContactForm.client";
import { WishlistBlock } from "./WishlistBlock";
import { PaymentBlock } from "./PaymentBlock";
import { PasswordRecoveryBlock } from "./PasswordRecoveryBlock";
import { SiteHeaderBlock, SiteFooterBlock } from "./SiteChromeBlocks";
import {
  HeaderTopBarBlock,
  HeaderLogoBlock,
  HeaderSearchBlock,
  HeaderCategoriesBlock,
  HeaderAccountBlock,
  HeaderCartBlock,
  HeaderSucursalBlock,
} from "./HeaderBlocks";
import { TailwindRuntime } from "./TailwindRuntime";
import { ChaiProductGrid, ChaiCategoryShowcase } from "./chaiBlocks";
import { buildProductQuery } from "./productQuery";
import { getActiveTheme, themeAccentVars, type ThemeKey } from "@/themes/registry";
import { listProducts, listCategories, getStoreConfig, getPage } from "@/lib/api";
import { renderEngineBlock, getWidget, compileCss, resolveBindings, extractSettings } from "@platform/engine";
import { AuthGate } from "./AuthGate";
import { ensureEngineBindings } from "./engineSetup";

const ANIMATION_CLASSES: Record<string, string> = {
  'fade-in': 'animate-[fadeIn_0.6s_ease-out]',
  'fade-in-up': 'animate-[fadeInUp_0.6s_ease-out]',
  'fade-in-down': 'animate-[fadeInDown_0.6s_ease-out]',
  'fade-in-left': 'animate-[fadeInLeft_0.6s_ease-out]',
  'fade-in-right': 'animate-[fadeInRight_0.6s_ease-out]',
  'zoom-in': 'animate-[zoomIn_0.4s_ease-out]',
  'zoom-in-up': 'animate-[zoomInUp_0.5s_ease-out]',
  'bounce-in': 'animate-[bounceIn_0.6s]',
  'rotate-in': 'animate-[rotateIn_0.5s_ease-out]',
  'flip-in-x': 'animate-[flipInX_0.5s_ease-out]',
  'flip-in-y': 'animate-[flipInY_0.5s_ease-out]',
};

const HOVER_CLASSES: Record<string, string> = {
  'scale-up': 'hover:scale-105 transition-transform duration-300',
  'scale-down': 'hover:scale-95 transition-transform duration-300',
  'brightness-up': 'hover:brightness-110 transition-all duration-300',
  'brightness-down': 'hover:brightness-90 transition-all duration-300',
  'shadow-lg': 'hover:shadow-xl transition-shadow duration-300',
  'opacity-hover': 'hover:opacity-80 transition-opacity duration-300',
};

const MOTION_KEYFRAMES = `
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeInDown { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeInLeft { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
@keyframes fadeInRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
@keyframes zoomIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
@keyframes zoomInUp { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes bounceIn { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.05); } 70% { transform: scale(0.9); } 100% { transform: scale(1); opacity: 1; } }
@keyframes rotateIn { from { opacity: 0; transform: rotate(-200deg); } to { opacity: 1; transform: rotate(0); } }
@keyframes flipInX { from { opacity: 0; transform: perspective(400px) rotateX(90deg); } to { opacity: 1; transform: perspective(400px) rotateX(0); } }
@keyframes flipInY { from { opacity: 0; transform: perspective(400px) rotateY(90deg); } to { opacity: 1; transform: perspective(400px) rotateY(0); } }
`;

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

// ─── Clipboard Context (Copy/Paste Elements) ───
type ClipboardCtx = {
  copiedBlocks: ChaiBlock[];
  copy: (blocks: ChaiBlock[]) => void;
  paste: () => ChaiBlock[] | null;
  hasCopied: boolean;
};

const ChaiClipboardContext = createContext<ClipboardCtx>({
  copiedBlocks: [],
  copy: () => {},
  paste: () => null,
  hasCopied: false,
});

export function useChaiClipboard() {
  return useContext(ChaiClipboardContext);
}

export function ChaiClipboardProvider({ children }: { children: ReactNode }) {
  const [copiedBlocks, setCopiedBlocks] = useState<ChaiBlock[]>([]);
  const copy = useCallback((blocks: ChaiBlock[]) => {
    setCopiedBlocks(JSON.parse(JSON.stringify(blocks)));
  }, []);
  const paste = useCallback(() => {
    if (copiedBlocks.length === 0) return null;
    return JSON.parse(JSON.stringify(copiedBlocks));
  }, [copiedBlocks]);
  return (
    <ChaiClipboardContext.Provider value={{ copiedBlocks, copy, paste, hasCopied: copiedBlocks.length > 0 }}>
      {children}
    </ChaiClipboardContext.Provider>
  );
}

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

/** CSS para ocultar un elemento según el device (display conditions). */
function deviceHideCss(cls: string, device?: string): string {
  if (!device || device === "all") return "";
  const sel = `.${cls}`;
  if (device === "desktop") return `@media(max-width:1024px){${sel}{display:none!important}}`;
  if (device === "tablet") return `@media(max-width:767px),(min-width:1025px){${sel}{display:none!important}}`;
  if (device === "mobile") return `@media(min-width:768px){${sel}{display:none!important}}`;
  return "";
}

/** lodash.get acotado: resuelve "a.b.c" sobre un objeto. */
function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), obj);
}

/** Resuelve un binding de repeater `{{$index.campo}}` contra el item actual.
 * Si el valor es exactamente un binding → devuelve el valor crudo; si es texto
 * mezclado → reemplaza cada binding por su string. */
function resolveBinding(value: unknown, item: Record<string, unknown>): unknown {
  if (typeof value !== "string" || !value.includes("{{")) return value;
  const exact = value.match(/^\{\{\s*\$index\.([\w.]+)\s*\}\}$/);
  if (exact) return getPath(item, exact[1]);
  return value.replace(/\{\{\s*\$index\.([\w.]+)\s*\}\}/g, (_m, p) => {
    const v = getPath(item, p);
    return v == null ? "" : String(v);
  });
}

/** Clona un bloque resolviendo sus props string contra el item del repeater. */
function bindBlock(block: ChaiBlock, item: Record<string, unknown> | null): ChaiBlock {
  if (!item) return block;
  const out: ChaiBlock = { ...block };
  for (const [k, v] of Object.entries(block)) {
    if (k.startsWith("_") || k === "styles") continue;
    out[k] = resolveBinding(v, item) as never;
  }
  return out;
}

/** "{{#products}}" / "{{products}}" → "products" (id de colección). */
function parseCollectionId(binding: unknown): string {
  const s = str(binding).trim();
  const m = s.match(/^\{\{\s*#?([\w-]+).*\}\}$/);
  return m ? m[1] : "";
}

function childrenOf(all: ChaiBlock[], parentId: string | null): ChaiBlock[] {
  return all.filter((b) => (b._parent || null) === parentId);
}

async function GlobalWidgetBlock({ widgetSlug }: { widgetSlug: string }) {
  if (!widgetSlug) return null;
  const page = await getPage(`global-widget-${widgetSlug}`).catch(() => null);
  if (!page?.blocks || !Array.isArray(page.blocks)) return null;
  return <ChaiRender blocks={page.blocks as ChaiBlock[]} />;
}

function HeroBlock({ b }: { b: ChaiBlock }) {
  const image = str(b.image);
  const align = str(b.align, "left") === "center" ? "center" : "left";
  return (
    <section
      className={cls(b.styles) || "relative overflow-hidden rounded-2xl px-8 py-16 text-white"}
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
      className={cls(b.styles) || "relative overflow-hidden rounded-2xl px-8 py-12 text-white"}
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
    <section className={cls(b.styles) || "py-6"}>
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
    <section className={cls(b.styles) || "py-6"}>
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
  block: rawBlock,
  all,
  theme,
  item = null,
  repeaterData = {},
  loopData = {},
  ctx = {},
  seen = new Set<string>(),
}: {
  block: ChaiBlock;
  all: ChaiBlock[];
  theme: ThemeKey;
  item?: Record<string, unknown> | null;
  repeaterData?: Record<string, unknown[]>;
  loopData?: Record<string, Record<string, unknown>[]>;
  ctx?: Record<string, unknown>;
  seen?: Set<string>;
}): React.ReactNode {
  // Dentro de un Repeater, resolvemos los bindings {{$index.x}} contra el item.
  const block = bindBlock(rawBlock, item);

  // Emite un <style> una sola vez por CSS único en todo el árbol (dedupe; clave en
  // loops donde el template se repite por ítem y el CSS es idéntico).
  const styleOnce = (css: string) => {
    if (!css || seen.has(css)) return null;
    seen.add(css);
    return <style dangerouslySetInnerHTML={{ __html: css }} />;
  };

  const kids = childrenOf(all, rawBlock._id);
  const renderKids = () =>
    kids.map((k) => (
      <RenderBlock key={k._id} block={k} all={all} theme={theme} item={item} repeaterData={repeaterData} loopData={loopData} ctx={ctx} seen={seen} />
    ));

  // Loop del motor: repite el template (hijos) por cada ítem del query, inyectando
  // ctx.item (los hijos resuelven sus bindings item.*). Datos pre-fetcheados por tenant.
  if (str(block._type) === "loop") {
    const items = loopData[rawBlock._id] || [];
    const tmpl = childrenOf(all, rawBlock._id);
    const schema = getWidget("loop");
    const css = schema ? compileCss(schema, resolveBindings(extractSettings(block), ctx), rawBlock._id) : "";
    const cols = num(block.columns, 4);
    if (items.length === 0) return null;
    return (
      <>
        {styleOnce(css)}
        <div className={`ft-el-${rawBlock._id}`} style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {items.map((it, i) =>
            tmpl.map((t) => (
              <RenderBlock key={`${t._id}_${i}`} block={t} all={all} theme={theme} item={item} repeaterData={repeaterData} loopData={loopData} ctx={{ ...ctx, item: it }} seen={seen} />
            )),
          )}
        </div>
      </>
    );
  }

  // Motor @platform/engine: si el _type es un widget del motor (schema-first), lo
  // resolvemos acá (bindings → CSS scopeado → render). Los contenedores reciben sus
  // hijos renderizados. Si no es del motor, cae al switch legacy.
  if (getWidget(str(block._type))) {
    // Display conditions (transversal): fechas (server) + device (CSS) + auth (cliente).
    const cond = (block.conditions ?? {}) as { device?: string; from?: string; to?: string; auth?: string };
    const now = Date.now();
    if (cond.from && now < Date.parse(cond.from)) return null;
    if (cond.to && now > Date.parse(cond.to)) return null;
    const childNodes = getWidget(str(block._type))?.acceptsChildren ? renderKids() : undefined;
    const engine = renderEngineBlock(block, ctx, undefined, childNodes);
    if (engine) {
      const dev = deviceHideCss(`ft-el-${rawBlock._id}`, cond.device);
      const css = (engine.css || "") + dev;
      const node =
        cond.auth === "in" || cond.auth === "out" ? <AuthGate mode={cond.auth}>{engine.node}</AuthGate> : engine.node;
      return (
        <>
          {styleOnce(css)}
          {node}
        </>
      );
    }
  }
  const className = cls(block.styles);
  const animCls = str(block.animation) ? ANIMATION_CLASSES[str(block.animation)] || "" : "";
  const hoverCls = str(block.hoverAnimation) ? HOVER_CLASSES[str(block.hoverAnimation)] || "" : "";
  const motionCls = [className, animCls, hoverCls].filter(Boolean).join(" ");
  const html = str(block.content);
  const customCss = str(block.customCss);

  const withCustomCss = (node: React.ReactNode): React.ReactNode => {
    if (!customCss) return node;
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: `#block-${block._id} { ${customCss} }` }} />
        {React.isValidElement(node)
          ? React.cloneElement(node as React.ReactElement<Record<string, unknown>>, { id: `block-${block._id}` } as any)
          : <div id={`block-${block._id}`}>{node}</div>}
      </>
    );
  };

  switch (block._type) {
    // ── Repeater (grilla data-bound con template editable) ──
    case "Repeater": {
      const items = (repeaterData[rawBlock._id] as Record<string, unknown>[]) || [];
      const tmpl = childrenOf(all, rawBlock._id); // [RepeaterItem]
      const tag = str(block.tag, "div");
      const Tag = (["div", "ul", "ol"].includes(tag) ? tag : "div") as React.ElementType;
      if (items.length === 0) return null;
      return (
        <Tag className={motionCls || "grid gap-4 md:grid-cols-3 xl:grid-cols-4"}>
          {items.map((it, i) =>
            tmpl.map((t) => (
              <RenderBlock
                key={`${t._id}_${i}`}
                ctx={ctx}
                block={t}
                all={all}
                theme={theme}
                item={it}
                repeaterData={repeaterData}
              />
            )),
          )}
        </Tag>
      );
    }
    case "RepeaterItem": {
      const tag = str(block.parentTag) === "ul" || str(block.parentTag) === "ol" ? "li" : "div";
      const Tag = tag as React.ElementType;
      return <Tag className={motionCls}>{renderKids()}</Tag>;
    }
    // ── Bloques de comercio (data-bound) ──
    case "Hero":
      return withCustomCss(<HeroBlock b={block} />);
    case "ProductGrid":
      return withCustomCss(
        <ChaiProductGrid
          title={str(block.title, "Destacados")}
          limit={num(block.limit, 8)}
          columns={num(block.columns, 4)}
          className={motionCls || undefined}
          query={buildProductQuery(block)}
        />,
      );
    case "HomeDeals":
      return withCustomCss(<HomeDealsBlock limit={num(block.limit, 6)} theme={theme} className={motionCls || undefined} />);
    case "HeroSlider": {
      const slider = (
        <HeroSlider
          autoplayDelay={num(block.autoplayDelay, 4000)}
          showArrows={block.showArrows !== false}
          showDots={block.showDots !== false}
          loop={block.loop !== false}
          fade={block.fade !== false}
        />
      );
      return withCustomCss(motionCls ? <div className={motionCls}>{slider}</div> : slider);
    }
    case "CategoryCircles":
      return withCustomCss(
        <HomeCategoriesBlock
          title={str(block.title) || undefined}
          limit={block.limit ? num(block.limit, 0) : undefined}
          className={motionCls || undefined}
        />,
      );
    case "Featured":
      return withCustomCss(
        <HomeFeaturedBlock
          title={str(block.title) || undefined}
          limit={num(block.limit, 8)}
          className={motionCls || undefined}
        />,
      );
    case "PromoBanner":
      return withCustomCss(<HomePromoBannerBlock index={num(block.index, 0)} className={motionCls || undefined} />);
    case "Catalog":
      return withCustomCss(
        <CatalogBlock
          perPage={num(block.perPage, 48)}
          title={str(block.title) || undefined}
          columns={num(block.columns, 5)}
          className={motionCls || undefined}
          query={buildProductQuery(block)}
        />,
      );
    case "ProductDetail":
      return withCustomCss(
        <ProductDetailBlock
          showRelated={block.showRelated !== false}
          showTabs={block.showTabs !== false}
          relatedTitle={str(block.relatedTitle) || undefined}
        />,
      );
    case "Cart":
      return withCustomCss(<CartBlock showCoupon={block.showCoupon !== false} />);
    case "Checkout":
      return withCustomCss(<CheckoutBlock />);
    case "ContactForm":
      return withCustomCss(
        <div className={motionCls || "ft-container py-6"}>
          <ContactFormFields />
        </div>,
      );
    case "Search":
      return withCustomCss(
        <SearchBlock
          perPage={num(block.perPage, 48)}
          columns={num(block.columns, 5)}
          placeholder={str(block.placeholder) || undefined}
          className={motionCls || undefined}
        />,
      );
    case "Category":
      return withCustomCss(
        <CategoryBlock
          title={str(block.title) || undefined}
          columns={num(block.columns, 4)}
          className={motionCls || undefined}
        />,
      );
    case "Branches":
      return withCustomCss(<BranchesBlock className={motionCls || undefined} />);
    case "OrderConfirmation":
      return withCustomCss(
        <OrderConfirmationBlock
          orderId={str(block.orderId) || undefined}
          orderNumber={str(block.orderNumber) || undefined}
          title={str(block.title) || undefined}
          subtitle={str(block.subtitle) || undefined}
          catalogHref={str(block.catalogHref) || undefined}
          accountHref={str(block.accountHref) || undefined}
        />,
      );
    case "OrderTracking":
      return withCustomCss(
        <OrderTrackingBlock
          title={str(block.title) || undefined}
          subtitle={str(block.subtitle) || undefined}
          requireEmail={!!block.requireEmail}
          showItems={block.showItems !== false}
        />,
      );
    case "Account":
      return withCustomCss(
        <AccountBlock
          title={str(block.title) || undefined}
          showProfile={block.showProfile !== false}
          showOrders={block.showOrders !== false}
        />,
      );
    case "Wishlist":
      return withCustomCss(
        <WishlistBlock
          title={str(block.title) || undefined}
          columns={num(block.columns, 4)}
          className={motionCls || undefined}
        />,
      );
    case "Payment":
      return withCustomCss(
        <PaymentBlock
          orderId={str(block.orderId) || undefined}
          amount={typeof block.amount === "number" ? block.amount : undefined}
          title={str(block.title) || undefined}
          subtitle={str(block.subtitle) || undefined}
          returnHref={str(block.returnHref) || undefined}
          returnLabel={str(block.returnLabel) || undefined}
        />,
      );
    case "PasswordRecovery":
      return withCustomCss(
        <PasswordRecoveryBlock
          title={str(block.title) || undefined}
          description={str(block.description) || undefined}
          submitLabel={str(block.submitLabel) || undefined}
          successMessage={str(block.successMessage) || undefined}
          loginHref={str(block.loginHref) || undefined}
        />,
      );
    case "SiteHeader":
      return withCustomCss(<SiteHeaderBlock showTopBar={block.showTopBar !== false} />);
    case "SiteFooter":
      return withCustomCss(<SiteFooterBlock />);
    // ── Header descompuesto (bloques de chrome construibles) ──
    case "HeaderTopBar":
      return <HeaderTopBarBlock />;
    case "HeaderLogo":
      return withCustomCss(<HeaderLogoBlock logo={str(block.logo) || undefined} brandName={str(block.brandName) || undefined} />);
    case "HeaderSearch":
      return withCustomCss(<HeaderSearchBlock />);
    case "HeaderCategories":
      return withCustomCss(<HeaderCategoriesBlock />);
    case "HeaderAccount":
      return withCustomCss(<HeaderAccountBlock />);
    case "HeaderCart":
      return withCustomCss(<HeaderCartBlock />);
    case "HeaderSucursal":
      return withCustomCss(<HeaderSucursalBlock />);
    case "Banner":
      return withCustomCss(<BannerBlock b={block} />);
    case "CategoryShowcase":
      return withCustomCss(
        <ChaiCategoryShowcase
          title={str(block.title) || undefined}
          limit={num(block.limit, 8)}
          className={className || undefined}
        />,
      );
    case "Brands":
      return withCustomCss(<BrandsBlock b={block} />);
    case "Benefits":
      return withCustomCss(<BenefitsBlock b={block} />);
    case "Titulo": {
      const lvl = str(block.level, "h2");
      const Tag = (["h2", "h3", "h4"].includes(lvl) ? lvl : "h2") as React.ElementType;
      const size = lvl === "h3" ? "text-xl" : lvl === "h4" ? "text-lg" : "text-2xl";
      const align = str(block.align) === "center" ? "text-center" : "";
      const base = className || `${size} mt-2 font-bold text-brand-text`;
      return withCustomCss(<Tag className={`${base} ${align}`.trim()}>{str(block.text, "Título de sección")}</Tag>);
    }
    case "Texto": {
      const align = str(block.align) === "center" ? "text-center" : "";
      const base = className || "text-[15px] leading-relaxed text-gray-600";
      return withCustomCss(
        <div
          className={`${base} ${align}`.trim()}
          dangerouslySetInnerHTML={{ __html: str(block.html) }}
        />,
      );
    }

    // ── Web-blocks genéricos de Chai ──
    case "Box":
    case "Container":
    case "Section":
    case "Div":
    case "Row":
    case "Column":
      return withCustomCss(<div className={motionCls}>{renderKids()}</div>);
    case "Heading": {
      // Chai serializa el nivel como `tag`; aceptamos `level` por compat.
      const level = str(block.tag) || str(block.level, "h2");
      const Tag = (["h1", "h2", "h3", "h4", "h5", "h6"].includes(level) ? level : "h2") as React.ElementType;
      return withCustomCss(<Tag className={motionCls} dangerouslySetInnerHTML={{ __html: html }} />);
    }
    case "Text":
    case "Paragraph":
      return withCustomCss(<p className={motionCls} dangerouslySetInnerHTML={{ __html: html }} />);
    case "Span":
      return withCustomCss(<span className={motionCls} dangerouslySetInnerHTML={{ __html: html }} />);
    case "RichText":
      return withCustomCss(<div className={motionCls} dangerouslySetInnerHTML={{ __html: html }} />);
    case "Image": {
      const src = str(block.image) || str(block.src);
      if (!src) return null;
      // eslint-disable-next-line @next/next/no-img-element
      return withCustomCss(<img className={motionCls} src={src} alt={str(block.alt)} />);
    }
    case "Button":
    case "Link":
      return withCustomCss(
        <a className={motionCls} href={str(block.link) || str(block.href, "#")}>
          {html ? <span dangerouslySetInnerHTML={{ __html: html }} /> : renderKids()}
        </a>,
      );
    case "Divider":
      return withCustomCss(<hr className={motionCls} />);
    case "List":
      return withCustomCss(<ul className={motionCls}>{renderKids()}</ul>);
    case "ListItem":
      return withCustomCss(<li className={motionCls} dangerouslySetInnerHTML={html ? { __html: html } : undefined}>{html ? undefined : renderKids()}</li>);
    case "GlobalWidget":
      return withCustomCss(<GlobalWidgetBlock widgetSlug={str(block.widgetSlug)} />);

    default:
      // Desconocido: si tiene hijos, los renderizamos en un wrapper; si no, nada.
      return withCustomCss(kids.length ? <div className={motionCls}>{renderKids()}</div> : null);
  }
}

/** Data sources de los bloques Repeater. Por ahora la colección "products" (y
 * cualquier id) mapea al catálogo; el id se lee del binding `repeaterItems`. */
async function fetchRepeaterData(blocks: ChaiBlock[]): Promise<Record<string, unknown[]>> {
  const repeaters = blocks.filter((b) => b._type === "Repeater");
  if (repeaters.length === 0) return {};
  const out: Record<string, unknown[]> = {};
  await Promise.all(
    repeaters.map(async (b) => {
      const colId = parseCollectionId(b.repeaterItems);
      const limit = num(b.limit, 12);
      try {
        if (colId === "categories") {
          const cats = await listCategories();
          out[b._id] = cats.slice(0, limit);
        } else {
          const { products } = await listProducts({ perPage: limit });
          out[b._id] = products;
        }
      } catch {
        out[b._id] = [];
      }
    }),
  );
  return out;
}

/** Datos de los bloques Loop del motor: ejecuta el query (por tenant) y mapea los
 * productos a ítems para los bindings item.*. */
async function fetchLoopData(blocks: ChaiBlock[]): Promise<Record<string, Record<string, unknown>[]>> {
  const loops = blocks.filter((b) => b._type === "loop");
  if (loops.length === 0) return {};
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const tenant = process.env.STORE_TENANT || "default";
  const out: Record<string, Record<string, unknown>[]> = {};
  await Promise.all(
    loops.map(async (b) => {
      const query = buildProductQuery(b as Record<string, unknown>);
      const qs = new URLSearchParams({ ...query });
      qs.set("perPage", String(num(b.limit, 8)));
      try {
        const res = await fetch(`${API}/catalog/products?${qs.toString()}`, { headers: { "x-tenant": tenant }, cache: "no-store" });
        const d = await res.json();
        out[b._id] = ((d.data as Record<string, unknown>[]) || []).map((p) => ({
          title: p.title,
          slug: p.slug,
          sku: p.sku,
          priceWeb: p.priceWeb,
          priceNormal: p.priceNormal,
          image: (p.images as { url: string }[] | undefined)?.[0]?.url || "/products/no-img.webp",
        }));
      } catch {
        out[b._id] = [];
      }
    }),
  );
  return out;
}

export default async function ChaiRender({ blocks }: { blocks: ChaiBlock[] }) {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;
  ensureEngineBindings();
  const roots = childrenOf(blocks, null);
  // Tema activo: re-tinta los bloques de comercio (Hero/precios via brand-*) para
  // que las páginas del builder matcheen el storefront. `store` alimenta el ctx de
  // los bindings dinámicos del motor (store.name/description).
  const [theme, repeaterData, loopData, store] = await Promise.all([
    getActiveTheme(),
    fetchRepeaterData(blocks),
    fetchLoopData(blocks),
    getStoreConfig().catch(() => null),
  ]);
  const ctx = { store };
  const seen = new Set<string>();
  return (
    <div className="flex flex-col gap-6" style={themeAccentVars(theme) as React.CSSProperties}>
      <style dangerouslySetInnerHTML={{ __html: MOTION_KEYFRAMES }} />
      <TailwindRuntime />
      {roots.map((b) => (
        <RenderBlock key={b._id} block={b} all={blocks} theme={theme} repeaterData={repeaterData} loopData={loopData} ctx={ctx} seen={seen} />
      ))}
    </div>
  );
}
