import ApiService from './ApiService'

export type Category = {
    id: string
    slug: string
    name: string
    parentId: string | null
    position?: number
    fliaCodigo?: string | null
    icon?: string | null
    description?: string | null
    active: boolean
    custom?: Record<string, unknown> | null
}

export type CategoryInput = {
    name: string
    slug: string
    parentId?: string | null
    active?: boolean
    description?: string | null
    custom?: Record<string, unknown> | null
}

export async function apiGetCategories() {
    return ApiService.fetchDataWithAxios<{ data: Category[] }>({
        url: '/catalog/categories?perPage=500',
        method: 'get',
    })
}

export async function apiCreateCategory(data: CategoryInput) {
    return ApiService.fetchDataWithAxios<Category>({ url: '/catalog/categories', method: 'post', data })
}

export async function apiUpdateCategory(id: string, data: Partial<CategoryInput>) {
    return ApiService.fetchDataWithAxios<Category>({ url: `/catalog/categories/${id}`, method: 'patch', data })
}
