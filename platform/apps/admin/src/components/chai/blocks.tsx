/**
 * Bloques data-bound del editor visual (Chai Builder).
 *
 * Se registran en el runtime global de Chai con `registerChaiBlock`. Cada bloque
 * expone su schema de props (configurable desde el panel del editor) y, los que
 * son data-bound, traen datos reales del catálogo vía la API.
 *
 * Dos capacidades transversales de edición:
 *  1. ESTILOS por bloque: cada bloque declara `styles: StylesProp(<clases>)`, y su
 *     componente vuelca `{...styles}` sobre la raíz → la pestaña de Estilos del
 *     editor re-estiliza el contenedor (padding, fondo, bordes, etc.).
 *  2. SELECCIÓN por query: los campos de catálogo (p. ej. categoría) usan widgets
 *     que consultan el backend real en vez de texto libre (ver CategoryPicker).
 *
 * IMPORTANTE: este archivo es genérico (white-label). Los mismos bloques deben
 * reflejarse en el storefront (store) para el render SSR — ver
 * docs/research/visual-editor-comparison.md.
 */
import { registerChaiBlock, registerChaiCollection, registerChaiBlockProps, StylesProp } from '@chaibuilder/sdk/runtime'
import { registerChaiBlockSettingWidget } from '@chaibuilder/sdk'
import { useMemo, useState } from 'react'
import useSWR from 'swr'
import ApiService from '@/services/ApiService'

/* eslint-disable @typescript-eslint/no-explicit-any */

type ApiProduct = {
    id: string
    slug: string
    title: string
    priceWeb: number
    priceNormal: number
    onPromo?: boolean
    images?: { url: string; isPrimary?: boolean }[]
}

type ApiCategory = { id: string; slug: string; name: string; parentId?: string | null }

/** styles inyectado por el runtime de Chai: `{ className, style }`. */
type ChaiStyles = { className?: string; style?: React.CSSProperties }

const money = (n: number) =>
    new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(n || 0)

function imgOf(p: ApiProduct) {
    return p.images?.find((i) => i.isPrimary)?.url || p.images?.[0]?.url || ''
}

/**
 * Props de la raíz del bloque. Esparce el objeto `styles` COMPLETO (no solo
 * className/style): trae además los `data-style-*` que el editor usa para anclar
 * la pestaña de Estilos al elemento. Mismo patrón que los web-blocks nativos
 * (`{...styles, ...blockProps}`). `extraStyle` mezcla estilos dinámicos (fondo,
 * grilla) sobre los inline del bloque.
 */
function root(styles?: ChaiStyles, blockProps?: any, extraStyle?: React.CSSProperties) {
    const s: any = styles || {}
    const bp: any = blockProps || {}
    const merged: any = { ...s, ...bp }
    if (extraStyle) merged.style = { ...(s.style || {}), ...(bp.style || {}), ...extraStyle }
    return merged
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

/** Catálogo plano de categorías (para el selector por query). */
function useAllCategories(): ApiCategory[] {
    const { data } = useSWR(
        'chai-all-cats',
        async () => {
            const res = await ApiService.fetchDataWithAxios<{ data: ApiCategory[] }>({
                url: '/catalog/categories',
                method: 'get',
            })
            return res.data || []
        },
        { revalidateOnFocus: false },
    )
    return data || []
}

async function fetchSetting<T>(key: string): Promise<T | null> {
    const res = await ApiService.fetchDataWithAxios<{ key: string; value: T }>({
        url: `/cms/settings/${key}`,
        method: 'get',
    })
    return (res?.value as T) ?? null
}

type Slide = { id: string; imageDesktop?: string | null; imageMobile?: string | null; title?: string }
function useSlides() {
    const { data } = useSWR('chai-slides', async () => {
        const res = await ApiService.fetchDataWithAxios<{ data: Slide[] }>({ url: '/slides/today', method: 'get' })
        return res?.data || []
    }, { revalidateOnFocus: false })
    return data || []
}

type HomeCat = { name: string; image?: string; icon?: string }
function useHomeCategories() {
    const { data } = useSWR('chai-home-cats', () => fetchSetting<HomeCat[]>('home_categories'), { revalidateOnFocus: false })
    return data || []
}

type PromoBannerData = { image?: string; title?: string; href?: string }
function usePromoBanner(index: number) {
    const { data } = useSWR(['chai-promo', index], () => fetchSetting<PromoBannerData[]>('promo_banners'), { revalidateOnFocus: false })
    return (data || [])[index] || null
}

// ─────────────────────────── Widget: selector de categoría (por query) ───────────────────────────
/**
 * Widget RJSF que reemplaza el texto libre del slug de categoría por un buscador
 * sobre las categorías reales del backend. Guarda el `slug` seleccionado.
 */
function CategoryPicker(props: { value?: string; onChange?: (v: string) => void }) {
    const { value, onChange } = props
    const cats = useAllCategories()
    const [q, setQ] = useState('')
    const current = cats.find((c) => c.slug === value)
    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase()
        const base = t ? cats.filter((c) => c.name.toLowerCase().includes(t) || c.slug.includes(t)) : cats
        return base.slice(0, 50)
    }, [q, cats])

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between rounded border border-gray-200 bg-white px-2 py-1 text-xs">
                <span className={current || value ? 'text-gray-800' : 'text-gray-400'}>
                    {current ? current.name : value || 'Todas las categorías'}
                </span>
                {value ? (
                    <button type="button" onClick={() => onChange?.('')} className="text-gray-400 hover:text-gray-700">
                        limpiar
                    </button>
                ) : null}
            </div>
            <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar categoría…"
                className="rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-gray-400"
            />
            {q ? (
                <div className="max-h-44 overflow-auto rounded border border-gray-100 bg-white">
                    {filtered.length ? (
                        filtered.map((c) => (
                            <button
                                type="button"
                                key={c.slug}
                                onClick={() => {
                                    onChange?.(c.slug)
                                    setQ('')
                                }}
                                className="block w-full px-2 py-1 text-left text-xs hover:bg-gray-50"
                            >
                                {c.name}
                                {c.parentId ? <span className="ml-1 text-gray-300">· sub</span> : null}
                            </button>
                        ))
                    ) : (
                        <div className="px-2 py-1 text-xs text-gray-400">Sin resultados</div>
                    )}
                </div>
            ) : null}
        </div>
    )
}

