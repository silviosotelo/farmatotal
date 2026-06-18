import ApiService from './ApiService'

export type ShippingMethod = {
    id: string
    name: string
    type: 'flat' | 'free' | 'pickup' | 'weight'
    cost: number
    freeFrom: number
    perKg: number
    active: boolean
}
export type ShippingZone = {
    id: string
    name: string
    cities: string[]
    methods: ShippingMethod[]
}
export type ShippingConfig = { zones: ShippingZone[] }

export const apiGetShippingConfig = () =>
    ApiService.fetchDataWithAxios<ShippingConfig>({ url: '/shipping/config', method: 'get' })

export const apiSaveShippingConfig = (data: ShippingConfig) =>
    ApiService.fetchDataWithAxios<{ ok: boolean }>({ url: '/shipping/config', method: 'put', data })
