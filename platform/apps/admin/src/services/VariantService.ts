import ApiService from './ApiService'

export type Variant = {
    id: string
    productId: string
    sku: string
    title: string
    attributes: Record<string, string> | null
    priceNormal: number
    priceWeb: number
    stockCached: number
    imageUrl: string | null
    position: number
    active: boolean
}

export type ProductPick = { id: string; title: string; sku: string }

/** Búsqueda liviana de productos para el selector de variantes. */
export async function apiSearchProductsForVariants(q: string) {
    const res = await ApiService.fetchDataWithAxios<{
        data: { id: string; title: string; sku: string }[]
        total: number
    }>({
        url: '/catalog/products',
        method: 'get',
        params: { q, perPage: 10, page: 1 },
    })
    return res.data.map((p) => ({ id: p.id, title: p.title, sku: p.sku })) as ProductPick[]
}

export async function apiGetVariants(productId: string) {
    return ApiService.fetchDataWithAxios<{ data: Variant[]; total: number }>({
        url: `/catalog/products/${productId}/variants`,
        method: 'get',
        params: { all: true },
    })
}

export async function apiCreateVariant(data: Partial<Variant> & { productId: string }) {
    return ApiService.fetchDataWithAxios<Variant>({
        url: '/catalog/variants',
        method: 'post',
        data,
    })
}

export async function apiUpdateVariant(id: string, data: Partial<Variant>) {
    return ApiService.fetchDataWithAxios<Variant>({
        url: `/catalog/variants/${id}`,
        method: 'patch',
        data,
    })
}

export async function apiDeleteVariant(id: string) {
    return ApiService.fetchDataWithAxios<{ ok: boolean }>({
        url: `/catalog/variants/${id}`,
        method: 'delete',
    })
}
