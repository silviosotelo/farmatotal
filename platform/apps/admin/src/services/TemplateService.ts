import ApiService from './ApiService'

export async function apiGetTemplates() {
    return ApiService.fetchDataWithAxios<{ data: any[] }>({ url: '/cms/templates', method: 'get' })
}

export async function apiSaveTemplate(data: { slug: string; title: string; category?: string; thumbnail?: string; blocks: unknown }) {
    return ApiService.fetchDataWithAxios({ url: '/cms/templates', method: 'post', data })
}

export async function apiDeleteTemplate(id: string) {
    return ApiService.fetchDataWithAxios({ url: `/cms/templates/${id}`, method: 'delete' })
}
