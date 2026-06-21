import ApiService from './ApiService'
import { getTenantCurrency, toMajor, toMinor } from './currency'

/** Shape de TableQueries de Ecme: pageIndex 1-based, pageSize, sort. */
type EcmeQueries = Record<string, unknown> & {
    pageIndex?: number
    pageSize?: number
    sort?: { key?: string; order?: 'asc' | 'desc' | '' }
    query?: string
}

type BackendProduct = {
    id: string
    sku: string
    codInterno: string | null
    slug: string
    title: string
    description: string | null
    brandId: string | null
    categoryId: string | null
    priceNormal: number
    priceWeb: number
    onPromo: boolean
    promoCode: string | null
    controlled: boolean
    featured: boolean
    status: 'draft' | 'published' | 'archived'
    stockCached: number
    unit?: string
    unitStep?: number
    productType?: 'physical' | 'digital' | 'service'
    attributes?: { label: string; value: string }[] | null
    images?: { url: string; isPrimary?: boolean }[]
}

type BackendList<T> = {
    data: T[]
    page: number
    perPage: number
    total: number
    totalPages: number
}

function mapSort(sort?: { key?: string; order?: 'asc' | 'desc' | '' }): string {
    if (!sort?.key || !sort.order) return 'createdAt:desc'
    const k =
        sort.key === 'name'
            ? 'title'
            : sort.key === 'price'
              ? 'priceWeb'
              : sort.key === 'createdAt'
                ? 'createdAt'
                : 'createdAt'
    const o = sort.order === 'asc' ? 'asc' : 'desc'
    return `${k}:${o}`
}

function adaptProduct(p: BackendProduct) {
    const primary =
        p.images?.find((i) => i.isPrimary)?.url || p.images?.[0]?.url || ''
    return {
        id: p.id,
        name: p.title,
        productCode: p.sku,
        img: primary,
        category: p.categoryId || '',
        price: p.priceWeb,
        stock: p.stockCached,
        status: p.status === 'published' ? 1 : p.status === 'archived' ? 2 : 0,
        sales: 0,
        salesPercentage: 0,
    }
}

export async function apiGetProductList<T, U extends Record<string, unknown>>(
    params: U,
) {
    const q = params as EcmeQueries
    const remote: Record<string, unknown> = {
        page: q.pageIndex ?? 1,
        perPage: q.pageSize ?? 20,
        sort: mapSort(q.sort),
    }
    if (q.query && String(q.query).trim().length > 0) remote.q = q.query
    const status = (q as Record<string, unknown>).productStatus
    if (status) remote.status = String(status).toLowerCase()

    const res = await ApiService.fetchDataWithAxios<BackendList<BackendProduct>>({
        url: '/catalog/products',
        method: 'get',
        params: remote,
    })
    return {
        list: res.data.map(adaptProduct),
        total: res.total,
    } as T
}

export async function apiGetProduct<T, U extends Record<string, unknown>>({
    id,
    ...params
}: U) {
    const res = await ApiService.fetchDataWithAxios<BackendProduct>({
        url: `/catalog/products/${id}`,
        method: 'get',
        params,
    })
    // Los precios llegan en unidad MENOR (entero). Para mostrarlos en el form
    // se convierten a unidad MAYOR según los decimales de la moneda del tenant.
    // Para PYG (0 decimales) la conversión es identidad.
    const currency = await getTenantCurrency()
    // Shape para ProductForm (no el de lista).
    const form = {
        id: res.id,
        name: res.title,
        productCode: res.sku,
        description: res.description ?? '',
        price: toMajor(res.priceWeb, currency),
        taxRate: 10,
        costPerItem: 0,
        bulkDiscountPrice: 0,
        category: res.categoryId ?? '',
        brand: '',
        tags: [],
        imgList: (res.images ?? []).map((im, i) => ({
            id: String(i),
            name: `img-${i}`,
            img: im.url,
        })),
        // Campos adicionales del catálogo
        codInterno: res.codInterno ?? '',
        priceNormal: toMajor(res.priceNormal, currency),
        status: res.status,
        controlled: res.controlled,
        featured: res.featured,
        onPromo: res.onPromo,
        promoCode: res.promoCode ?? '',
        unit: res.unit ?? 'unidad',
        unitStep: res.unitStep ?? 1,
        productType: res.productType ?? 'physical',
        attributes: res.attributes ?? [],
    }
    return form as unknown as T
}

