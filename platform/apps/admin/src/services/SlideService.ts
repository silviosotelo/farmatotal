import ApiService from './ApiService'

export type Slide = {
    id: string
    title: string
    imageDesktop: string | null
    imageMobile: string | null
    linkHref: string | null
    days: number[]
    position: number
    active: boolean
    dateFrom: string | null
    dateTo: string | null
}

export const DAYS = [
    { value: 0, label: 'Dom' },
    { value: 1, label: 'Lun' },
    { value: 2, label: 'Mar' },
    { value: 3, label: 'Mié' },
    { value: 4, label: 'Jue' },
    { value: 5, label: 'Vie' },
    { value: 6, label: 'Sáb' },
]

export async function apiGetSlides() {
    return ApiService.fetchDataWithAxios<{ data: Slide[]; total: number }>({
        url: '/slides',
        method: 'get',
    })
}

export async function apiCreateSlide(data: Partial<Slide>) {
    return ApiService.fetchDataWithAxios<Slide>({
        url: '/slides',
        method: 'post',
        data,
    })
}

export async function apiUpdateSlide(id: string, data: Partial<Slide>) {
    return ApiService.fetchDataWithAxios<Slide>({
        url: `/slides/${id}`,
        method: 'patch',
        data,
    })
}

export async function apiDeleteSlide(id: string) {
    return ApiService.fetchDataWithAxios({
        url: `/slides/${id}`,
        method: 'delete',
    })
}
