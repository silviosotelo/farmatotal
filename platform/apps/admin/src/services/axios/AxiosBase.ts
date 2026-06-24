import axios from 'axios'
import AxiosResponseIntrceptorErrorCallback from './AxiosResponseIntrceptorErrorCallback'
import AxiosRequestIntrceptorConfigCallback from './AxiosRequestIntrceptorConfigCallback'
import appConfig from '@/configs/app.config'
import type { AxiosError } from 'axios'

// Multitenant: el admin opera sobre un tenant (por env; a futuro selector).
const ADMIN_TENANT = (import.meta as { env?: Record<string, string> }).env?.VITE_TENANT || 'default'

const AxiosBase = axios.create({
    timeout: 60000,
    baseURL: appConfig.apiPrefix,
    withCredentials: true,
    headers: { 'x-tenant': ADMIN_TENANT },
})

AxiosBase.interceptors.request.use(
    (config) => {
        return AxiosRequestIntrceptorConfigCallback(config)
    },
    (error) => {
        return Promise.reject(error)
    },
)

AxiosBase.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => AxiosResponseIntrceptorErrorCallback(error),
)

export default AxiosBase
