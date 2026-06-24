import ApiService from './ApiService'

/**
 * Campos personalizados/configurables por entidad (productos, categorías, sucursales),
 * mismo patrón que los campos del checkout. La config vive en settings (`mod_*_fields`).
 * Los campos `builtin` mapean a columnas nativas (solo se togglea enabled/required/label/orden);
 * los demás son custom → se guardan en la columna `custom` jsonb de la entidad.
 */
export type EntityFieldType =
    | 'text'
    | 'number'
    | 'email'
    | 'tel'
    | 'textarea'
    | 'select'
    | 'boolean'
    | 'date'

export type EntityField = {
    key: string
    label: string
    type: EntityFieldType
    required: boolean
    width: 'full' | 'half'
    enabled?: boolean
    /** true = campo nativo de la entidad (no se puede borrar ni cambiar key/tipo). */
    builtin?: boolean
    options?: string[]
}

export type EntityFieldsConfig = { fields: EntityField[] }

export async function apiGetEntityFields(settingsKey: string): Promise<EntityFieldsConfig> {
    try {
        const res = await ApiService.fetchDataWithAxios<{ key: string; value: EntityFieldsConfig }>({
            url: `/cms/settings/${settingsKey}`,
            method: 'get',
        })
        const fields = Array.isArray(res?.value?.fields) ? res.value.fields : []
        return { fields }
    } catch {
        return { fields: [] }
    }
}

export async function apiSaveEntityFields(settingsKey: string, cfg: EntityFieldsConfig) {
    return ApiService.fetchDataWithAxios<{ ok: boolean }>({
        url: `/cms/settings/${settingsKey}`,
        method: 'put',
        data: { value: cfg },
    })
}

/** Campos nativos por defecto (builtin) por entidad — editables solo en enabled/required/label/orden. */
export const DEFAULT_PRODUCT_FIELDS: EntityField[] = [
    { key: 'sku', label: 'SKU', type: 'text', width: 'half', required: true, enabled: true, builtin: true },
    { key: 'codInterno', label: 'Código interno (ERP)', type: 'text', width: 'half', required: false, enabled: true, builtin: true },
    { key: 'barcode', label: 'Código de barras', type: 'text', width: 'half', required: false, enabled: true, builtin: true },
    { key: 'controlled', label: 'Controlado', type: 'boolean', width: 'half', required: false, enabled: true, builtin: true },
]

export const DEFAULT_CATEGORY_FIELDS: EntityField[] = [
    { key: 'fliaCodigo', label: 'Código de familia (ERP)', type: 'text', width: 'half', required: false, enabled: true, builtin: true },
    { key: 'icon', label: 'Ícono', type: 'text', width: 'half', required: false, enabled: true, builtin: true },
]

export const DEFAULT_BRANCH_FIELDS: EntityField[] = [
    { key: 'erpCode', label: 'Código de sucursal (ERP)', type: 'text', width: 'half', required: false, enabled: true, builtin: true },
    { key: 'phone', label: 'Teléfono', type: 'tel', width: 'half', required: false, enabled: true, builtin: true },
]