/** Helper de schema: campo de categoría editado con el widget por query. */
const categoryField = (title = 'Categoría'): any => ({
    type: 'string',
    title,
    default: '',
    ui: { 'ui:widget': 'categoryPicker' },
})

// ─────────────────────────── Widget: selector de marca (por query) ───────────────────────────
type ApiBrand = { id: string; slug: string; name: string }
function useAllBrands(): ApiBrand[] {
    const { data } = useSWR(
        'chai-all-brands',
        async () => {
            const res = await ApiService.fetchDataWithAxios<{ data: ApiBrand[] }>({ url: '/catalog/brands', method: 'get' })
            return res.data || []
        },
        { revalidateOnFocus: false },
    )
    return data || []
}

function BrandPicker(props: { value?: string; onChange?: (v: string) => void }) {
    const { value, onChange } = props
    const brands = useAllBrands()
    const [q, setQ] = useState('')
    const current = brands.find((b) => b.slug === value)
    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase()
        return (t ? brands.filter((b) => b.name.toLowerCase().includes(t) || b.slug.includes(t)) : brands).slice(0, 50)
    }, [q, brands])
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between rounded border border-gray-200 bg-white px-2 py-1 text-xs">
                <span className={current || value ? 'text-gray-800' : 'text-gray-400'}>
                    {current ? current.name : value || 'Todas las marcas'}
                </span>
                {value ? (
                    <button type="button" onClick={() => onChange?.('')} className="text-gray-400 hover:text-gray-700">
                        limpiar
                    </button>
                ) : null}
            </div>
            <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar marca…"
                className="rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-gray-400"
            />
            {q ? (
                <div className="max-h-44 overflow-auto rounded border border-gray-100 bg-white">
                    {filtered.length ? (
                        filtered.map((b) => (
                            <button
                                type="button"
                                key={b.slug}
                                onClick={() => {
                                    onChange?.(b.slug)
                                    setQ('')
                                }}
                                className="block w-full px-2 py-1 text-left text-xs hover:bg-gray-50"
                            >
                                {b.name}
                            </button>
                        ))
                    ) : (
                        <div className="px-2 py-1 text-xs text-gray-400">Sin resultados</div>
                    )}
                </div>
            ) : null}
        </div>
    )
}

// ─────────────────────────── Widget: selección manual de productos (multi, por query) ───────────────────────────
function ProductPicker(props: { value?: string; onChange?: (v: string) => void }) {
    const { value, onChange } = props
    const ids = (value || '').split(',').map((s) => s.trim()).filter(Boolean)
    const [q, setQ] = useState('')
    const { data: results } = useSWR(
        q.trim() ? ['chai-prod-search', q] : null,
        async () => fetchProducts({ perPage: 12, page: 1, q: q.trim() }),
        { revalidateOnFocus: false },
    )
    const { data: selected } = useSWR(
        ids.length ? ['chai-prod-byids', value] : null,
        async () => fetchProducts({ perPage: 50, page: 1, ids: ids.join(',') }),
        { revalidateOnFocus: false },
    )
    const add = (id: string) => {
        if (!ids.includes(id)) onChange?.([...ids, id].join(','))
        setQ('')
    }
    const remove = (id: string) => onChange?.(ids.filter((x) => x !== id).join(','))
    return (
        <div className="flex flex-col gap-1.5">
            {(selected || []).length ? (
                <div className="flex flex-wrap gap-1">
                    {(selected || []).map((p) => (
                        <span key={p.id} className="flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-700">
                            {p.title.slice(0, 22)}
                            <button type="button" onClick={() => remove(p.id)} className="text-gray-400 hover:text-gray-700">
                                ×
                            </button>
                        </span>
                    ))}
                </div>
            ) : (
                <div className="text-[11px] text-gray-400">Sin productos seleccionados</div>
            )}
            <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar producto…"
                className="rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-gray-400"
            />
            {q ? (
                <div className="max-h-44 overflow-auto rounded border border-gray-100 bg-white">
                    {(results || []).length ? (
                        (results || []).map((p) => (
                            <button
                                type="button"
                                key={p.id}
                                onClick={() => add(p.id)}
                                className="block w-full px-2 py-1 text-left text-xs hover:bg-gray-50"
                            >
                                {p.title}
                            </button>
                        ))
                    ) : (
                        <div className="px-2 py-1 text-xs text-gray-400">Sin resultados</div>
                    )}
                </div>
            ) : null}
        </div>
    )
}

/**
 * Grupo de propiedades de QUERY reutilizable (equivalente al "Query" de Elementor).
 * Se aplica a los bloques de listado (ProductGrid, Catálogo). Filtros respaldados
 * por columnas reales del catálogo. NO incluidos (sin columna que los respalde):
 * etiquetas, popularidad/best-selling, rating/top-rated.
 */
