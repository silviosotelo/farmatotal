import ApiService from './ApiService'

export type AdminUser = {
    id: string
    email: string
    name: string | null
    role: 'admin' | 'editor' | 'viewer' | 'customer'
    active: boolean
    lastLoginAt: string | null
    createdAt: string
}

export const ROLES: { value: AdminUser['role']; label: string }[] = [
    { value: 'admin', label: 'Administrador' },
    { value: 'editor', label: 'Editor' },
    { value: 'viewer', label: 'Lector' },
    { value: 'customer', label: 'Cliente' },
]

export async function apiGetUsers() {
    return ApiService.fetchDataWithAxios<{ data: AdminUser[]; total: number }>({
        url: '/users',
        method: 'get',
    })
}

export async function apiCreateUser(data: {
    email: string
    password: string
    name?: string
    role?: AdminUser['role']
}) {
    return ApiService.fetchDataWithAxios<AdminUser>({ url: '/users', method: 'post', data })
}

export async function apiUpdateUser(
    id: string,
    data: Partial<{ name: string; role: AdminUser['role']; active: boolean; password: string }>,
) {
    return ApiService.fetchDataWithAxios<AdminUser>({ url: `/users/${id}`, method: 'patch', data })
}

export async function apiDeleteUser(id: string) {
    return ApiService.fetchDataWithAxios<{ ok: boolean }>({ url: `/users/${id}`, method: 'delete' })
}
