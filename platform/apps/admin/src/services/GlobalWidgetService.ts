import ApiService from './ApiService'

export async function apiGetGlobalWidgets() {
  return ApiService.fetchDataWithAxios<{ data: any[] }>({ url: '/cms/global-widgets', method: 'get' })
}

export async function apiSaveGlobalWidget(data: { slug: string; title: string; blocks: unknown }) {
  return ApiService.fetchDataWithAxios({ url: '/cms/global-widgets', method: 'post', data })
}

export async function apiUpdateGlobalWidget(id: string, data: { title?: string; blocks?: unknown }) {
  return ApiService.fetchDataWithAxios({ url: `/cms/global-widgets/${id}`, method: 'put', data })
}

export async function apiDeleteGlobalWidget(id: string) {
  return ApiService.fetchDataWithAxios({ url: `/cms/global-widgets/${id}`, method: 'delete' })
}
