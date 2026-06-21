import useSWR from 'swr'
import ApiService from './ApiService'

/**
 * Conversión de precios entre la unidad MENOR (entero almacenado en el backend)
 * y la unidad MAYOR (lo que el admin tipea/ve). La cantidad de decimales sale
 * de la moneda del tenant (ISO 4217). Para monedas de 0 decimales (ej. PYG) la
 * conversión es identidad: el entero ES el valor.
 *
 * White-label: la moneda NO está hardcodeada; viene de `config.currency` del
 * tenant. Default "PYG" si no está configurada.
 */

export const DEFAULT_CURRENCY = 'PYG'

/** Decimales de la moneda según Intl (ej. PYG=0, USD=2). */
export function currencyDecimals(currency: string): number {
    try {
        return (
            new Intl.NumberFormat('en', {
                style: 'currency',
                currency,
            }).resolvedOptions().maximumFractionDigits ?? 2
        )
    } catch {
        return 2
    }
}

/** Mayor → menor (lo que tipea el admin → entero del backend). */
export function toMinor(major: number, currency: string): number {
    const dec = currencyDecimals(currency)
    return Math.round((Number(major) || 0) * 10 ** dec)
}

/** Menor → mayor (entero del backend → lo que se muestra en el input). */
export function toMajor(minor: number, currency: string): number {
    const dec = currencyDecimals(currency)
    return (Number(minor) || 0) / 10 ** dec
}

type TenantResponse = {
    id: string
    slug: string
    config?: {
        currency?: string
        productTypes?: unknown
    } & Record<string, unknown>
}

let tenantCurrencyPromise: Promise<string> | null = null

/** Moneda del tenant (cacheada por sesión). Hace `GET /tenant` una sola vez. */
export function getTenantCurrency(): Promise<string> {
    if (!tenantCurrencyPromise) {
        tenantCurrencyPromise = ApiService.fetchDataWithAxios<TenantResponse>({
            url: '/tenant',
            method: 'get',
        })
            .then((res) => res.config?.currency || DEFAULT_CURRENCY)
            .catch(() => {
                // Si falla, no cachear el fallo: permitir reintento posterior.
                tenantCurrencyPromise = null
                return DEFAULT_CURRENCY
            })
    }
    return tenantCurrencyPromise
}

/** Hook para los inputs del form: moneda + decimales del tenant. */
export function useTenantCurrency(): { currency: string; decimals: number } {
    const { data } = useSWR('/tenant/currency', () => getTenantCurrency(), {
        revalidateOnFocus: false,
        revalidateIfStale: false,
    })
    const currency = data || DEFAULT_CURRENCY
    return { currency, decimals: currencyDecimals(currency) }
}

/**
 * Tipos de producto soportados (white-label). El tenant habilita un subconjunto
 * vía `config.productTypes`. Si no configura nada, sólo aplica "physical".
 */
export const PRODUCT_TYPE_VALUES = ['physical', 'digital', 'service'] as const
export type ProductType = (typeof PRODUCT_TYPE_VALUES)[number]
export const DEFAULT_PRODUCT_TYPE: ProductType = 'physical'

const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
    physical: 'Físico',
    digital: 'Digital',
    service: 'Servicio',
}

/** Etiqueta legible para un tipo de producto (fallback al valor crudo). */
export function productTypeLabel(value: string): string {
    return PRODUCT_TYPE_LABELS[value as ProductType] ?? value
}

let tenantProductTypesPromise: Promise<ProductType[]> | null = null

/**
 * Tipos de producto habilitados por el tenant (cacheado por sesión). Hace
 * `GET /tenant` una sola vez. Acepta `config.productTypes` como `string[]`;
 * filtra a valores conocidos. Si no hay nada válido, devuelve [].
 */
export function getTenantProductTypes(): Promise<ProductType[]> {
    if (!tenantProductTypesPromise) {
        tenantProductTypesPromise = ApiService.fetchDataWithAxios<TenantResponse>(
            {
                url: '/tenant',
                method: 'get',
            },
        )
            .then((res) => {
                const raw = res.config?.productTypes
                if (!Array.isArray(raw)) return []
                const seen = new Set<string>()
                const types: ProductType[] = []
                for (const item of raw) {
                    const v = typeof item === 'string' ? item : undefined
                    if (
                        v &&
                        !seen.has(v) &&
                        (PRODUCT_TYPE_VALUES as readonly string[]).includes(v)
                    ) {
                        seen.add(v)
                        types.push(v as ProductType)
                    }
                }
                return types
            })
            .catch(() => {
                // No cachear el fallo: permitir reintento posterior.
                tenantProductTypesPromise = null
                return []
            })
    }
    return tenantProductTypesPromise
}

/**
 * Hook para el selector de tipo de producto. `enabled` es true sólo cuando el
 * tenant expone más de una opción; si expone <=1 (o nada), el selector se oculta
 * y el producto queda como "physical".
 */
export function useTenantProductTypes(): {
    options: { value: ProductType; label: string }[]
    enabled: boolean
} {
    const { data } = useSWR(
        '/tenant/productTypes',
        () => getTenantProductTypes(),
        {
            revalidateOnFocus: false,
            revalidateIfStale: false,
        },
    )
    const types = data ?? []
    return {
        options: types.map((value) => ({
            value,
            label: productTypeLabel(value),
        })),
        enabled: types.length > 1,
    }
}
