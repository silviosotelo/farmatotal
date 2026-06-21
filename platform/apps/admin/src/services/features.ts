import { useMemo } from 'react'
import useSWR from 'swr'
import ApiService from './ApiService'
import navigationConfig from '@/configs/navigation.config'
import type { NavigationTree } from '@/@types/navigation'

/**
 * Feature-flags del tenant (white-label). El admin habilita/oculta módulos
 * vía `config.*` del tenant. Defaults permisivos: sin config = todo visible
 * (branches/inventory/variants en true). `units` arranca en false.
 *
 * Mismo patrón cacheado-por-sesión que `services/currency.ts`: una sola
 * llamada a `GET /tenant` (axios manda `x-tenant`), promesa memorizada y
 * hook SWR para consumirlo en componentes.
 */

export type TenantFlags = {
    branches: boolean
    inventory: boolean
    variants: boolean
    units: boolean
}

export const DEFAULT_TENANT_FLAGS: TenantFlags = {
    branches: true,
    inventory: true,
    variants: true,
    units: false,
}

type TenantResponse = {
    id: string
    slug: string
    config?: {
        branches?: boolean
        inventory?: boolean
        variants?: boolean
        units?: boolean
    } & Record<string, unknown>
}

/** Lee un booleano del config; si no viene (undefined/no-bool) usa el default. */
function readBool(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback
}

let tenantFlagsPromise: Promise<TenantFlags> | null = null

/** Flags del tenant (cacheados por sesión). Hace `GET /tenant` una sola vez. */
export function getTenantFlags(): Promise<TenantFlags> {
    if (!tenantFlagsPromise) {
        tenantFlagsPromise = ApiService.fetchDataWithAxios<TenantResponse>({
            url: '/tenant',
            method: 'get',
        })
            .then((res) => {
                const c = res.config ?? {}
                return {
                    branches: readBool(
                        c.branches,
                        DEFAULT_TENANT_FLAGS.branches,
                    ),
                    inventory: readBool(
                        c.inventory,
                        DEFAULT_TENANT_FLAGS.inventory,
                    ),
                    variants: readBool(
                        c.variants,
                        DEFAULT_TENANT_FLAGS.variants,
                    ),
                    units: readBool(c.units, DEFAULT_TENANT_FLAGS.units),
                }
            })
            .catch(() => {
                // No cachear el fallo: permitir reintento posterior.
                tenantFlagsPromise = null
                return DEFAULT_TENANT_FLAGS
            })
    }
    return tenantFlagsPromise
}

/**
 * Hook para leer los flags del tenant. Mientras carga (o si falla) devuelve
 * los defaults permisivos, por lo que el comportamiento por defecto es
 * "todo visible" (idéntico al actual).
 */
export function useTenantFlags(): TenantFlags {
    const { data } = useSWR('/tenant/flags', () => getTenantFlags(), {
        revalidateOnFocus: false,
        revalidateIfStale: false,
    })
    return data ?? DEFAULT_TENANT_FLAGS
}

/**
 * Mapa key-de-nav → flag que la gobierna. Si un ítem no está acá, no se
 * gatea (siempre visible). Sólo se ocultan Sucursales e Inventario.
 */
const NAV_KEY_TO_FLAG: Record<string, keyof TenantFlags> = {
    'shop.branches': 'branches',
    'shop.inventory': 'inventory',
}

/** Filtra recursivamente el árbol de nav según los flags (default: mostrar). */
function filterNavByFlags(
    tree: NavigationTree[],
    flags: TenantFlags,
): NavigationTree[] {
    return tree
        .filter((node) => {
            const flag = NAV_KEY_TO_FLAG[node.key]
            return flag ? flags[flag] !== false : true
        })
        .map((node) =>
            node.subMenu && node.subMenu.length > 0
                ? { ...node, subMenu: filterNavByFlags(node.subMenu, flags) }
                : node,
        )
}

/**
 * Navegación filtrada por los feature-flags del tenant. Úsese en lugar de
 * `navigationConfig` directo en los componentes que renderizan el menú.
 * Sin config (o mientras carga) devuelve el árbol completo.
 */
export function useFilteredNavigation(): NavigationTree[] {
    const flags = useTenantFlags()
    return useMemo(() => filterNavByFlags(navigationConfig, flags), [flags])
}