/** Filtros de query (subconjunto reutilizable en ProductGrid y Catálogo). */
const filterProps = (): Record<string, any> => ({
    source: {
        type: 'string',
        title: 'Origen',
        enum: ['all', 'onPromo', 'featured', 'newest', 'manual'],
        enumNames: ['Todos', 'En oferta', 'Destacados', 'Más nuevos', 'Selección manual'],
        default: 'all',
    },
    ids: { type: 'string', title: 'Productos (selección manual)', default: '', ui: { 'ui:widget': 'productPicker' } },
    categorySlug: categoryField('Categoría'),
    brand: { type: 'string', title: 'Marca', default: '', ui: { 'ui:widget': 'brandPicker' } },
    q: { type: 'string', title: 'Búsqueda (palabra clave)', default: '' },
    orderBy: {
        type: 'string',
        title: 'Ordenar por',
        enum: ['createdAt', 'title', 'priceWeb', 'random'],
        enumNames: ['Fecha', 'Nombre', 'Precio', 'Aleatorio'],
        default: 'createdAt',
    },
    order: { type: 'string', title: 'Dirección', enum: ['desc', 'asc'], enumNames: ['Descendente', 'Ascendente'], default: 'desc' },
    inStock: { type: 'boolean', title: 'Solo con stock', default: false },
    priceMin: { type: 'number', title: 'Precio mínimo (Gs)', default: 0 },
    priceMax: { type: 'number', title: 'Precio máximo (Gs, 0 = sin límite)', default: 0 },
})

/** Query completa (Elementor-equivalente) para listados con cantidad/offset propios. */
const queryProps = (): Record<string, any> => ({
    ...filterProps(),
    limit: { type: 'number', title: 'Cantidad', default: 8 },
    offset: { type: 'number', title: 'Saltar (offset)', default: 0 },
    columns: { type: 'number', title: 'Columnas', default: 4 },
})

