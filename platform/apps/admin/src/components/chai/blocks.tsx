/**
 * Bloques data-bound del editor visual (Chai Builder).
 *
 * Se registran en el runtime global de Chai con `registerChaiBlock`. Cada bloque
 * expone su schema de props (configurable desde el panel del editor) y, los que
 * son data-bound, traen datos reales del catálogo vía la API.
 *
 * IMPORTANTE: este archivo es genérico (white-label). Los mismos bloques deben
 * registrarse en el storefront (clone) para el render SSR — ver
 * docs/research/visual-editor-comparison.md.
 */
import { registerChaiBlock } from '@chaibuilder/sdk/runtime'
import useSWR from 'swr'
import ApiService from '@/services/ApiService'

type ApiProduct = {
    id: string
    slug: string
    title: string
    priceWeb: number
    priceNormal: number
    onPromo?: boolean
    images?: { url: string; isPrimary?: boolean }[]
}

const money = (n: number) =>
    new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(n || 0)

function imgOf(p: ApiProduct) {
    return p.images?.find((i) => i.isPrimary)?.url || p.images?.[0]?.url || ''
}

async function fetchProducts(params: Record<string, string | number | boolean>) {
    const res = await ApiService.fetchDataWithAxios<{ data: ApiProduct[]; total: number }>({
        url: '/catalog/products',
        method: 'get',
        params,
    })
    return res.data || []
}

function useProducts(params: Record<string, string | number | boolean>) {
    const { data } = useSWR(['chai-products', JSON.stringify(params)], () => fetchProducts(params), {
        revalidateOnFocus: false,
    })
    return data || []
}

// ─────────────────────────── Card reutilizable ───────────────────────────
function ProductCard({ p }: { p: ApiProduct }) {
    return (
        <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
            <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-50">
                {imgOf(p) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imgOf(p)} alt={p.title} className="h-full w-full object-contain" />
                ) : (
                    <div className="flex h-full items-center justify-center text-xs text-gray-300">sin imagen</div>
                )}
            </div>
            <div className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm text-gray-700">{p.title}</div>
            <div className="mt-1 flex items-baseline gap-2">
                <span className="text-base font-semibold text-gray-900">{money(p.priceWeb)}</span>
                {p.onPromo && p.priceNormal > p.priceWeb && (
                    <span className="text-xs text-gray-400 line-through">{money(p.priceNormal)}</span>
                )}
            </div>
        </div>
    )
}

function Grid({ products, cols }: { products: ApiProduct[]; cols: number }) {
    return (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {products.map((p) => (
                <ProductCard key={p.id} p={p} />
            ))}
        </div>
    )
}

// ─────────────────────────── Hero ───────────────────────────
type HeroProps = {
    title?: string
    subtitle?: string
    ctaLabel?: string
    ctaHref?: string
    image?: string
    align?: 'left' | 'center'
}

