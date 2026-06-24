/**
 * Backend client — habla con apps/api del monorepo platform.
 * Server-side only. Cache integrada via Next 16 fetch.
 */
import type { Product, Category } from "@/types";

// Server (SSR/SSG/build) prioriza API_URL interno (ej. http://api:4000); el cliente
// no ve API_URL (no es NEXT_PUBLIC) y cae a NEXT_PUBLIC_API_URL (URL pública).
const API = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type BackendImage = { url: string; alt?: string | null; isPrimary?: boolean; position?: number };
type BackendProduct = {
  id: string;
  sku: string;
  codInterno: string | null;
  slug: string;
  title: string;
  description: string | null;
  brandId: string | null;
  categoryId: string | null;
  priceNormal: number;
  priceWeb: number;
  onPromo: boolean;
  controlled: boolean;
  featured: boolean;
  status: "draft" | "published" | "archived";
  stockCached: number;
  unit?: string;
  unitStep?: number;
  productType?: "physical" | "digital" | "service";
  attributes?: { label: string; value: string }[] | null;
  custom: Record<string, unknown> | null;
  images?: BackendImage[];
};

type BackendCategory = {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  position: number;
  icon: string | null;
  active: boolean;
};

type Paginated<T> = {
  data: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

/** Tenant del storefront (multitenant).
 * - MULTI_DOMAIN=true: reenvía el Host del usuario (`x-tenant-host`) → la API
 *   resuelve el tenant por dominio (páginas dinámicas por host).
 * - si no: tenant fijo por env `STORE_TENANT` (single-tenant, estático). */
const STORE_TENANT = process.env.STORE_TENANT ?? "default";
const MULTI_DOMAIN = process.env.MULTI_DOMAIN === "true";

async function tenantHeaders(): Promise<Record<string, string>> {
  if (MULTI_DOMAIN) {
    try {
      const { headers } = await import("next/headers");
      const h = await headers();
      // Detrás de proxy/CDN el host del usuario llega en x-forwarded-host (o el
      // override de test x-tenant-host); si no, el Host propio.
      const host = h.get("x-tenant-host") || h.get("x-forwarded-host") || h.get("host");
      if (host) return { "x-tenant-host": host };
    } catch {
      /* fuera de contexto de request → cae al env */
    }
  }
  return { "x-tenant": STORE_TENANT };
}

async function api<T>(path: string, init?: RequestInit & { revalidate?: number }): Promise<T> {
  const url = `${API}${path}`;
  const th = await tenantHeaders();
  // En multi-dominio el contenido varía por tenant (no por URL); la fetch-cache de
  // Next clavea por URL e ignoraría el host → no-store por request. Single-tenant: ISR.
  const cacheOpt: RequestInit & { next?: { revalidate: number } } = MULTI_DOMAIN
    ? { cache: "no-store" }
    : { next: { revalidate: init?.revalidate ?? 60 } };
  const res = await fetch(url, {
    headers: { Accept: "application/json", ...th, ...(init?.headers ?? {}) },
    ...cacheOpt,
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Backend ${res.status} ${path}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

function discountPct(normal: number, web: number) {
  if (normal <= 0 || web >= normal) return 0;
  return Math.round(((normal - web) / normal) * 100);
}

function adaptProduct(p: BackendProduct): Product {
  const primary = p.images?.find((i) => i.isPrimary)?.url || p.images?.[0]?.url;
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    image: primary || "/products/no-img.webp",
    priceNormal: p.priceNormal,
    priceWeb: p.priceWeb,
    discount: discountPct(p.priceNormal, p.priceWeb),
    sku: p.sku,
    stock: p.stockCached,
    description: p.description ?? undefined,
    custom: p.custom ?? null,
    gallery: p.images?.map((i) => i.url),
    unit: p.unit,
    unitStep: p.unitStep,
    productType: p.productType ?? "physical",
    attributes: p.attributes ?? null,
  };
}

function adaptCategory(c: BackendCategory): Category {
  return {
    slug: c.slug,
    name: c.name,
    href: `/categorias/${c.slug}/`,
    icon: c.icon ?? undefined,
  };
}

// ============ EXPORTS ============
export async function listProducts(opts: {
  page?: number;
  perPage?: number;
  q?: string;
  categoryId?: string;
  status?: "published" | "draft" | "archived";
  featured?: boolean;
  onPromo?: boolean;
} = {}): Promise<{ products: Product[]; total: number; page: number; perPage: number }> {
  const qs = new URLSearchParams();
  qs.set("page", String(opts.page ?? 1));
  qs.set("perPage", String(opts.perPage ?? 48));
  if (opts.q) qs.set("q", opts.q);
  if (opts.categoryId) qs.set("categoryId", opts.categoryId);
  qs.set("status", opts.status ?? "published");
  if (opts.featured !== undefined) qs.set("featured", String(opts.featured));
  if (opts.onPromo !== undefined) qs.set("onPromo", String(opts.onPromo));
  const res = await api<Paginated<BackendProduct>>(`/catalog/products?${qs.toString()}`);
  return {
    products: res.data.map(adaptProduct),
    total: res.total,
    page: res.page,
    perPage: res.perPage,
  };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const p = await api<BackendProduct>(`/catalog/products/by-slug/${encodeURIComponent(slug)}`);
    return adaptProduct(p);
  } catch (e) {
    if (String(e).includes("404")) return null;
    throw e;
  }
}

export async function listCategories(): Promise<Category[]> {
  const res = await api<Paginated<BackendCategory>>(`/catalog/categories?perPage=2000`);
  return res.data.map(adaptCategory);
}

/** Categoría cruda (con id) por slug — para resolver slug→id en páginas de categoría. */
export async function getCategoryBySlug(
  slug: string,
): Promise<{ id: string; name: string; slug: string } | null> {
  const res = await api<Paginated<BackendCategory>>(`/catalog/categories?perPage=2000`);
  const c = res.data.find((x) => x.slug === slug);
  return c ? { id: c.id, name: c.name, slug: c.slug } : null;
}

/** Productos por slug de categoría (resuelve slug→id y lista). */
export async function listProductsByCategorySlug(
  slug: string,
  perPage = 100,
): Promise<{ products: Product[]; name: string; total: number }> {
  const cat = await getCategoryBySlug(slug);
  if (!cat) return { products: [], name: slug, total: 0 };
  const { products, total } = await listProducts({ categoryId: cat.id, perPage });
  return { products, name: cat.name, total };
}

// ---- CMS pages (page builder) ----
type BackendPage = {
  id: string;
  slug: string;
  title: string;
  blocks: unknown;
  published: boolean;
  seo?: { title?: string; description?: string } | null;
};

// ---- Settings (clave-valor editables en admin) ----
export async function getSetting<T = unknown>(key: string): Promise<T | null> {
  try {
    const res = await api<{ key: string; value: T }>(`/cms/settings/${key}`, { revalidate: 30 });
    return (res?.value ?? null) as T | null;
  } catch {
    return null;
  }
}

// ---- Home: ofertas (onPromo), destacados (featured), categorías curadas ----
export async function getDeals(limit = 12): Promise<Product[]> {
  const { products } = await listProducts({ perPage: limit, onPromo: true });
  return products;
}

export async function getFeatured(limit = 8): Promise<Product[]> {
  const { products } = await listProducts({ perPage: limit, featured: true });
  return products;
}

export async function getHomeCategories(): Promise<Category[]> {
  const cats = await getSetting<Category[]>("home_categories");
  return cats ?? [];
}

// ---- Header / Footer configurables (editables en admin) ----
export type NavItem = { label: string; href: string };
export type HeaderConfig = { topNav: NavItem[]; categories: NavItem[] };
export type FooterColumn = { title: string; links: NavItem[] };
export type FooterConfig = {
  columns: FooterColumn[];
  copyright: string;
  partner?: { href: string; image: string; alt: string } | null;
};

const HEADER_DEFAULTS: HeaderConfig = {
  topNav: [
    { label: "Sucursales", href: "/sucursales/" },
    { label: "Trabaja con Nosotros", href: "#" },
    { label: "¿Donde está mi pedido?", href: "/rastrear-pedido/" },
  ],
  categories: [
    { label: "Bazar y Hogar", href: "/categorias/bazar-y-hogar/" },
    { label: "Belleza", href: "/categorias/belleza/" },
    { label: "Fragancias", href: "/categorias/fragancias/" },
    { label: "Higiene Personal", href: "/categorias/higiene-personal/" },
    { label: "Infantiles", href: "/categorias/infantiles/" },
    { label: "Mamás y Bebés", href: "/categorias/mamas-y-bebes/" },
    { label: "Medicamentos", href: "/categorias/medicamentos/" },
    { label: "Nutrición y Deporte", href: "/categorias/nutricion-y-deporte/" },
    { label: "Ofertas", href: "/categorias/ofertas/" },
  ],
};

const FOOTER_DEFAULTS: FooterConfig = {
  columns: [
    {
      title: "Información",
      links: [
        { label: "Sobre nosotros", href: "/paginas/sobre-nosotros/" },
        { label: "Sucursales", href: "/sucursales/" },
        { label: "Contacto", href: "/contacto/" },
      ],
    },
    {
      title: "Comprar",
      links: [
        { label: "Catálogo", href: "/catalogo/" },
        { label: "Ofertas", href: "/categorias/ofertas/" },
        { label: "Categorías", href: "/catalogo/" },
        { label: "Carrito", href: "/carrito/" },
      ],
    },
    {
      title: "Atención",
      links: [
        { label: "¿Dónde está mi pedido?", href: "/rastrear-pedido/" },
        { label: "Mi cuenta", href: "/mi-cuenta/" },
        { label: "Mis favoritos", href: "/mis-favoritos/" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Política de privacidad", href: "/politica-de-privacidad/" },
        { label: "Términos y condiciones", href: "/paginas/terminos-y-condiciones/" },
      ],
    },
  ],
  copyright: "Copyright 2023 © Defensores S.A. Todos los derechos reservados.",
  partner: {
    href: "https://www.century.com.py/",
    image: "/brand/century.webp",
    alt: "Century — medios de pago",
  },
};

// ---- Store config / white-label (identidad de tienda por vertical) ----
export type BrandColors = {
  orange?: string; // color de marca primario
  orangeInk?: string; // variante oscura (hover/links)
  yellow?: string; // acento
  blue?: string; // secundario
  text?: string; // texto principal
  muted?: string; // texto atenuado
  gradient?: string; // gradiente del header (CSS completo)
};
export type StoreConfig = {
  brandName: string;
  tagline: string;
  description: string;
  logoUrl: string;
  faviconUrl: string;
  currency: string; // ISO 4217, ej. PYG
  locale: string; // ej. es-PY
  colors: BrandColors;
  /** Tema visual activo del storefront (multi-tema). */
  theme: string;
};

const STORE_DEFAULTS: StoreConfig = {
  brandName: "",
  tagline: "",
  description: "",
  logoUrl: "",
  faviconUrl: "",
  currency: "PYG",
  locale: "es-PY",
  colors: {},
  theme: "base",
};

export async function getStoreConfig(): Promise<StoreConfig> {
  const cfg = await getSetting<Partial<StoreConfig>>("store_config");
  return {
    brandName: cfg?.brandName || STORE_DEFAULTS.brandName,
    tagline: cfg?.tagline || STORE_DEFAULTS.tagline,
    description: cfg?.description || STORE_DEFAULTS.description,
    logoUrl: cfg?.logoUrl || STORE_DEFAULTS.logoUrl,
    faviconUrl: cfg?.faviconUrl || STORE_DEFAULTS.faviconUrl,
    currency: cfg?.currency || STORE_DEFAULTS.currency,
    locale: cfg?.locale || STORE_DEFAULTS.locale,
    colors: cfg?.colors ?? STORE_DEFAULTS.colors,
    theme: cfg?.theme || STORE_DEFAULTS.theme,
  };
}

/** Feature-flags / perfil de rubro del tenant (de tenant.config). Controlan qué
 * UI muestra la tienda (sucursales, stock, variantes, unidades). */
export type FeatureFlags = {
  branches: boolean;
  inventory: boolean;
  variants: boolean;
  units: boolean;
};
/** Defaults permisivos: ausencia de config = comportamiento actual (todo on salvo units). */
const FLAGS_DEFAULTS: FeatureFlags = { branches: true, inventory: true, variants: true, units: false };

export async function getTenantFlags(): Promise<FeatureFlags> {
  try {
    const res = await api<{ config?: Partial<FeatureFlags> }>("/tenant", { revalidate: 30 });
    const c = res?.config ?? {};
    return {
      branches: c.branches ?? FLAGS_DEFAULTS.branches,
      inventory: c.inventory ?? FLAGS_DEFAULTS.inventory,
      variants: c.variants ?? FLAGS_DEFAULTS.variants,
      units: c.units ?? FLAGS_DEFAULTS.units,
    };
  } catch {
    return FLAGS_DEFAULTS;
  }
}

/** Genera el CSS de override de tokens de marca.
 * Cada color de la DB sobrescribe tanto los --brand-* como los tokens shadcn
 * correspondientes, de modo que no existan valores hardcodeados en globals.css. */
export function brandColorVars(colors: BrandColors): string {
  const map: Record<keyof BrandColors, string[]> = {
    orange: ["--brand-orange", "--primary", "--ring", "--sidebar-primary", "--sidebar-ring", "--accent-foreground"],
    orangeInk: ["--brand-orange-ink", "--primary-deep"],
    yellow: ["--brand-yellow"],
    blue: ["--brand-blue"],
    text: ["--brand-text", "--foreground", "--card-foreground", "--popover-foreground", "--sidebar-foreground"],
    muted: ["--brand-muted"],
    gradient: ["--brand-gradient"],
  };
  const lines = (Object.keys(map) as (keyof BrandColors)[])
    .filter((k) => colors[k])
    .flatMap((k) => map[k].map((v) => `${v}: ${colors[k]};`));
  if (colors.orange) {
    lines.push(`--brand-border: color-mix(in srgb, ${colors.orange} 10%, white);`);
  }
  return lines.length ? `:root{${lines.join("")}}` : "";
}

/**
 * Departamentos para el menú del header — REALES y ESTRUCTURADOS del backend:
 * top-level con hijos (departamentos verdaderos), del árbol de categorías.
 * Filtra el ruido (hojas que en Woo quedaron sin padre, 0 subcategorías).
 */
export async function getMenuCategories(): Promise<NavItem[]> {
  try {
    const res = await api<{ data: { name: string; slug: string; children?: unknown[] }[] }>(
      "/catalog/categories/tree",
      { revalidate: 300 },
    );
    return (res.data || [])
      .filter((c) => Array.isArray(c.children) && c.children.length > 0)
      .map((c) => ({ label: c.name, href: `/categorias/${c.slug}/` }));
  } catch {
    return [];
  }
}

export async function getHeaderConfig(): Promise<HeaderConfig> {
  const [cfg, menuCats] = await Promise.all([
    getSetting<Partial<HeaderConfig>>("header_config"),
    getMenuCategories(),
  ]);
  // Menú = departamentos reales del backend (top-level con subcategorías).
  // Admin config si existe; si no, los departamentos del catálogo; curados
  // solo como último recurso si el backend no responde.
  const categories = cfg?.categories?.length
    ? cfg.categories
    : menuCats.length
      ? menuCats
      : HEADER_DEFAULTS.categories;
  return {
    topNav: cfg?.topNav?.length ? cfg.topNav : HEADER_DEFAULTS.topNav,
    categories,
  };
}

export async function getFooterConfig(): Promise<FooterConfig> {
  const cfg = await getSetting<Partial<FooterConfig>>("footer_config");
  return {
    columns: cfg?.columns?.length ? cfg.columns : FOOTER_DEFAULTS.columns,
    copyright: cfg?.copyright || FOOTER_DEFAULTS.copyright,
    partner: cfg?.partner !== undefined ? cfg.partner : FOOTER_DEFAULTS.partner,
  };
}

// ---- Reviews / valoraciones ----
export type ReviewItem = {
  id: string;
  author: string;
  rating: number;
  title: string | null;
  body: string;
  createdAt: string;
};
export type ReviewsResult = { data: ReviewItem[]; total: number; average: number };

export async function listReviews(productId: string): Promise<ReviewsResult> {
  try {
    const res = await api<ReviewsResult>(
      `/reviews?productId=${encodeURIComponent(productId)}&perPage=50`,
      { revalidate: 30 },
    );
    return res;
  } catch {
    return { data: [], total: 0, average: 0 };
  }
}

export async function submitReview(input: {
  productId: string;
  author: string;
  email?: string;
  rating: number;
  title?: string;
  body: string;
}): Promise<{ id: string; status: string }> {
  return api<{ id: string; status: string }>("/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
}

// ---- Variantes de producto ----
export type ProductVariant = {
  id: string;
  productId: string;
  sku: string;
  title: string;
  attributes: Record<string, string> | null;
  priceNormal: number;
  priceWeb: number;
  stockCached: number;
  imageUrl: string | null;
  position: number;
};

export async function listVariants(productId: string): Promise<ProductVariant[]> {
  try {
    const res = await api<{ data: ProductVariant[]; total: number }>(
      `/catalog/products/${productId}/variants`,
      { revalidate: 30 },
    );
    return res.data;
  } catch {
    return [];
  }
}

export async function getPage(slug: string): Promise<BackendPage | null> {
  try {
    return await api<BackendPage>(`/cms/pages/by-slug/${encodeURIComponent(slug)}`, {
      revalidate: 30,
    });
  } catch (e) {
    if (String(e).includes("404")) return null;
    throw e;
  }
}
