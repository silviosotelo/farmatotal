import ApiService from './ApiService'

export type Coupon = {
    id: string
    code: string
    type: 'percent' | 'fixed'
    value: number
    minSubtotal: number
    maxUses: number | null
    usedCount: number
    active: boolean
}

export async function apiGetCoupons() {
    return ApiService.fetchDataWithAxios<{ data: Coupon[]; total: number }>({
        url: '/coupons',
        method: 'get',
    })
}

export async function apiCreateCoupon(data: Partial<Coupon>) {
    return ApiService.fetchDataWithAxios<Coupon>({
        url: '/coupons',
        method: 'post',
        data,
    })
}

export async function apiUpdateCoupon(id: string, data: Partial<Coupon>) {
    return ApiService.fetchDataWithAxios<Coupon>({
        url: `/coupons/${id}`,
        method: 'patch',
        data,
    })
}
