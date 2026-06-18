import ApiService from './ApiService'

export type SalesReport = {
    range: { from: string; to: string }
    kpis: {
        revenue: number
        orders: number
        allOrders: number
        avgOrderValue: number
        unitsSold: number
    }
    series: { day: string; revenue: number; orders: number }[]
    byStatus: { status: string; count: number; revenue: number }[]
    byPayment: { method: string; count: number; revenue: number }[]
    topProducts: { sku: string; title: string; units: number; revenue: number }[]
}

export async function apiGetSalesReport(from?: string, to?: string) {
    return ApiService.fetchDataWithAxios<SalesReport>({
        url: '/stats/reports',
        method: 'get',
        params: { from, to },
    })
}
