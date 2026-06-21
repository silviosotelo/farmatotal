// Base del API: en dev queda '/' (proxy Vite); en build de producción se inyecta
// VITE_API_URL (ej. https://api.rohekawebservices.online) para llamadas absolutas.
export const apiPrefix = (import.meta as { env?: Record<string, string> }).env?.VITE_API_URL || '/'

const endpointConfig = {
    signIn: '/auth/login',
    signOut: '/auth/logout',
    signUp: '/auth/bootstrap',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
}

export default endpointConfig
