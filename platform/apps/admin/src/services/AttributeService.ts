import ApiService from './ApiService'

export type GlobalAttribute = { id: string; name: string; values: string[] }
export type AttributesConfig = { attributes: GlobalAttribute[] }

export async function apiGetAttributes() {
    return ApiService.fetchDataWithAxios<AttributesConfig>({ url: '/attributes', method: 'get' })
}

export async function apiSaveAttributes(cfg: AttributesConfig) {
    return ApiService.fetchDataWithAxios<{ ok: boolean }>({
        url: '/attributes',
        method: 'put',
        data: cfg,
    })
}
