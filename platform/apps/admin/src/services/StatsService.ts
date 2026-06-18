import ApiService from './ApiService'

export type OverviewStats = {
    products: { total: number; published: number; outOfStock: number }
    categories: number
    branches: number
    coupons: number
    orders: { total: number; pending: number; paid: number; revenue: number }
    topCategories: { name: string; count: number }[]
}

export async function apiGetOverview(): Promise<OverviewStats> {
    // Motor real (platform/apps/api) — antes apuntaba al proxy EverShop (archivado).
    return ApiService.fetchDataWithAxios<OverviewStats>({
        url: '/stats/overview',
        method: 'get',
    })
}