/** Traduce las props de query del bloque a los params de la API (admin preview + store comparten la idea). */
function buildProductParams(b: Record<string, any>): Record<string, string | number | boolean> {
    const p: Record<string, string | number | boolean> = { page: 1, perPage: Number(b.perPage ?? b.limit) || 8 }
    const source = b.source || 'all'
    if (source === 'onPromo') p.onPromo = true
    if (source === 'featured') p.featured = true
    if (source === 'manual' && b.ids) p.ids = String(b.ids)
    if (b.categorySlug) p.category = String(b.categorySlug)
    if (b.brand) p.brand = String(b.brand)
    if (b.q) p.q = String(b.q)
    if (b.inStock) p.inStock = true
    if (Number(b.priceMin) > 0) p.priceMin = Number(b.priceMin)
    if (Number(b.priceMax) > 0) p.priceMax = Number(b.priceMax)
    if (Number(b.offset) > 0) p.offset = Number(b.offset)
    p.sort =
        source === 'newest'
            ? 'createdAt:desc'
            : b.orderBy === 'random'
              ? 'random'
              : `${b.orderBy || 'createdAt'}:${b.order || 'desc'}`
    return p
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
type CommonProps = { styles?: ChaiStyles; blockProps?: any }
type HeroProps = CommonProps & {
    title?: string
    subtitle?: string
    ctaLabel?: string
    ctaHref?: string
    image?: string
    align?: 'left' | 'center'
}

function Hero({ title, subtitle, ctaLabel, ctaHref, image, align = 'left', styles, blockProps }: HeroProps) {
    const bg: React.CSSProperties = image
        ? { backgroundImage: `linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.45)),url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { background: 'linear-gradient(135deg,#111827,#374151)' }
    return (
        <section {...root(styles, blockProps, bg)}>
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

// ─────────────────────────── ProductGrid (query Elementor-equivalente) ───────────────────────────
function ProductGrid(props: any) {
    const { title, columns = 4, limit = 8, styles, blockProps } = props
    const products = useProducts({ ...buildProductParams(props), status: 'published' })
    return (
        <section {...root(styles, blockProps)}>
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
type HomeDealsProps = CommonProps & { title?: string; limit?: number; columns?: number }

function HomeDeals({ title = 'Ofertas', limit = 6, columns = 6, styles, blockProps }: HomeDealsProps) {
    const products = useProducts({ perPage: limit, page: 1, onPromo: true })
    return (
        <section {...root(styles, blockProps)}>
            <div className="rounded-2xl bg-red-50 p-5">
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
            </div>
        </section>
    )
}

// ─────────────────────────── Banner ───────────────────────────
type BannerProps = CommonProps & {
    title?: string
    subtitle?: string
    ctaLabel?: string
    ctaHref?: string
    image?: string
    align?: 'left' | 'center'
}

function Banner({ title, subtitle, ctaLabel, image, align = 'left', styles, blockProps }: BannerProps) {
    const bg = image
        ? { backgroundImage: `linear-gradient(rgba(0,0,0,.4),rgba(0,0,0,.4)),url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center' as const }
        : { background: 'linear-gradient(135deg,#1f2937,#374151)' }
    return (
        <section {...root(styles, blockProps, bg)}>
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
type CategoryShowcaseProps = CommonProps & { title?: string; limit?: number }

function CategoryShowcase({ title = 'Categorías', limit = 8, styles, blockProps }: CategoryShowcaseProps) {
    const tiles = Array.from({ length: Math.max(1, Math.min(limit, 12)) })
    return (
        <section {...root(styles, blockProps)}>
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
type BrandsProps = CommonProps & { title?: string; logos?: string }

function Brands({ title = 'Marcas', logos, styles, blockProps }: BrandsProps) {
    const urls = (logos || '').split(',').map((s) => s.trim()).filter(Boolean)
    const cells = urls.length ? urls : Array.from({ length: 6 }).map(() => '')
    return (
        <section {...root(styles, blockProps)}>
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
type BenefitsProps = CommonProps & { title?: string }

function Benefits({ title, styles, blockProps }: BenefitsProps) {
    const items = [
        { t: 'Envío a domicilio', s: 'En todo el país' },
        { t: 'Devoluciones', s: 'Hasta 30 días' },
        { t: 'Pago seguro', s: 'Compra protegida' },
        { t: 'Atención', s: 'Soporte dedicado' },
    ]
    return (
        <section {...root(styles, blockProps)}>
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

// ─────────────────────────── HeroSlider (slider del home) ───────────────────────────
function SliderBlock({ styles, blockProps }: CommonProps) {
    const slides = useSlides()
    const first = slides[0]
    const img = first?.imageDesktop || first?.imageMobile
    return (
        <section {...root(styles, blockProps)}>
            <div className="overflow-hidden rounded-2xl bg-gray-100">
                {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={first?.title || ''} className="w-full object-cover" />
                ) : (
                    <div className="flex h-56 items-center justify-center text-sm text-gray-400">
                        Slider del home (banners por día — se editan en “Slider y banners”)
                    </div>
                )}
            </div>
        </section>
    )
}

// ─────────────────────────── CategoryCircles (círculos de categorías) ───────────────────────────
function CirclesBlock({ styles, blockProps }: CommonProps) {
    const cats = useHomeCategories()
    const cells: (HomeCat | null)[] = cats.length ? cats : Array.from({ length: 8 }).map(() => null)
    return (
        <section {...root(styles, blockProps)}>
            <div className="grid grid-cols-8 gap-3">
                {cells.map((c, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                            {c?.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={c.image} alt="" className="h-full w-full object-cover" />
                            ) : null}
                        </div>
                        <span className="line-clamp-1 text-center text-[11px] text-gray-500">{c?.name || 'Categoría'}</span>
                    </div>
                ))}
            </div>
        </section>
    )
}

// ─────────────────────────── Featured (selección para vos) ───────────────────────────
function FeaturedBlock({ title = 'Selección para vos', limit = 8, columns = 4, styles, blockProps }: CommonProps & { title?: string; limit?: number; columns?: number }) {
    const products = useProducts({ perPage: limit, page: 1, featured: true })
    return (
        <section {...root(styles, blockProps)}>
            {title && <h3 className="mb-4 text-xl font-semibold text-gray-900">{title}</h3>}
            {products.length ? (
                <Grid products={products.slice(0, limit)} cols={columns} />
            ) : (
                <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
                    Sin productos destacados
                </div>
            )}
        </section>
    )
}

// ─────────────────────────── PromoBanner (banner promocional CMS) ───────────────────────────
function PromoBlock({ index = 0, styles, blockProps }: CommonProps & { index?: number }) {
    const banner = usePromoBanner(index)
    return banner?.image ? (
        <section {...root(styles, blockProps)}>
            <div className="overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={banner.image} alt={banner.title || ''} className="w-full object-cover" />
            </div>
        </section>
    ) : (
        <section {...root(styles, blockProps)}>
            <div className="flex h-32 items-center justify-center rounded-2xl bg-gray-100 text-sm text-gray-400">
                Banner promocional (slot #{index} — se edita en “Slider y banners”)
            </div>
        </section>
    )
}

// ─────────────────────────── SiteHeader / SiteFooter (chrome) ───────────────────────────
function SiteHeaderPv({ styles, blockProps }: CommonProps) {
    return (
        <header {...root(styles, blockProps)}>
            <div className="flex items-center justify-between bg-gray-50 px-6 py-1.5 text-[11px] text-gray-400">
                <span>Sucursales · Trabajá con nosotros · ¿Dónde está mi pedido?</span>
                <span>Sucursal más cercana</span>
            </div>
            <div className="flex items-center gap-4 bg-gradient-to-r from-orange-500 to-amber-400 px-6 py-4 text-white">
                <span className="text-xl font-bold">logo</span>
                <span className="rounded-md bg-white/20 px-3 py-1.5 text-sm">≡ Categorías</span>
                <div className="h-10 flex-1 rounded-full bg-white/90" />
                <span className="text-sm">cuenta · carrito</span>
            </div>
        </header>
    )
}

function SiteFooterPv({ styles, blockProps }: CommonProps) {
    return (
        <footer {...root(styles, blockProps)}>
            <div className="grid grid-cols-4 gap-6">
                {['Información', 'Comprar', 'Atención', 'Newsletter'].map((c) => (
                    <div key={c}>
                        <div className="mb-2 font-semibold text-gray-600">{c}</div>
                        <div className="space-y-1.5">{[1, 2, 3].map((i) => <div key={i} className="h-2.5 w-24 rounded bg-gray-100" />)}</div>
                    </div>
                ))}
            </div>
            <div className="mt-6 border-t border-gray-100 pt-4 text-xs">© Copyright — pie de página</div>
        </footer>
    )
}

// ─────────────────────────── Bloques de Header (chrome construible) ───────────────────────────
function HdTopBarPv({ styles, blockProps }: CommonProps) {
    return (
        <div {...root(styles, blockProps)}>
            <span>Sucursales · Trabajá con nosotros · ¿Dónde está mi pedido?</span>
            <span>Sucursal más cercana</span>
        </div>
    )
}
function HdLogoPv({ brandName = 'Farmatotal', styles, blockProps }: CommonProps & { brandName?: string }) {
    return <span {...root(styles, blockProps)}>{brandName}</span>
}
function HdSearchPv({ styles, blockProps }: CommonProps) {
    return <div {...root(styles, blockProps)} />
}
function HdCategoriesPv({ styles, blockProps }: CommonProps) {
    return <span {...root(styles, blockProps)}>≡ Categorías ▾</span>
}
function HdAccountPv({ styles, blockProps }: CommonProps) {
    return <span {...root(styles, blockProps)}>Cuenta</span>
}
function HdCartPv({ styles, blockProps }: CommonProps) {
    return <span {...root(styles, blockProps)}>Carrito</span>
}
function HdSucursalPv({ styles, blockProps }: CommonProps) {
    return <span {...root(styles, blockProps)}>Sucursal: <b>elegir</b></span>
}

// ─────────────────────────── Cart (carrito funcional) ───────────────────────────
function CartPv({ styles, blockProps }: CommonProps) {
    return (
        <section {...root(styles, blockProps)}>
            <h2 className="mb-6 text-2xl font-bold text-gray-900">Carrito</h2>
            <div className="flex flex-col gap-8 lg:flex-row">
                <div className="flex-1">
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 border-b border-gray-100 pb-3 text-xs font-semibold uppercase text-gray-400">
                        <span>Producto</span><span className="text-right">Precio</span><span className="text-center">Cantidad</span><span className="text-right">Subtotal</span><span />
                    </div>
                    {[1, 2].map((i) => (
                        <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-4 border-b border-gray-100 py-5">
                            <div className="flex items-center gap-3"><div className="h-16 w-16 rounded-lg bg-gray-100" /><div className="h-3 w-32 rounded bg-gray-100" /></div>
                            <div className="ml-auto h-3 w-16 rounded bg-gray-100" /><div className="mx-auto h-8 w-24 rounded-full bg-gray-100" /><div className="ml-auto h-3 w-16 rounded bg-gray-100" /><div className="h-5 w-5 rounded-full bg-gray-100" />
                        </div>
                    ))}
                </div>
                <aside className="w-80 flex-none">
                    <div className="rounded-xl border border-gray-100 p-6">
                        <h3 className="mb-5 text-lg font-bold text-gray-900">Total del carrito</h3>
                        <div className="mb-4 h-px bg-gray-100" />
                        <div className="h-11 rounded-full bg-gray-900" />
                        <div className="mt-2 text-center text-xs text-gray-400">(carrito funcional — cantidades, cupón, totales)</div>
                    </div>
                </aside>
            </div>
        </section>
    )
}

// ─────────────────────────── Checkout (checkout funcional) ───────────────────────────
function CheckoutPv({ styles, blockProps }: CommonProps) {
    return (
        <section {...root(styles, blockProps)}>
            <h2 className="mb-6 text-2xl font-bold text-gray-900">Finalizar compra</h2>
            <div className="flex flex-col gap-8 lg:flex-row">
                <div className="flex flex-1 flex-col gap-6">
                    {['Datos de facturación', 'Entrega', 'Método de pago'].map((t) => (
                        <div key={t} className="rounded-xl border border-gray-100 p-6">
                            <h3 className="mb-4 text-lg font-bold text-gray-900">{t}</h3>
                            <div className="grid grid-cols-2 gap-4">{[1, 2, 3, 4].map((i) => <div key={i} className="h-11 rounded-md bg-gray-50" />)}</div>
                        </div>
                    ))}
                </div>
                <aside className="w-80 flex-none">
                    <div className="rounded-xl border border-gray-100 p-6">
                        <h3 className="mb-5 text-lg font-bold text-gray-900">Resumen del pedido</h3>
                        <div className="mb-4 h-20 rounded bg-gray-50" />
                        <div className="h-11 rounded-full bg-gray-900" />
                        <div className="mt-2 text-center text-xs text-gray-400">(checkout funcional — orden + pago Bancard)</div>
                    </div>
                </aside>
            </div>
        </section>
    )
}

// ─────────────────────────── ProductDetail (ficha de producto data-bound) ───────────────────────────
function ProductDetailPv({ showRelated = true, styles, blockProps }: CommonProps & { showRelated?: boolean }) {
    const products = useProducts({ perPage: 5, page: 1 })
    const p = products[0]
    const related = products.slice(1, 5)
    return (
        <section {...root(styles, blockProps)}>
            <div className="grid items-start gap-10 lg:grid-cols-2">
                <div className="flex aspect-square items-center justify-center rounded-2xl border border-gray-100 bg-gray-50">
                    {p && imgOf(p) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imgOf(p)} alt={p.title} className="max-h-full max-w-full object-contain" />
                    ) : (
                        <span className="text-sm text-gray-300">galería del producto</span>
                    )}
                </div>
                <div className="flex flex-col gap-3">
                    <h1 className="text-2xl font-bold text-gray-900">{p?.title || 'Nombre del producto'}</h1>
                    <div className="text-sm text-gray-400">SKU: —</div>
                    <div className="text-3xl font-bold text-gray-900">{p ? money(p.priceWeb) : '₲ 0'}</div>
                    <button className="mt-2 w-fit rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white">Agregar al carrito</button>
                    <div className="mt-4 text-xs text-gray-400">(galería · precio · variantes · stock por sucursal · add-to-cart — bloque funcional)</div>
                </div>
            </div>
            <div className="mt-10 border-t border-gray-100 pt-6">
                <div className="mb-4 flex gap-4 text-sm font-medium text-gray-500">
                    <span className="text-gray-900">Descripción</span><span>Información</span><span>Valoraciones</span>
                </div>
                <div className="h-16 rounded-lg bg-gray-50" />
            </div>
            {showRelated && (
                <div className="mt-10">
                    <h2 className="mb-4 text-xl font-bold text-gray-900">Productos relacionados</h2>
                    {related.length ? <Grid products={related} cols={4} /> : <div className="h-32 rounded-lg bg-gray-50" />}
                </div>
            )}
        </section>
    )
}

// ─────────────────────────── Catalog (página de catálogo data-bound) ───────────────────────────
function CatalogPv(props: any) {
    const { title, columns = 5, styles, blockProps } = props
    const products = useProducts({ ...buildProductParams(props), status: 'published' })
    return (
        <section {...root(styles, blockProps)}>
            <h2 className="mb-4 text-xl font-bold text-gray-900">{title || 'Catálogo'}</h2>
            {products.length ? (
                <Grid products={products} cols={columns} />
            ) : (
                <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">Catálogo (grilla paginada de todos los productos)</div>
            )}
            <div className="mt-6 flex items-center justify-center gap-2">
                {[1, 2, 3, 4].map((n) => (
                    <span key={n} className={`flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm ${n === 1 ? 'bg-gray-900 text-white' : 'border border-gray-200 text-gray-600'}`}>{n}</span>
                ))}
            </div>
        </section>
    )
}

// ─────────────────────────── Título (encabezado) ───────────────────────────
type TituloProps = CommonProps & { text?: string; level?: 'h2' | 'h3' | 'h4'; align?: 'left' | 'center' }

function Titulo({ text, level = 'h2', align = 'left', styles, blockProps }: TituloProps) {
    const Tag = (['h2', 'h3', 'h4'].includes(level || '') ? level : 'h2') as 'h2' | 'h3' | 'h4'
    const r = root(styles, blockProps)
    const alignCls = align === 'center' ? 'text-center' : ''
    return (
        <Tag {...r} className={[r.className, alignCls].filter(Boolean).join(' ')}>
            {text || 'Título de sección'}
        </Tag>
    )
}

// ─────────────────────────── Texto (cuerpo) ───────────────────────────
type TextoProps = CommonProps & { html?: string; align?: 'left' | 'center' }

function Texto({ html, align = 'left', styles, blockProps }: TextoProps) {
    const r = root(styles, blockProps)
    const alignCls = align === 'center' ? 'text-center' : ''
    return (
        <div
            {...r}
            className={[r.className, alignCls].filter(Boolean).join(' ')}
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

    // Widgets por query (Elementor-equivalentes): selección de categoría, marca y
    // productos sobre el catálogo real del backend.
    registerChaiBlockSettingWidget('categoryPicker', CategoryPicker as any)
    registerChaiBlockSettingWidget('brandPicker', BrandPicker as any)
    registerChaiBlockSettingWidget('productPicker', ProductPicker as any)

    // Colecciones data-bound para el bloque Repeater (tarjeta-template editable).
    registerChaiCollection('products', {
        name: 'Productos',
        filters: [{ id: 'category', name: 'Categoría' }],
        sort: [{ id: 'priceWeb', name: 'Precio' }],
        fetch: async ({ block }: any) => {
            const limit = block?.limit ?? 12
            const res = await fetchProducts({ perPage: limit, page: 1 })
            return { items: res, totalItems: res.length }
        },
    } as any)
    registerChaiCollection('categories', {
        name: 'Categorías',
        fetch: async () => {
            const res = await ApiService.fetchDataWithAxios<{ data: any[]; total: number }>({
                url: '/catalog/categories',
                method: 'get',
                params: { perPage: 2000 },
            })
            return { items: res.data || [], totalItems: res.total ?? (res.data?.length ?? 0) }
        },
    } as any)

    registerChaiBlock(Hero as any, {
        type: 'Hero',
        label: 'Hero / Banner',
        group: 'Comercio',
        description: 'Banner principal con título, subtítulo y CTA.',
        props: registerChaiBlockProps({
            properties: {
                styles: StylesProp('relative overflow-hidden rounded-2xl px-8 py-16 text-white'),
                title: { type: 'string', title: 'Título', default: 'Bienvenido a la tienda' },
                subtitle: { type: 'string', title: 'Subtítulo', default: '' },
                ctaLabel: { type: 'string', title: 'Texto del botón', default: 'Ver productos' },
                ctaHref: { type: 'string', title: 'Enlace del botón', default: '/productos' },
                image: { type: 'string', title: 'Imagen de fondo (URL)', default: '' },
                align: { type: 'string', title: 'Alineación', enum: ['left', 'center'], default: 'left' },
            },
        }) as any,
        i18nProps: ['title', 'subtitle', 'ctaLabel'],
    } as any)

    registerChaiBlock(ProductGrid as any, {
        type: 'ProductGrid',
        label: 'Grilla de productos',
        group: 'Comercio',
        description: 'Lista de productos del catálogo (filtrable por categoría).',
        props: registerChaiBlockProps({
            properties: {
                styles: StylesProp('py-6'),
                title: { type: 'string', title: 'Título', default: 'Destacados' },
                ...queryProps(),
            },
        }) as any,
        i18nProps: ['title'],
    } as any)

    registerChaiBlock(HomeDeals as any, {
        type: 'HomeDeals',
        label: 'Ofertas del día',
        group: 'Comercio',
        description: 'Productos en promoción (onPromo).',
        props: registerChaiBlockProps({
            properties: {
                styles: StylesProp(''),
                title: { type: 'string', title: 'Título', default: 'Ofertas' },
                limit: { type: 'number', title: 'Cantidad', default: 6 },
                columns: { type: 'number', title: 'Columnas', default: 6 },
            },
        }) as any,
        i18nProps: ['title'],
    } as any)

    registerChaiBlock(Banner as any, {
        type: 'Banner',
        label: 'Banner promocional',
        group: 'Comercio',
        description: 'Banner con imagen o degradado de marca, título, subtítulo y CTA.',
        props: registerChaiBlockProps({
            properties: {
                styles: StylesProp('relative overflow-hidden rounded-2xl px-8 py-12 text-white'),
                title: { type: 'string', title: 'Título', default: 'Banner promocional' },
                subtitle: { type: 'string', title: 'Subtítulo', default: '' },
                ctaLabel: { type: 'string', title: 'Texto del botón', default: '' },
                ctaHref: { type: 'string', title: 'Enlace del botón', default: '#' },
                image: { type: 'string', title: 'Imagen de fondo (URL)', default: '' },
                align: { type: 'string', title: 'Alineación', enum: ['left', 'center'], default: 'left' },
            },
        }) as any,
        i18nProps: ['title', 'subtitle', 'ctaLabel'],
    } as any)

    registerChaiBlock(CategoryShowcase as any, {
        type: 'CategoryShowcase',
        label: 'Vitrina de categorías',
        group: 'Comercio',
        description: 'Grilla de categorías del catálogo enlazadas.',
        props: registerChaiBlockProps({
            properties: {
                styles: StylesProp('py-6'),
                title: { type: 'string', title: 'Título', default: 'Categorías' },
                limit: { type: 'number', title: 'Cantidad', default: 8 },
            },
        }) as any,
        i18nProps: ['title'],
    } as any)

    registerChaiBlock(Brands as any, {
        type: 'Brands',
        label: 'Marcas',
        group: 'Comercio',
        description: 'Tira de logos de marcas (URLs separadas por coma, opcional).',
        props: registerChaiBlockProps({
            properties: {
                styles: StylesProp('py-6'),
                title: { type: 'string', title: 'Título', default: 'Marcas' },
                logos: { type: 'string', title: 'Logos (URLs separadas por coma)', default: '' },
            },
        }) as any,
        i18nProps: ['title'],
    } as any)

    registerChaiBlock(Benefits as any, {
        type: 'Benefits',
        label: 'Beneficios',
        group: 'Comercio',
        description: 'Fila de beneficios (envío, devoluciones, pago seguro, atención).',
        props: registerChaiBlockProps({
            properties: {
                styles: StylesProp('py-6'),
                title: { type: 'string', title: 'Título', default: '' },
            },
        }) as any,
        i18nProps: ['title'],
    } as any)

    registerChaiBlock(SliderBlock as any, {
        type: 'HeroSlider',
        label: 'Slider del home',
        group: 'Comercio',
        description: 'Carrusel principal con los banners del home (filtrados por día). Se editan en “Slider y banners”.',
        props: registerChaiBlockProps({
            properties: {
                styles: StylesProp(''),
                autoplayDelay: { type: 'number', title: 'Autoplay (ms, 0 = off)', default: 4000 },
                showArrows: { type: 'boolean', title: 'Mostrar flechas', default: true },
                showDots: { type: 'boolean', title: 'Mostrar puntos', default: true },
                loop: { type: 'boolean', title: 'Loop infinito', default: true },
                fade: { type: 'boolean', title: 'Transición fade', default: true },
            },
        }) as any,
    } as any)

    registerChaiBlock(CirclesBlock as any, {
        type: 'CategoryCircles',
        label: 'Círculos de categorías',
        group: 'Comercio',
        description: 'Categorías destacadas en círculos (setting home_categories).',
        props: registerChaiBlockProps({
            properties: {
                styles: StylesProp(''),
                title: { type: 'string', title: 'Título (opcional)', default: '' },
                limit: { type: 'number', title: 'Máx. categorías (0 = todas)', default: 0 },
            },
        }) as any,
        i18nProps: ['title'],
    } as any)

    registerChaiBlock(FeaturedBlock as any, {
        type: 'Featured',
        label: 'Selección para vos (destacados)',
        group: 'Comercio',
        description: 'Productos destacados (featured) en grilla.',
        props: registerChaiBlockProps({
            properties: {
                styles: StylesProp(''),
                title: { type: 'string', title: 'Título', default: 'Selección para vos' },
                limit: { type: 'number', title: 'Cantidad', default: 8 },
                columns: { type: 'number', title: 'Columnas', default: 4 },
            },
        }) as any,
        i18nProps: ['title'],
    } as any)

    registerChaiBlock(PromoBlock as any, {
        type: 'PromoBanner',
        label: 'Banner promocional (CMS)',
        group: 'Comercio',
        description: 'Banner promocional desde el setting promo_banners (por índice).',
        props: registerChaiBlockProps({
            properties: {
                styles: StylesProp(''),
                index: { type: 'number', title: 'Índice del banner', default: 0 },
            },
        }) as any,
    } as any)

    registerChaiBlock(SiteHeaderPv as any, {
        type: 'SiteHeader',
        label: 'Encabezado del sitio',
        group: 'Chrome',
        description: 'Header del sitio: barra superior, logo, menú de categorías, buscador, cuenta, carrito y sucursal. Bloque funcional.',
        props: registerChaiBlockProps({
            properties: {
                styles: StylesProp(''),
                showTopBar: { type: 'boolean', title: 'Mostrar barra superior', default: true },
            },
        }) as any,
    } as any)

    registerChaiBlock(SiteFooterPv as any, {
        type: 'SiteFooter',
        label: 'Pie del sitio',
        group: 'Chrome',
        description: 'Footer del sitio: columnas de enlaces, copyright y zona editable previa. Bloque funcional.',
        props: registerChaiBlockProps({
            properties: { styles: StylesProp('mt-6 border-t border-gray-100 px-6 py-8 text-sm text-gray-400') },
        }) as any,
    } as any)

    const chrome = (type: string, label: string, description: string, Pv: any, extra: Record<string, any> = {}, styleDefault = '') =>
        registerChaiBlock(Pv as any, {
            type,
            label,
            group: 'Header',
            description,
            props: registerChaiBlockProps({ properties: { styles: StylesProp(styleDefault), ...extra } }) as any,
        } as any)
    chrome('HeaderTopBar', 'Header · Barra superior', 'Barra de avisos/links + sucursal más cercana.', HdTopBarPv, {}, 'flex items-center justify-between bg-gray-50 px-4 py-1.5 text-[11px] text-gray-400')
    chrome('HeaderLogo', 'Header · Logo', 'Logo enlazado al inicio.', HdLogoPv, {
        logo: { type: 'string', title: 'Logo (URL)', default: '' },
        brandName: { type: 'string', title: 'Marca', default: 'Farmatotal' },
    }, 'text-xl font-bold text-white')
    chrome('HeaderSearch', 'Header · Buscador', 'Buscador de productos con sugerencias.', HdSearchPv, {}, 'h-10 w-full min-w-[200px] rounded-full bg-white/90')
    chrome('HeaderCategories', 'Header · Menú categorías', 'Botón Categorías + mega-menú.', HdCategoriesPv, {}, 'rounded-md bg-white/20 px-3 py-1.5 text-sm text-white')
    chrome('HeaderAccount', 'Header · Cuenta', 'Acceso a mi cuenta.', HdAccountPv, {}, 'rounded-full bg-white/20 px-3 py-1.5 text-xs text-white')
    chrome('HeaderCart', 'Header · Carrito', 'Botón de carrito con contador.', HdCartPv, {}, 'rounded-full bg-white/20 px-3 py-1.5 text-xs text-white')
    chrome('HeaderSucursal', 'Header · Sucursal', 'Selector de sucursal.', HdSucursalPv, {}, 'text-sm text-white')

    registerChaiBlock(CartPv as any, {
        type: 'Cart',
        label: 'Carrito',
        group: 'Comercio',
        description: 'Carrito funcional: ítems, cantidades, cupón y totales. Bloque funcional (como el widget de carrito de Woo).',
        props: registerChaiBlockProps({
            properties: {
                styles: StylesProp('py-8'),
                showCoupon: { type: 'boolean', title: 'Mostrar cupón de descuento', default: true },
            },
        }) as any,
    } as any)

    registerChaiBlock(CheckoutPv as any, {
        type: 'Checkout',
        label: 'Checkout',
        group: 'Comercio',
        description: 'Checkout funcional: facturación, entrega, pago y resumen. Crea la orden e inicia el pago (Bancard).',
        props: registerChaiBlockProps({ properties: { styles: StylesProp('py-8') } }) as any,
    } as any)

    registerChaiBlock(ProductDetailPv as any, {
        type: 'ProductDetail',
        label: 'Ficha de producto',
        group: 'Comercio',
        description: 'Ficha del producto consultado (galería, precio, variantes, add-to-cart, tabs, relacionados). Data-bound a la ruta.',
        props: registerChaiBlockProps({
            properties: {
                styles: StylesProp('py-8'),
                showTabs: { type: 'boolean', title: 'Mostrar pestañas (desc./valoraciones)', default: true },
                showRelated: { type: 'boolean', title: 'Mostrar relacionados', default: true },
                relatedTitle: { type: 'string', title: 'Título de relacionados', default: 'Productos relacionados' },
            },
        }) as any,
        i18nProps: ['relatedTitle'],
    } as any)

    registerChaiBlock(CatalogPv as any, {
        type: 'Catalog',
        label: 'Catálogo (grilla + paginación)',
        group: 'Comercio',
        description: 'Página de catálogo: grilla paginada de productos (lee ?page de la URL). Filtrable por categoría.',
        props: registerChaiBlockProps({
            properties: {
                styles: StylesProp('ft-container py-6'),
                title: { type: 'string', title: 'Título', default: 'Catálogo' },
                perPage: { type: 'number', title: 'Por página', default: 48 },
                columns: { type: 'number', title: 'Columnas (desktop)', default: 5 },
                ...filterProps(),
            },
        }) as any,
        i18nProps: ['title'],
    } as any)

    registerChaiBlock(Titulo as any, {
        type: 'Titulo',
        label: 'Título / Encabezado',
        group: 'Contenido',
        description: 'Encabezado de sección (h2/h3/h4).',
        props: registerChaiBlockProps({
            properties: {
                styles: StylesProp('mt-2 text-2xl font-bold text-brand-text'),
                text: { type: 'string', title: 'Texto', default: 'Título de sección' },
                level: { type: 'string', title: 'Nivel', enum: ['h2', 'h3', 'h4'], default: 'h2' },
                align: { type: 'string', title: 'Alineación', enum: ['left', 'center'], default: 'left' },
            },
        }) as any,
        i18nProps: ['text'],
    } as any)

    registerChaiBlock(Texto as any, {
        type: 'Texto',
        label: 'Texto / Párrafo',
        group: 'Contenido',
        description: 'Bloque de texto con formato (negrita, enlaces, saltos de línea).',
        props: registerChaiBlockProps({
            properties: {
                styles: StylesProp('text-[15px] leading-relaxed text-gray-600'),
                html: {
                    type: 'string',
                    title: 'Contenido',
                    default: 'Escribí aquí el contenido del párrafo…',
                    ui: { 'ui:widget': 'richtext' },
                },
                align: { type: 'string', title: 'Alineación', enum: ['left', 'center'], default: 'left' },
            },
        }) as any,
        i18nProps: ['html'],
    } as any)
    /* eslint-enable @typescript-eslint/no-explicit-any */
}