// ---- Escritura ----
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function slugify(s: string): string {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 240)
}

type ProductFormValues = {
    name: string
    productCode: string
    description?: string
    price: number | string
    category?: string
    codInterno?: string
    priceNormal?: number | string
    status?: 'draft' | 'published' | 'archived'
    controlled?: boolean
    featured?: boolean
    onPromo?: boolean
    promoCode?: string
    unit?: string
    unitStep?: number | string
    productType?: 'physical' | 'digital' | 'service'
    attributes?: { label: string; value: string }[]
    [k: string]: unknown
}

function toBackendInput(v: ProductFormValues, currency: string) {
    // Resolver ambos valores en unidad MAYOR primero (lo que tipeó el admin),
    // y recién después convertir cada uno a unidad MENOR exactamente UNA vez.
    // Así el fallback de priceNormal nunca produce doble conversión.
    const priceWebMajor = Number(v.price) || 0
    // priceNormal: si no se especifica, igual al web (sin descuento tachado).
    const priceNormalMajor =
        v.priceNormal !== undefined && v.priceNormal !== ''
            ? Number(v.priceNormal) || 0
            : priceWebMajor
    const priceWeb = toMinor(priceWebMajor, currency)
    const priceNormal = toMinor(priceNormalMajor, currency)
    const input: Record<string, unknown> = {
        sku: v.productCode,
        slug: slugify(v.name) || v.productCode,
        title: v.name,
        description: v.description ?? null,
        priceNormal,
        priceWeb,
        status: v.status ?? 'published',
        controlled: !!v.controlled,
        featured: !!v.featured,
        onPromo: !!v.onPromo,
        codInterno: v.codInterno?.trim() ? v.codInterno.trim() : null,
        promoCode: v.promoCode?.trim() ? v.promoCode.trim() : null,
    }
    if (v.category && UUID_RE.test(v.category)) input.categoryId = v.category
    // Unidad de medida (backend: unit max 20, unitStep positive). Sólo se
    // envían valores válidos; vacío => default del backend (unidad / 1).
    const unit = v.unit?.trim()
    if (unit) input.unit = unit.slice(0, 20)
    const unitStep = Number(v.unitStep)
    if (Number.isFinite(unitStep) && unitStep > 0) input.unitStep = unitStep
    // Tipo de producto: siempre se envía (default physical).
    input.productType = v.productType ?? 'physical'
    // Ficha técnica: se descartan filas sin etiqueta; array vacío => null.
    const attrs = Array.isArray(v.attributes)
        ? v.attributes
              .map((a) => ({
                  label: (a?.label ?? '').trim(),
                  value: (a?.value ?? '').trim(),
              }))
              .filter((a) => a.label !== '')
        : []
    input.attributes = attrs.length > 0 ? attrs : null
    return input
}

export async function apiCreateProduct(values: ProductFormValues) {
    const currency = await getTenantCurrency()
    return ApiService.fetchDataWithAxios({
        url: '/catalog/products',
        method: 'post',
        data: toBackendInput(values, currency),
    })
}

export async function apiUpdateProduct(id: string, values: ProductFormValues) {
    const currency = await getTenantCurrency()
    return ApiService.fetchDataWithAxios({
        url: `/catalog/products/${id}`,
        method: 'patch',
        data: toBackendInput(values, currency),
    })
}

export async function apiDeleteProduct(id: string) {
    return ApiService.fetchDataWithAxios({
        url: `/catalog/products/${id}`,
        method: 'delete',
    })
}
