import dashboardsRoute from './dashboardsRoute'
import conceptsRoute from './conceptsRoute'
import authRoute from './authRoute'
import othersRoute from './othersRoute'
import type { Routes } from '@/@types/routes'

export const publicRoutes: Routes = [...authRoute]

// Demos de Ecme removidas — solo módulos de la plataforma.
export const protectedRoutes: Routes = [
    ...dashboardsRoute,
    ...conceptsRoute,
    ...othersRoute,
]
