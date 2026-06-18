import ApiService from './ApiService'

type BackendMedia = {
    id: string
    url: string
    filename: string
    mime: string | null
    size: number
    kind: 'upload' | 'external'
    createdAt: string
}

/** Mapea un medio del motor al shape `File` que usa el File Manager de Ecme. */
function mapFile(m: BackendMedia) {
    const ext = (m.filename.split('.').pop() ?? '').toLowerCase()
    return {
        id: m.id,
        name: m.filename,
        fileType: ext || (m.mime ?? '').split('/').pop() || 'file',
        srcUrl: m.url,
        size: m.size,
        author: { name: '', email: '', img: '' },
        activities: [],
        permissions: [],
        uploadDate: m.createdAt
            ? Math.floor(new Date(m.createdAt).getTime() / 1000)
            : 0,
        recent: false,
    }
}

export async function apiGetFiles<T, U extends Record<string, unknown>>(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _params: U,
) {
    const res = await ApiService.fetchDataWithAxios<{ data: BackendMedia[] }>({
        url: '/media',
        method: 'get',
        params: { perPage: 100 },
    })
    // Backend plano (sin carpetas): todo en la raíz.
    return { list: res.data.map(mapFile), directory: [] } as T
}
