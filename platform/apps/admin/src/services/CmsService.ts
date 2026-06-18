import ApiService from './ApiService'

export type Page = {
    id: string
    slug: string
    title: string
    blocks: unknown[]
    published: boolean
}

export async function apiGetPages() {
    return ApiService.fetchDataWithAxios<{ data: Page[]; total: number }>({
        url: '/cms/pages',
        method: 'get',
    })
}

export async function apiCreatePage(data: {
    slug: string
    title: string
    blocks?: unknown[]
    published?: boolean
}) {
    return ApiService.fetchDataWithAxios<Page>({
        url: '/cms/pages',
        method: 'post',
        data,
    })
}

export async function apiUpdatePage(id: string, data: Partial<Page>) {
    return ApiService.fetchDataWithAxios<Page>({
        url: `/cms/pages/${id}`,
        method: 'patch',
        data,
    })
}

export async function apiDeletePage(id: string) {
    return ApiService.fetchDataWithAxios<{ ok: boolean; id: string }>({
        url: `/cms/pages/${id}`,
        method: 'delete',
    })
}

export async function apiGetSetting<T = unknown>(key: string) {
    return ApiService.fetchDataWithAxios<{ key: string; value: T }>({
        url: `/cms/settings/${key}`,
        method: 'get',
    })
}

export async function apiSetSetting(key: string, value: unknown) {
    return ApiService.fetchDataWithAxios<{ ok: boolean }>({
        url: `/cms/settings/${key}`,
        method: 'put',
        data: { value },
    })
}
