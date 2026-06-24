import ApiService from './ApiService'

type EcmeQueries = Record<string, unknown> & {
    pageIndex?: number
    pageSize?: number
}

type BackendOrder = {
    id: string
    number: string
    customerName: string
    status: string
    paymentMethod: string
    total: number
    createdAt: string
}

type BackendList<T> = {
    data: T[]
    page: number
    perPage: number
    total: number
    totalPages: number
}

// Ecme OrderList usa status numérico; mapeo desde el string del backend.
const STATUS_NUM: Record<string, number> = {
    pending: 0,
    paid: 1,
    processing: 2,
    fulfilled: 3,
    delivered: 4,
    cancelled: 5,
    refunded: 6,
}

const PAYMENT_LABEL: Record<string, string> = {
    online: 'Tarjeta (Bancard)',
    cash: 'Efectivo',
    transfer: 'Transferencia',
}

function adaptOrder(o: BackendOrder) {
    return {
        id: o.id,
        orderNumber: o.number,
        date: Math.floor(new Date(o.createdAt).getTime() / 1000),
        customer: o.customerName,
        status: STATUS_NUM[o.status] ?? 0,
        paymentMehod: o.paymentMethod,
        paymentIdendifier: PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod,
        totalAmount: o.total,
    }
}

export async function apiGetOrderList<T, U extends Record<string, unknown>>(
    params: U,
) {
    const q = params as EcmeQueries
    const res = await ApiService.fetchDataWithAxios<BackendList<BackendOrder>>({
        url: '/orders',
        method: 'get',
        params: { page: q.pageIndex ?? 1, perPage: q.pageSize ?? 20 },
    })
    return { list: res.data.map(adaptOrder), total: res.total } as T
}

export async function apiGetOrder<T, U extends Record<string, unknown>>({
    id,
    ...params
}: U) {
    return ApiService.fetchDataWithAxios<T>({
        url: `/orders/${id}`,
        method: 'get',
        params,
    })
}

export async function apiUpdateOrderStatus(id: string, status: string, note?: string) {
    return ApiService.fetchDataWithAxios({
        url: `/orders/${id}/status`,
        method: 'patch',
        data: { status, note },
    })
}

/** Reembolso total o parcial. Omitir amount = reembolso total (→ estado refunded). */
export async function apiRefundOrder(id: string, amount?: number, reason?: string) {
    return ApiService.fetchDataWithAxios({
        url: `/orders/${id}/refund`,
        method: 'post',
        data: { amount, reason },
    })
}

export async function apiCreateOrder(data: {
    customerName: string
    customerEmail: string
    paymentMethod: string
    shippingMethod?: string
    lines: { productId: string; quantity: number; unitPrice: number }[]
}) {
    return ApiService.fetchDataWithAxios<{ id: string }>({
        url: '/orders',
        method: 'post',
        data,
    })
}

export async function apiUpdateOrder(
    id: string,
    data: {
        customerName?: string
        customerEmail?: string
        paymentMethod?: string
        shippingMethod?: string
        lines?: { productId: string; quantity: number; unitPrice: number }[]
    },
) {
    return ApiService.fetchDataWithAxios<{ id: string }>({
        url: `/orders/${id}`,
        method: 'put',
        data,
    })
}
