import { useEffect, useMemo, useState } from 'react'
import {
    ChaiBuilderEditor,
    registerChaiTopBar,
    registerChaiSidebarPanel,
    ChaiScreenSizes,
    ChaiUndoRedo,
    ChaiThemeConfigPanel,
    useSavePage,
} from '@chaibuilder/sdk'
import { loadWebBlocks } from '@chaibuilder/sdk/web-blocks'
import '@chaibuilder/sdk/styles'
import { registerCommerceBlocks } from '@/components/chai/blocks'
import { registerEngineWidgets } from '@/components/chai/engineAdapter'
import { apiGetPages, apiUpdatePage } from '@/services/CmsService'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Loading from '@/components/shared/Loading'
import { useParams, useNavigate } from 'react-router'

const PaletteIcon = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
        <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
        <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
        <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2Z" />
    </svg>
)

// OBLIGATORIO antes de montar el editor (registros = singletons globales, una vez):
// 1) loadWebBlocks(): registra el set de bloques nativos (Box/Text/Heading/Image/…)
//    — sin esto el panel "Add Blocks" queda vacío y los bloques nativos no renderizan.
// 2) registerCommerceBlocks(): nuestros bloques data-bound/funcionales.
// 3) registerChaiTopBar / registerChaiSidebarPanel: el SDK trae el top bar VACÍO por
//    defecto; lo poblamos con dispositivos + undo/redo + guardar, y agregamos el panel de Tema.
loadWebBlocks()
registerCommerceBlocks()
registerEngineWidgets()

function ChaiTopBar() {
    const { savePageAsync, saveState } = useSavePage()
    return (
        <div className="flex w-full items-center justify-between px-3">
            <div className="flex items-center gap-3">
                <ChaiUndoRedo />
                <ChaiScreenSizes />
            </div>
            <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">
                    {saveState === 'SAVING' ? 'Guardando…' : saveState === 'UNSAVED' ? 'Sin guardar' : 'Guardado'}
                </span>
                <button
                    type="button"
                    className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    onClick={() => savePageAsync(true)}
                >
                    Publicar
                </button>
            </div>
        </div>
    )
}
registerChaiTopBar(ChaiTopBar)

registerChaiSidebarPanel('theme', {
    position: 'top',
    view: 'standard',
    label: 'Tema',
    width: 280,
    icon: <PaletteIcon />,
    button: ({ isActive, show }: { isActive: boolean; show: () => void }) => (
        <button
            type="button"
            onClick={show}
            className={`flex h-9 w-9 items-center justify-center rounded ${isActive ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}
            title="Tema"
        >
            <PaletteIcon />
        </button>
    ),
    panel: ChaiThemeConfigPanel,
})

/* eslint-disable @typescript-eslint/no-explicit-any */
const Editor = ChaiBuilderEditor as unknown as React.FC<any>
type ChaiBlock = Record<string, any>
type SaveArgs = { blocks: ChaiBlock[]; autoSave?: boolean }

/**
 * Constructor de página (Chai Builder) — editor visual COMPLETO.
 * Se monta a pantalla completa (100vw×100vh, fixed) como exige el SDK: así
 * aparecen la barra superior (dispositivos, undo/redo, publicar), el panel de
 * bloques, el Outline y el panel Settings/Style. Montado dentro del chrome de
 * Ecme, el SDK recorta su top-bar.
 */
const STORE_URL = (import.meta as any).env?.VITE_STORE_URL || 'http://localhost:3000'

const PageBuilder = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [blocks, setBlocks] = useState<ChaiBlock[] | null>(null)
    const [slug, setSlug] = useState<string>('')

    useEffect(() => {
        apiGetPages().then((res) => {
            const page = res.data.find((p) => p.id === id)
            const raw = page?.blocks as unknown
            setSlug((page?.slug as string) || '')
            setBlocks(Array.isArray(raw) ? (raw as ChaiBlock[]) : [])
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    const save = async ({ blocks: next }: SaveArgs): Promise<boolean> => {
        if (!id) return false
        try {
            await apiUpdatePage(id, { blocks: next as unknown[] })
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: '#fff' }}>
            <Editor pageId={id} blocks={initialBlocks} onSave={save} autoSave autoSaveActionsCount={3} />
            <button
                type="button"
                onClick={() => navigate('/concepts/cms')}
                title="Volver a CMS · Páginas"
                style={{
                    position: 'fixed',
                    left: 56,
                    bottom: 12,
                    zIndex: 9999,
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    background: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,.12)',
                    cursor: 'pointer',
                }}
            >
                ← Volver
            </button>
            {slug && (
                <a
                    href={`${STORE_URL}/preview/${slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Ver la página real (render del store: componentes + CSS del template)"
                    style={{
                        position: 'fixed',
                        left: 150,
                        bottom: 12,
                        zIndex: 9999,
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '1px solid #e5e7eb',
                        background: '#111827',
                        color: '#fff',
                        textDecoration: 'none',
                        boxShadow: '0 2px 8px rgba(0,0,0,.12)',
                        cursor: 'pointer',
                    }}
                >
                    Ver página real ↗
                </a>
            )}
        </div>
    )
}

export default PageBuilder
