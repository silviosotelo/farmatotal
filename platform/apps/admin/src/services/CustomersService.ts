import ApiService from './ApiService'

type BackendCustomer = {
    id: string
    email: string | null
    firstName: string | null
    lastName: string | null
    razonSocial: string | null
    docType: 'CI' | 'RUC' | null
    docNumber: string | null
    phone: string | null
    addresses: Array<{ city?: string; address?: string; line1?: string }> | null
    active: boolean
}

/** Mapea el cliente del motor al shape que esperan las vistas Ecme. */
function mapCustomer(c: BackendCustomer) {
    const fullName =
        c.razonSocial ||
        `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() ||
        c.email ||
        'Sin nombre'
    const addr = c.addresses?.[0] ?? {}
    return {
        id: c.id,
        name: fullName,
        firstName: c.firstName ?? '',
        lastName: c.lastName ?? '',
        email: c.email ?? '',
        img: '',
        role: 'customer',
        lastOnline: 0,
        status: c.active ? 'active' : 'blocked',
        totalSpending: 0,
        personalInfo: {
            location: addr.city ?? '',
            title: c.docType && c.docNumber ? `${c.docType} ${c.docNumber}` : '',
            birthday: '',
            phoneNumber: c.phone ?? '',
            dialCode: '',
            address: addr.address ?? addr.line1 ?? '',
            postcode: '',
            city: addr.city ?? '',
            country: 'Paraguay',
            facebook: '',
            twitter: '',
            pinterest: '',
            linkedIn: '',
        },
        orderHistory: [],
        paymentMethod: [],
        subscription: [],
    }
}

type TableQueriesLike = {
    pageIndex?: number
    pageSize?: number
    query?: string
    sort?: { order?: string; key?: string }
}

export async function apiGetCustomersList<T, U extends Record<string, unknown>>(
    params: U,
) {
    const p = params as TableQueriesLike
    const res = await ApiService.fetchDataWithAxios<{
        data: BackendCustomer[]
        total: number
    }>({
        url: '/customers',
        method: 'get',
        params: {
            page: p.pageIndex ?? 1,
            perPage: p.pageSize ?? 10,
            q: p.query || undefined,
        },
    })
    return { list: res.data.map(mapCustomer), total: res.total } as T
}

export async function apiGetCustomer<T, U extends Record<string, unknown>>(
    args: U & { id: string },
) {
    const c = await ApiService.fetchDataWithAxios<BackendCustomer>({
        url: `/customers/${args.id}`,
        method: 'get',
    })
    return mapCustomer(c) as T
}

export async function apiGetCustomerLog<T, U extends Record<string, unknown>>(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _params: U,
) {
    // El motor aún no tiene log de actividad por cliente.
    return { data: [], loadable: false } as T
}
