import ApiService from './ApiService'

export type ErpAdapterInfo = { key: string; label: string }
export type SyncRun = {
    id: string
    kind: string
    status: string
    stats?: Record<string, unknown> | null
    errorMessage?: string | null
    createdAt: string
}
export type FieldMapping = { sourceName: string; targetName: string; transform?: string | null }

export async function apiGetErpAdapters() {
    return ApiService.fetchDataWithAxios<{ data: ErpAdapterInfo[] }>({ url: '/erp-sync/adapters', method: 'get' })
}

export async function apiGetSyncRuns() {
    return ApiService.fetchDataWithAxios<{ data: SyncRun[] }>({ url: '/erp-sync/runs', method: 'get' })
}

export async function apiGetMappings(entity: string) {
    return ApiService.fetchDataWithAxios<{ data: FieldMapping[] }>({ url: `/erp-sync/mappings?entity=${entity}`, method: 'get' })
}

export async function apiSaveMappings(entity: string, mappings: FieldMapping[]) {
    return ApiService.fetchDataWithAxios<{ ok: boolean; count: number }>({
        url: '/erp-sync/mappings',
        method: 'put',
        data: { entity, mappings },
    })
}

export async function apiRunImport(entity: 'products' | 'categories', maxProducts?: number) {
    return ApiService.fetchDataWithAxios<{ ok: boolean; adapter: string; fetched: number }>({
        url: '/erp-sync/import',
        method: 'post',
        data: { entity, maxProducts },
    })
}
