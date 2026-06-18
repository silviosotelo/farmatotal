import ApiService from './ApiService'

export type PluginField = {
    key: string
    label: string
    type: 'text' | 'password' | 'select' | 'toggle' | 'url'
    group: string
    options?: { value: string; label: string }[]
    placeholder?: string
    help?: string
}

export type PluginConfigData = {
    key: string
    name: string
    description: string
    features: string[]
    fields: PluginField[]
    enabled: boolean
    values: Record<string, unknown>
}

export const apiGetPlugin = (key: string) =>
    ApiService.fetchDataWithAxios<PluginConfigData>({ url: `/plugins/${key}`, method: 'get' })

export const apiSavePlugin = (key: string, data: { enabled: boolean; values: Record<string, unknown> }) =>
    ApiService.fetchDataWithAxios<{ ok: boolean }>({ url: `/plugins/${key}`, method: 'put', data })
