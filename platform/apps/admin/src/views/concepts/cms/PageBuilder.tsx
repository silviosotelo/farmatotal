import { useEffect, useMemo, useState, useCallback } from 'react'
import {
    ChaiBuilderEditor,
    registerChaiTopBar,
    registerChaiSidebarPanel,
    ChaiScreenSizes,
    ChaiUndoRedo,
    ChaiThemeConfigPanel,
    useSavePage,
    useCurrentPage,
} from '@chaibuilder/sdk'
import { loadWebBlocks } from '@chaibuilder/sdk/web-blocks'
import '@chaibuilder/sdk/styles'
import { registerCommerceBlocks } from '@/components/chai/blocks'
import { registerEngineWidgets } from '@/components/chai/engineAdapter'
import { apiGetPages, apiUpdatePage } from '@/services/CmsService'
import { apiGetTemplates, apiSaveTemplate } from '@/services/TemplateService'
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

const TemplateIcon = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
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
    const [showTemplates, setShowTemplates] = useState(false)
    const [templates, setTemplates] = useState<any[]>([])
    const [loadingTemplates, setLoadingTemplates] = useState(false)

    const loadTemplates = useCallback(async () => {
        setLoadingTemplates(true)
        try {
            const res = await apiGetTemplates()
            setTemplates(res.data || [])
        } catch {
            toast.push(<Notification type="danger">Error al cargar plantillas</Notification>, { placement: 'top-center' })
        }
        setLoadingTemplates(false)
    }, [])

    const saveAsTemplate = useCallback(async () => {
        const title = prompt('Nombre de la plantilla:')
        if (!title) return
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        try {
            await apiSaveTemplate({ slug, title, blocks: [] })
            toast.push(<Notification type="success">Plantilla guardada</Notification>, { placement: 'top-center' })
        } catch {
            toast.push(<Notification type="danger">Error al guardar plantilla</Notification>, { placement: 'top-center' })
        }
    }, [])

    return (
        <div className="flex w-full items-center justify-between px-3">
            <div className="flex items-center gap-3">
                <ChaiUndoRedo />
                <ChaiScreenSizes />
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => { setShowTemplates(!showTemplates); if (!showTemplates) loadTemplates() }}
                        className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        title="Plantillas"
                    >
                        <TemplateIcon size={14} />
                        Plantillas
                    </button>
                    {showTemplates && (
                        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-gray-200 bg-white shadow-lg">
                            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
                                <span className="text-xs font-semibold text-gray-700">Plantillas</span>
                                <button type="button" onClick={() => setShowTemplates(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                            </div>
                            <div className="max-h-64 overflow-auto p-2">
                                {loadingTemplates ? (
                                    <div className="py-4 text-center text-xs text-gray-400">Cargando…</div>
                                ) : templates.length === 0 ? (
                                    <div className="py-4 text-center text-xs text-gray-400">Sin plantillas guardadas</div>
                                ) : (
                                    templates.map((t) => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => {
                                                toast.push(<Notification type="info">Plantilla cargada en el editor</Notification>, { placement: 'top-center' })
                                                setShowTemplates(false)
                                            }}
                                            className="block w-full rounded-md px-3 py-2 text-left text-xs hover:bg-gray-50"
                                        >
                                            <div className="font-medium text-gray-800">{t.title}</div>
                                            {t.templateCategory && <div className="text-[11px] text-gray-400">{t.templateCategory}</div>}
                                        </button>
                                    ))
                                )}
                            </div>
                            <div className="border-t border-gray-100 p-2">
                                <button
                                    type="button"
                                    onClick={saveAsTemplate}
                                    className="w-full rounded-md bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800"
                                >
                                    Guardar como plantilla
                                </button>
                            </div>
                        </div>
                    )}
                </div>
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
    const [showPreview, setShowPreview] = useState(false)

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
                <>
                    <button
                        type="button"
                        onClick={() => setShowPreview(!showPreview)}
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
                            background: showPreview ? '#ef4444' : '#111827',
                            color: '#fff',
                            textDecoration: 'none',
                            boxShadow: '0 2px 8px rgba(0,0,0,.12)',
                            cursor: 'pointer',
                        }}
                    >
                        {showPreview ? 'Cerrar preview' : 'Preview'}
                    </button>
                    {showPreview && (
                        <iframe
                            src={`${STORE_URL}/preview/${slug}`}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                zIndex: 9998,
                                width: '100%',
                                height: '100%',
                                border: 'none',
                                background: '#fff',
                            }}
                        />
                    )}
                </>
            )}
        </div>
    )
}

export default PageBuilder
