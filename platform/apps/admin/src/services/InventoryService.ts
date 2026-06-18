import ApiService from './ApiService'

export type InventoryRow = {
    branchId: string
    branchName: string
    branchCode: string
    stock: number
    reserved: number
}

export type ProductLite = {
    id: string
    name: string
    productCode: string
    img: string
    stock: number
}

type BackendProduct = {
    id: string
    title: string
    sku: string
    stockCached: number
    images?: { url: string; isPrimary?: boolean }[]
}

export async function apiSearchProducts(q: string) {
    const res = await ApiService.fetchDataWithAxios<{
        data: BackendProduct[]
        total: number
    }>({
        url: '/catalog/products',
        method: 'get',
        params: { q, perPage: 20, page: 1 },
    })
    return res.data.map((p) => ({
        id: p.id,
        name: p.title,
        productCode: p.sku,
        img: p.images?.[0]?.url ?? '',
        stock: p.stockCached,
    })) as ProductLite[]
}

export async function apiGetProductInventory(productId: string) {
    const res = await ApiService.fetchDataWithAxios<{ data: InventoryRow[] }>({
        url: `/inventory/product/${productId}`,
        method: 'get',
    })
    return res.data
}

export async function apiSetInventory(
    productId: string,
    branchId: string,
    stock: number,
) {
    return ApiService.fetchDataWithAxios<{ ok: boolean; stockCached: number }>({
        url: '/inventory',
        method: 'put',
        data: { productId, branchId, stock },
    })
}

export async function apiImportInventory(
    rows: { sku: string; branchCode: string; stock: number }[],
) {
    return ApiService.fetchDataWithAxios<{ ok: number; failed: number; errors: string[] }>({
        url: '/inventory/import',
        method: 'post',
        data: { rows },
    })
}

/** URL del export CSV (GET abierto). */
export const inventoryExportUrl = () => {
    const base =
        (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ||
        'http://localhost:4000'
    return `${base}/inventory/export`
}
