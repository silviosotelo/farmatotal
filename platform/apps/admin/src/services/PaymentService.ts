import ApiService from './ApiService'

export type PaymentField = {
    key: string
    label: string
    type: 'text' | 'password' | 'select'
    options?: { value: string; label: string }[]
}

export type PaymentMethod = {
    key: string
    name: string
    description: string
    fields: PaymentField[]
    custom?: boolean
    enabled: boolean
    values: Record<string, unknown>
}

export type Transaction = {
    id: string
    provider: string
    status: string
    amount: number
    providerRef: string | null
    createdAt: string
    orderNumber: string | null
    customerName: string | null
}

export const apiGetPaymentMethods = () =>
    ApiService.fetchDataWithAxios<{ data: PaymentMethod[] }>({ url: '/payments/methods', method: 'get' })

export const apiSavePaymentMethod = (key: string, data: { enabled: boolean; values: Record<string, unknown> }) =>
    ApiService.fetchDataWithAxios<{ ok: boolean }>({ url: `/payments/methods/${key}`, method: 'put', data })

export const apiCreateCustomMethod = (data: { name: string; description?: string; instructions?: string }) =>
    ApiService.fetchDataWithAxios<{ ok: boolean; key: string }>({ url: '/payments/methods/custom', method: 'post', data })

export const apiDeleteCustomMethod = (key: string) =>
    ApiService.fetchDataWithAxios<{ ok: boolean }>({ url: `/payments/methods/custom/${key}`, method: 'delete' })

export const apiGetTransactions = () =>
    ApiService.fetchDataWithAxios<{ data: Transaction[] }>({ url: '/payments/transactions', method: 'get' })
