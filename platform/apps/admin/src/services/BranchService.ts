import ApiService from './ApiService'

export type Branch = {
    id: string
    code: string
    erpCode: string | null
    name: string
    address: string | null
    city: string | null
    phone: string | null
    lat: number | null
    lng: number | null
    pickupEnabled: boolean
    deliveryEnabled: boolean
    active: boolean
    custom?: Record<string, unknown> | null
}

export async function apiGetBranches() {
    return ApiService.fetchDataWithAxios<{ data: Branch[]; total: number }>({
        url: '/branches',
        method: 'get',
    })
}

export async function apiCreateBranch(data: Partial<Branch>) {
    return ApiService.fetchDataWithAxios<Branch>({
        url: '/branches',
        method: 'post',
        data,
    })
}

export async function apiUpdateBranch(id: string, data: Partial<Branch>) {
    return ApiService.fetchDataWithAxios<Branch>({
        url: `/branches/${id}`,
        method: 'patch',
        data,
    })
}