function Hero({ title, subtitle, ctaLabel, ctaHref, image, align = 'left' }: HeroProps) {
    return (
        <section
            className="relative overflow-hidden rounded-2xl bg-gray-900 px-8 py-16 text-white"
            style={
                image
                    ? { backgroundImage: `linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.45)),url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                    : undefined
            }
        >
            <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
                <h2 className="text-3xl font-bold sm:text-4xl">{title || 'Título del hero'}</h2>
                {subtitle && <p className="mt-3 text-lg text-gray-200">{subtitle}</p>}
                {ctaLabel && (
                    <a
                        href={ctaHref || '#'}
                        className="mt-6 inline-block rounded-lg bg-white px-5 py-2.5 font-medium text-gray-900"
                    >
                        {ctaLabel}
                    </a>
                )}
            </div>
        </section>
    )
}

// ─────────────────────────── ProductGrid ───────────────────────────
type ProductGridProps = { title?: string; categorySlug?: string; limit?: number; columns?: number; inBuilder?: boolean }

function ProductGrid({ title, categorySlug, limit = 8, columns = 4 }: ProductGridProps) {
    const params: Record<string, string | number | boolean> = { perPage: limit, page: 1 }
    if (categorySlug) params.category = categorySlug
    const products = useProducts(params)
    return (
        <section className="py-6">
            {title && <h3 className="mb-4 text-xl font-semibold text-gray-900">{title}</h3>}
            {products.length ? (
                <Grid products={products.slice(0, limit)} cols={columns} />
            ) : (
                <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
                    Sin productos para mostrar
                </div>
            )}
        </section>
    )
}

// ─────────────────────────── HomeDeals (ofertas) ───────────────────────────
type HomeDealsProps = { title?: string; limit?: number; columns?: number }

function HomeDeals({ title = 'Ofertas', limit = 6, columns = 6 }: HomeDealsProps) {
    const products = useProducts({ perPage: limit, page: 1, onPromo: true })
    return (
        <section className="rounded-2xl bg-red-50 p-5">
            <div className="mb-4 flex items-center gap-2">
                <span className="rounded bg-red-600 px-2 py-1 text-xs font-bold uppercase text-white">Oferta</span>
                <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            </div>
            {products.length ? (
                <Grid products={products.slice(0, limit)} cols={columns} />
            ) : (
                <div className="rounded-xl border border-dashed border-red-200 p-8 text-center text-sm text-red-300">
                    Sin ofertas activas
                </div>
            )}
        </section>
    )
}

// ─────────────────────────── Banner ───────────────────────────
type BannerProps = {
    title?: string
    subtitle?: string
    ctaLabel?: string
    ctaHref?: string
    image?: string
    align?: 'left' | 'center'
}

function Banner({ title, subtitle, ctaLabel, image, align = 'left' }: BannerProps) {
    return (
        <section
            className="relative overflow-hidden rounded-2xl px-6 py-10 text-white"
            style={
                image
                    ? { backgroundImage: `linear-gradient(rgba(0,0,0,.4),rgba(0,0,0,.4)),url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                    : { background: 'linear-gradient(135deg,#1f2937,#374151)' }
            }
        >
            <div className={align === 'center' ? 'mx-auto max-w-xl text-center' : 'max-w-xl'}>
                <h3 className="text-2xl font-bold">{title || 'Banner promocional'}</h3>
                {subtitle && <p className="mt-2 text-sm text-gray-200">{subtitle}</p>}
                {ctaLabel && (
                    <span className="mt-4 inline-block rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-900">
                        {ctaLabel}
                    </span>
                )}
            </div>
        </section>
    )
}

// ─────────────────────────── CategoryShowcase ───────────────────────────
type CategoryShowcaseProps = { title?: string; limit?: number }

function CategoryShowcase({ title = 'Categorías', limit = 8 }: CategoryShowcaseProps) {
    const tiles = Array.from({ length: Math.max(1, Math.min(limit, 12)) })
    return (
        <section className="py-4">
            {title && <h3 className="mb-4 text-xl font-semibold text-gray-900">{title}</h3>}
            <div className="grid grid-cols-4 gap-3">
                {tiles.map((_, i) => (
                    <div
                        key={i}
                        className="flex h-20 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-xs text-gray-400"
                    >
                        categoría
                    </div>
                ))}
            </div>
        </section>
    )
}

// ─────────────────────────── Brands ───────────────────────────
type BrandsProps = { title?: string; logos?: string }

function Brands({ title = 'Marcas', logos }: BrandsProps) {
    const urls = (logos || '').split(',').map((s) => s.trim()).filter(Boolean)
    const cells = urls.length ? urls : Array.from({ length: 6 }).map(() => '')
    return (
        <section className="py-4">
            {title && <h3 className="mb-4 text-xl font-semibold text-gray-900">{title}</h3>}
            <div className="grid grid-cols-6 gap-3">
                {cells.map((u, i) => (
                    <div
                        key={i}
                        className="flex h-16 items-center justify-center rounded-lg border border-gray-100 bg-white px-2"
                    >
                        {u ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u} alt="" className="max-h-full max-w-full object-contain" />
                        ) : (
                            <span className="text-xs text-gray-300">logo</span>
                        )}
                    </div>
                ))}
            </div>
        </section>
    )
}

// ─────────────────────────── Benefits ───────────────────────────
type BenefitsProps = { title?: string }

