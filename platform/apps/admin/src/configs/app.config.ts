export type AppConfig = {
    apiPrefix: string
    authenticatedEntryPath: string
    unAuthenticatedEntryPath: string
    locale: string
    accessTokenPersistStrategy: 'localStorage' | 'sessionStorage' | 'cookies'
    enableMock: boolean
    activeNavTranslation: boolean
}

const appConfig: AppConfig = {
    apiPrefix: import.meta.env.VITE_API_URL || 'http://localhost:4000',
    authenticatedEntryPath: '/dashboards/overview',
    unAuthenticatedEntryPath: '/sign-in',
    locale: 'es',
    accessTokenPersistStrategy: 'localStorage',
    enableMock: true,
    activeNavTranslation: false,
}

export default appConfig
