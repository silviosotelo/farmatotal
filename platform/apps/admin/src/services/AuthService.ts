import ApiService from './ApiService'
import endpointConfig from '@/configs/endpoint.config'
import type {
    SignInCredential,
    SignUpCredential,
    ForgotPassword,
    ResetPassword,
    SignInResponse,
    SignUpResponse,
} from '@/@types/auth'

/** Response del backend de la plataforma. */
type BackendSession = {
    accessToken: string
    user: {
        id: string
        email: string
        name: string | null
        role: 'admin' | 'editor' | 'viewer' | 'customer'
    }
}

function adaptSession(res: BackendSession): SignInResponse {
    return {
        token: res.accessToken,
        user: {
            userId: res.user.id,
            userName: res.user.name ?? res.user.email,
            email: res.user.email,
            avatar: '',
            authority: [res.user.role],
        },
    }
}

export async function apiSignIn(data: SignInCredential) {
    const raw = await ApiService.fetchDataWithAxios<BackendSession>({
        url: endpointConfig.signIn,
        method: 'post',
        data,
    })
    return adaptSession(raw)
}

export async function apiSignUp(data: SignUpCredential) {
    // Bootstrap solo cuando no hay usuarios. Mapeo userName -> name.
    const raw = await ApiService.fetchDataWithAxios<BackendSession>({
        url: endpointConfig.signUp,
        method: 'post',
        data: { email: data.email, password: data.password, name: data.userName },
    })
    return adaptSession(raw) as SignUpResponse
}

export async function apiSignOut() {
    return ApiService.fetchDataWithAxios({
        url: endpointConfig.signOut,
        method: 'post',
    })
}

/** Valida el token actual y devuelve el usuario (para restaurar sesión y guards). */
export async function apiGetCurrentUser() {
    const raw = await ApiService.fetchDataWithAxios<BackendSession>({
        url: '/auth/me',
        method: 'get',
    })
    return adaptSession(raw).user
}

export async function apiForgotPassword<T>(data: ForgotPassword) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.forgotPassword,
        method: 'post',
        data,
    })
}

export async function apiResetPassword<T>(data: ResetPassword) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.resetPassword,
        method: 'post',
        data,
    })
}
