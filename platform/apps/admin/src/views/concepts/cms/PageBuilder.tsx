import { useEffect, useMemo, useState } from 'react'
import { ChaiBuilderEditor } from '@chaibuilder/sdk'
import '@chaibuilder/sdk/web-blocks'
import '@chaibuilder/sdk/styles'
import { registerCommerceBlocks } from '@/components/chai/blocks'
import { apiGetPages, apiUpdatePage } from '@/services/CmsService'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Loading from '@/components/shared/Loading'
import { useParams, useNavigate } from 'react-router'

// Registro de bloques data-bound (idempotente) antes de montar el editor.
registerCommerceBlocks()

/* eslint-disable @typescript-eslint/no-explicit-any */
const Editor = ChaiBuilderEditor as unknown as React.FC<any>
type ChaiBlock = Record<string, any>
type SaveArgs = { blocks: ChaiBlock[]; autoSave?: boolean }

/**
 * Constructor de página (Chai Builder) — reemplazo de Puck.
 * Carga la página por :id, edita sus bloques y los persiste en pages.blocks
 * (formato array de bloques Chai). Datos viejos de Puck ({content,root,zones})
 * se ignoran y se arranca en blanco.
 */
const PageBuilder = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [blocks, setBlocks] = useState<ChaiBlock[] | null>(null)
    const [title, setTitle] = useState('')

    useEffect(() => {
        apiGetPages().then((res) => {
            const page = res.data.find((p) => p.id === id)
            if (page) {
                setTitle(page.title)
                const raw = page.blocks as unknown
                setBlocks(Array.isArray(raw) ? (raw as ChaiBlock[]) : [])
            } else {
                setBlocks([])
            }
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    const save = async ({ blocks: next }: SaveArgs): Promise<boolean> => {
        if (!id) return false
        try {
            await apiUpdatePage(id, { blocks: next as unknown[] })
            toast.push(<Notification type="success">Página guardada</Notification>, { placement: 'top-center' })
            return true
        } catch (e) {
            toast.push(
                <Notification type="danger">{(e as Error)?.message || 'Error al guardar'}</Notification>,
                { placement: 'top-center' },
            )
            return false
        }
    }

    const initialBlocks = useMemo(() => blocks ?? [], [blocks])

    if (!blocks) {
        return <Loading loading />
    }

    return (
        <div className="flex h-[calc(100vh-64px)] flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/concepts/cms')}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
                    >
                        ← Volver
                    </button>
                    <span className="font-semibold text-gray-800">{title || 'Constructor de página'}</span>
                </div>
                <span className="text-xs text-gray-400">Editor visual · Chai Builder</span>
            </div>
            <div className="min-h-0 flex-1">
                <Editor blocks={initialBlocks} onSave={save} />
            </div>
        </div>
    )
}

export default PageBuilder
