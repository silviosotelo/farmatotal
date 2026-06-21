import { createContext, useContext } from 'react'
import { LayoutType } from '@platform/ui/@types/theme'
import type { ComponentType, ReactNode } from 'react'

// Tipos laxos del feature "reassemble": la implementación concreta de PageContainer
// vive en la app host (admin). El paquete no depende del shell del admin.
/* eslint-disable @typescript-eslint/no-explicit-any */
type PageContainerProps = Record<string, any>

export type PageContainerReassembleProps = {
    defaultClass: string
    pageContainerGutterClass: string
    pageContainerDefaultClass: string
    PageContainerHeader: ComponentType<any>
    PageContainerBody: ComponentType<any>
    PageContainerFooter: ComponentType<any>
} & PageContainerProps

export interface LayoutContextProps {
    type: LayoutType
    adaptiveCardActive?: boolean
    pageContainerReassemble?: (props: PageContainerReassembleProps) => ReactNode
}

export const LayoutContext = createContext<LayoutContextProps | undefined>(
    undefined,
)

const useLayout = (): LayoutContextProps => {
    const context = useContext(LayoutContext)
    if (!context) {
        throw new Error('useLayout must be used within a LayoutProvider')
    }
    return context
}

export default useLayout
