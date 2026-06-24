import axios from 'axios'
import appConfig from '@/configs/app.config'
import { useSessionUser, useToken } from '@/store/authStore'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'

const unauthorizedCode = [401, 419, 440]

let isRefreshing = false
let failedQueue: Array<{
    resolve: (value: unknown) => void
    reject: (reason?: unknown) => void
    config: InternalAxiosRequestConfig
}> = []

function processQueue(token: string | null) {
    failedQueue.forEach(({ resolve, reject, config }) => {
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`
            resolve(axios(config))
        } else {
            reject(new Error('Token refresh failed'))
        }
    })
    failedQueue = []
}

function clearSession() {
    const { setToken } = useToken()
    setToken('')
    useSessionUser.getState().setUser({})
    useSessionUser.getState().setSessionSignedIn(false)
}

const AxiosResponseIntrceptorErrorCallback = async (error: AxiosError) => {
    const { response, config } = error
    const { setToken } = useToken()

    if (!response || !unauthorizedCode.includes(response.status)) {
        return Promise.reject(error)
    }

    // No reintentar si ya es un retry o si falla el propio endpoint de refresh
    const cfg = config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    if (cfg?._retry || (cfg?.url ?? '').includes('/auth/refresh')) {
        clearSession()
        window.location.href = '/sign-in'
        return Promise.reject(error)
    }

    // Si ya hay un refresh en curso, encolar y esperar
    if (isRefreshing) {
        return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject, config: cfg! })
        })
    }

    isRefreshing = true
    try {
        const res = await axios.post<{ accessToken: string }>(
            `${appConfig.apiPrefix}/auth/refresh`,
            {},
            { withCredentials: true },
        )
        const newToken = res.data.accessToken
        setToken(newToken)
        processQueue(newToken)
        if (cfg) {
            cfg._retry = true
            cfg.headers['Authorization'] = `Bearer ${newToken}`
            return axios(cfg)
        }
    } catch {
        clearSession()
        processQueue(null)
        window.location.href = '/sign-in'
    } finally {
        isRefreshing = false
    }

    return Promise.reject(error)
}

export default AxiosResponseIntrceptorErrorCallback
