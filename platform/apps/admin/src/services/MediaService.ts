import ApiService from './ApiService'

export type MediaItem = {
    id: string
    url: string
    filename: string
    mime: string | null
    size: number
    alt: string | null
    kind: 'upload' | 'external'
    createdAt: string
}

export async function apiGetMedia(params?: { page?: number; perPage?: number }) {
    return ApiService.fetchDataWithAxios<{
        data: MediaItem[]
        total: number
        page: number
        perPage: number
        totalPages: number
    }>({
        url: '/media',
        method: 'get',
        params,
    })
}

export async function apiUploadMedia(data: {
    filename: string
    mime: string
    dataBase64: string
    alt?: string
}) {
    return ApiService.fetchDataWithAxios<MediaItem>({
        url: '/media/upload',
        method: 'post',
        data,
    })
}

export async function apiRegisterMedia(data: { url: string; filename?: string; alt?: string }) {
    return ApiService.fetchDataWithAxios<MediaItem>({
        url: '/media/register',
        method: 'post',
        data,
    })
}

export async function apiDeleteMedia(id: string) {
    return ApiService.fetchDataWithAxios<{ ok: boolean }>({
        url: `/media/${id}`,
        method: 'delete',
    })
}
