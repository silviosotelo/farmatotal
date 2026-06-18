import ApiService from './ApiService'

export type TaxRate = { id: string; name: string; percent: number; isDefault: boolean }
export type TaxConfig = { pricesIncludeTax: boolean; rates: TaxRate[] }

export async function apiGetTaxConfig() {
    return ApiService.fetchDataWithAxios<TaxConfig>({ url: '/tax/config', method: 'get' })
}

export async function apiSaveTaxConfig(cfg: TaxConfig) {
    return ApiService.fetchDataWithAxios<{ ok: boolean }>({
        url: '/tax/config',
        method: 'put',
        data: cfg,
    })
}
