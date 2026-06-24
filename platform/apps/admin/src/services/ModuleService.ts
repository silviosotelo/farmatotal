import ApiService from './ApiService'

export type ModuleKind = 'native' | 'plugin'
export type ModuleCategory =
    | 'core'
    | 'commerce'
    | 'content'
    | 'messaging'
    | 'marketing'
    | 'payment'
    | 'logistics'
    | 'infra'
    | 'builder'

export type PlatformModule = {
    key: string
    name: string
    description: string
    kind: ModuleKind
    category: ModuleCategory
    version: string
    registersInto?: string
    settingsKey?: string
    adminPath?: string
    features?: string[]
    dependsOn?: string[]
    enabled: boolean
}

export async function apiGetModules() {
    return ApiService.fetchDataWithAxios<{ data: PlatformModule[]; total: number }>({
        url: '/modules',
        method: 'get',
    })
}

export async function apiToggleModule(key: string, enabled: boolean) {
    return ApiService.fetchDataWithAxios<{ key: string; enabled: boolean }>({
        url: `/modules/${key}`,
        method: 'patch',
        data: { enabled },
    })
}
