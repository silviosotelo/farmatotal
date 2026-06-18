import ApiService from './ApiService'

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
    // Shape para ProductForm (no el de lista).
    const form = {
        id: res.id,
        name: res.title,
        productCode: res.sku,
        description: res.description ?? '',
        price: res.priceWeb,
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
        priceNormal: res.priceNormal,
        status: res.status,
        controlled: res.controlled,
        featured: res.featured,
        onPromo: res.onPromo,
        promoCode: res.promoCode ?? '',
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
    [k: string]: unknown
}

function toBackendInput(v: ProductFormValues) {
    const priceWeb = Number(v.price) || 0
    // priceNormal: si no se especifica, igual al web (sin descuento tachado).
    const priceNormal =
        v.priceNormal !== undefined && v.priceNormal !== ''
            ? Number(v.priceNormal) || 0
            : priceWeb
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
    return input
}

export async function apiCreateProduct(values: ProductFormValues) {
    return ApiService.fetchDataWithAxios({
        url: '/catalog/products',
        method: 'post',
        data: toBackendInput(values),
    })
}

export async function apiUpdateProduct(id: string, values: ProductFormValues) {
    return ApiService.fetchDataWithAxios({
        url: `/catalog/products/${id}`,
        method: 'patch',
        data: toBackendInput(values),
    })
}

export async function apiDeleteProduct(id: string) {
    return ApiService.fetchDataWithAxios({
        url: `/catalog/products/${id}`,
        method: 'delete',
    })
}
