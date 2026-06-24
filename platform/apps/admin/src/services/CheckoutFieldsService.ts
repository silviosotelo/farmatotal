import ApiService from './ApiService'

export type CheckoutFieldType = 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'city' | 'department' | 'location'
/** A qué dato del pedido mapea el campo. '' / undefined = campo personalizado (va a customFields). */
export type CheckoutFieldRole =
    | 'name' // nombre completo -> customerName
    | 'firstName'
    | 'lastName'
    | 'email'
    | 'phone'
    | 'city'
    | 'address'
    | ''
export type CheckoutField = {
    key: string
    label: string
    type: CheckoutFieldType
    required: boolean
    width: 'full' | 'half'
    enabled?: boolean
    role?: CheckoutFieldRole
    options?: string[]
}

export const FIELD_ROLES: { value: CheckoutFieldRole; label: string }[] = [
    { value: '', label: 'Personalizado' },
    { value: 'name', label: 'Nombre completo' },
    { value: 'firstName', label: 'Nombre' },
    { value: 'lastName', label: 'Apellido' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Teléfono' },
    { value: 'city', label: 'Ciudad' },
    { value: 'address', label: 'Dirección' },
]

/** Config por defecto = TODOS los campos del checkout, totalmente editables. */
export const DEFAULT_CHECKOUT_FIELDS: CheckoutField[] = [
    { key: 'firstName', label: 'Nombre', type: 'text', width: 'half', required: true, enabled: true, role: 'firstName' },
    { key: 'lastName', label: 'Apellido', type: 'text', width: 'half', required: false, enabled: true, role: 'lastName' },
    { key: 'email', label: 'Email', type: 'email', width: 'half', required: true, enabled: true, role: 'email' },
    { key: 'phone', label: 'Teléfono', type: 'tel', width: 'half', required: false, enabled: true, role: 'phone' },
    { key: 'department', label: 'Departamento', type: 'department', width: 'half', required: false, enabled: true },
    { key: 'city', label: 'Ciudad', type: 'city', width: 'half', required: false, enabled: true, role: 'city' },
    { key: 'address', label: 'Dirección', type: 'text', width: 'full', required: false, enabled: true, role: 'address' },
    { key: 'location', label: 'Ubicación exacta de entrega', type: 'location', width: 'full', required: false, enabled: true },
]
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