function Benefits({ title }: BenefitsProps) {
    const items = [
        { t: 'Envío a domicilio', s: 'En todo el país' },
        { t: 'Devoluciones', s: 'Hasta 30 días' },
        { t: 'Pago seguro', s: 'Compra protegida' },
        { t: 'Atención', s: 'Soporte dedicado' },
    ]
    return (
        <section className="py-4">
            {title && <h3 className="mb-4 text-xl font-semibold text-gray-900">{title}</h3>}
            <div className="grid grid-cols-4 gap-3">
                {items.map((it) => (
                    <div key={it.t} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3">
                        <div className="h-9 w-9 shrink-0 rounded-full bg-gray-100" />
                        <div>
                            <div className="text-sm font-semibold text-gray-900">{it.t}</div>
                            <div className="text-xs text-gray-500">{it.s}</div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}

// ─────────────────────────── Título (encabezado) ───────────────────────────
type TituloProps = { text?: string; level?: 'h2' | 'h3' | 'h4'; align?: 'left' | 'center' }

function Titulo({ text, level = 'h2', align = 'left' }: TituloProps) {
    const Tag = (['h2', 'h3', 'h4'].includes(level || '') ? level : 'h2') as 'h2' | 'h3' | 'h4'
    const size = Tag === 'h2' ? 'text-2xl' : Tag === 'h3' ? 'text-xl' : 'text-lg'
    return (
        <Tag className={`${size} mt-2 font-bold text-gray-900 ${align === 'center' ? 'text-center' : ''}`}>
            {text || 'Título de sección'}
        </Tag>
    )
}

// ─────────────────────────── Texto (cuerpo) ───────────────────────────
type TextoProps = { html?: string; align?: 'left' | 'center' }

function Texto({ html, align = 'left' }: TextoProps) {
    return (
        <div
            className={`text-[15px] leading-relaxed text-gray-600 ${align === 'center' ? 'text-center' : ''}`}
            dangerouslySetInnerHTML={{ __html: html || 'Escribí aquí el contenido del párrafo…' }}
        />
    )
}

// ─────────────────────────── Registro ───────────────────────────
let registered = false

/** Registra los bloques de comercio en el runtime de Chai (idempotente). */
export function registerCommerceBlocks() {
    if (registered) return
    registered = true

    /* eslint-disable @typescript-eslint/no-explicit-any */
    registerChaiBlock(Hero as any, {
        type: 'Hero',
        label: 'Hero / Banner',
        group: 'Comercio',
        description: 'Banner principal con título, subtítulo y CTA.',
        props: {
            schema: {
                properties: {
                    title: { type: 'string', title: 'Título', default: 'Bienvenido a la tienda' },
                    subtitle: { type: 'string', title: 'Subtítulo', default: '' },
                    ctaLabel: { type: 'string', title: 'Texto del botón', default: 'Ver productos' },
                    ctaHref: { type: 'string', title: 'Enlace del botón', default: '/productos' },
                    image: { type: 'string', title: 'Imagen de fondo (URL)', default: '' },
                    align: { type: 'string', title: 'Alineación', enum: ['left', 'center'], default: 'left' },
                },
            },
            uiSchema: {},
        },
        i18nProps: ['title', 'subtitle', 'ctaLabel'],
    } as any)

    registerChaiBlock(ProductGrid as any, {
        type: 'ProductGrid',
        label: 'Grilla de productos',
        group: 'Comercio',
        description: 'Lista de productos del catálogo (filtrable por categoría).',
        props: {
            schema: {
                properties: {
                    title: { type: 'string', title: 'Título', default: 'Destacados' },
                    categorySlug: { type: 'string', title: 'Categoría (slug, opcional)', default: '' },
                    limit: { type: 'number', title: 'Cantidad', default: 8 },
                    columns: { type: 'number', title: 'Columnas', default: 4 },
                },
            },
            uiSchema: {},
        },
        i18nProps: ['title'],
    } as any)

    registerChaiBlock(HomeDeals as any, {
        type: 'HomeDeals',
        label: 'Ofertas del día',
        group: 'Comercio',
        description: 'Productos en promoción (onPromo).',
        props: {
            schema: {
                properties: {
                    title: { type: 'string', title: 'Título', default: 'Ofertas' },
                    limit: { type: 'number', title: 'Cantidad', default: 6 },
                    columns: { type: 'number', title: 'Columnas', default: 6 },
                },
            },
            uiSchema: {},
        },
        i18nProps: ['title'],
    } as any)

    registerChaiBlock(Banner as any, {
        type: 'Banner',
        label: 'Banner promocional',
        group: 'Comercio',
        description: 'Banner con imagen o degradado de marca, título, subtítulo y CTA.',
        props: {
            schema: {
                properties: {
                    title: { type: 'string', title: 'Título', default: 'Banner promocional' },
                    subtitle: { type: 'string', title: 'Subtítulo', default: '' },
                    ctaLabel: { type: 'string', title: 'Texto del botón', default: '' },
                    ctaHref: { type: 'string', title: 'Enlace del botón', default: '#' },
                    image: { type: 'string', title: 'Imagen de fondo (URL)', default: '' },
                    align: { type: 'string', title: 'Alineación', enum: ['left', 'center'], default: 'left' },
                },
            },
            uiSchema: {},
        },
        i18nProps: ['title', 'subtitle', 'ctaLabel'],
    } as any)

    registerChaiBlock(CategoryShowcase as any, {
        type: 'CategoryShowcase',
        label: 'Vitrina de categorías',
        group: 'Comercio',
        description: 'Grilla de categorías del catálogo enlazadas.',
        props: {
            schema: {
                properties: {
                    title: { type: 'string', title: 'Título', default: 'Categorías' },
                    limit: { type: 'number', title: 'Cantidad', default: 8 },
                },
            },
            uiSchema: {},
        },
        i18nProps: ['title'],
    } as any)

    registerChaiBlock(Brands as any, {
        type: 'Brands',
        label: 'Marcas',
        group: 'Comercio',
        description: 'Tira de logos de marcas (URLs separadas por coma, opcional).',
        props: {
            schema: {
                properties: {
                    title: { type: 'string', title: 'Título', default: 'Marcas' },
                    logos: { type: 'string', title: 'Logos (URLs separadas por coma)', default: '' },
                },
            },
            uiSchema: {},
        },
        i18nProps: ['title'],
    } as any)

    registerChaiBlock(Benefits as any, {
        type: 'Benefits',
        label: 'Beneficios',
        group: 'Comercio',
        description: 'Fila de beneficios (envío, devoluciones, pago seguro, atención).',
        props: {
            schema: {
                properties: {
                    title: { type: 'string', title: 'Título', default: '' },
                },
            },
            uiSchema: {},
        },
        i18nProps: ['title'],
    } as any)

    registerChaiBlock(Titulo as any, {
        type: 'Titulo',
        label: 'Título / Encabezado',
        group: 'Contenido',
        description: 'Encabezado de sección (h2/h3/h4).',
        props: {
            schema: {
                properties: {
                    text: { type: 'string', title: 'Texto', default: 'Título de sección' },
                    level: { type: 'string', title: 'Nivel', enum: ['h2', 'h3', 'h4'], default: 'h2' },
                    align: { type: 'string', title: 'Alineación', enum: ['left', 'center'], default: 'left' },
                },
            },
            uiSchema: {},
        },
        i18nProps: ['text'],
    } as any)

    registerChaiBlock(Texto as any, {
        type: 'Texto',
        label: 'Texto / Párrafo',
        group: 'Contenido',
        description: 'Bloque de texto con formato (negrita, enlaces, saltos de línea).',
        props: {
            schema: {
                properties: {
                    html: {
                        type: 'string',
                        title: 'Contenido',
                        default: 'Escribí aquí el contenido del párrafo…',
                        ui: { 'ui:widget': 'richtext' },
                    },
                    align: { type: 'string', title: 'Alineación', enum: ['left', 'center'], default: 'left' },
                },
            },
            uiSchema: {},
        },
        i18nProps: ['html'],
    } as any)
    /* eslint-enable @typescript-eslint/no-explicit-any */
}
