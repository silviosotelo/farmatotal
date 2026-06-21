import ApiService from './ApiService'

export type CheckoutFieldType = 'text' | 'textarea' | 'select'
export type CheckoutField = {
    key: string
    label: string
    type: CheckoutFieldType
    required: boolean
    width: 'full' | 'half'
    options?: string[]
}
export type CheckoutFieldsConfig = { fields: CheckoutField[] }

const KEY = '/cms/settings/mod_checkout'

/** Lee los campos custom del checkout (settings mod_checkout). Si no existe, vacío. */
export async function apiGetCheckoutFields(): Promise<CheckoutFieldsConfig> {
    try {
        const res = await ApiService.fetchDataWithAxios<{ key: string; value: CheckoutFieldsConfig }>({
            url: KEY,
            method: 'get',
        })
        const fields = Array.isArray(res?.value?.fields) ? res.value.fields : []
        return { fields }
    } catch {
        return { fields: [] }
    }
}

export async function apiSaveCheckoutFields(cfg: CheckoutFieldsConfig) {
    return ApiService.fetchDataWithAxios<{ ok: boolean }>({
        url: KEY,
        method: 'put',
        data: { value: cfg },
    })
}
