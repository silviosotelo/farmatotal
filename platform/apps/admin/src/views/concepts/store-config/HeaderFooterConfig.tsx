import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Loading from '@/components/shared/Loading'
import { apiGetSetting, apiSetSetting } from '@/services/CmsService'

type NavItem = { label: string; href: string }
type FooterColumn = { title: string; links: NavItem[] }
type FooterValue = {
    columns?: FooterColumn[]
    copyright?: string
    partner?: { href: string; image: string; alt: string } | null
}
type HeaderValue = { topNav?: NavItem[] }

/**
 * Editor de Header y Footer (estructura fija, contenido editable). Permite crear,
 * editar y eliminar columnas y links del footer + el nav superior del header.
 * Guarda en los settings header_config / footer_config que consume la tienda.
 */
function HeaderFooterConfig() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [topNav, setTopNav] = useState<NavItem[]>([])
    const [columns, setColumns] = useState<FooterColumn[]>([])
    const [copyright, setCopyright] = useState('')

    useEffect(() => {
        ;(async () => {
            const [h, f] = await Promise.all([
                apiGetSetting<HeaderValue>('header_config').catch(() => null),
                apiGetSetting<FooterValue>('footer_config').catch(() => null),
            ])
            setTopNav(h?.value?.topNav ?? [])
            setColumns(f?.value?.columns ?? [])
            setCopyright(f?.value?.copyright ?? '')
            setLoading(false)
        })()
    }, [])

    const save = async () => {
        setSaving(true)
        setSaved(false)
        try {
            // Merge no-destructivo: conservamos lo que no edita esta pantalla
            const prevF = (await apiGetSetting<FooterValue>('footer_config').catch(() => null))?.value ?? {}
            const prevH = (await apiGetSetting<HeaderValue>('header_config').catch(() => null))?.value ?? {}
            await apiSetSetting('header_config', { ...prevH, topNav })
            await apiSetSetting('footer_config', { ...prevF, columns, copyright })
            setSaved(true)
        } finally {
            setSaving(false)
        }
    }

    // --- helpers footer columnas ---
    const addColumn = () => setColumns((c) => [...c, { title: 'Nueva columna', links: [] }])
    const removeColumn = (i: number) => setColumns((c) => c.filter((_, x) => x !== i))
    const setColTitle = (i: number, title: string) =>
        setColumns((c) => c.map((col, x) => (x === i ? { ...col, title } : col)))
    const addLink = (i: number) =>
        setColumns((c) =>
            c.map((col, x) => (x === i ? { ...col, links: [...col.links, { label: '', href: '' }] } : col)),
        )
    const removeLink = (i: number, j: number) =>
        setColumns((c) =>
            c.map((col, x) => (x === i ? { ...col, links: col.links.filter((_, y) => y !== j) } : col)),
        )
    const setLink = (i: number, j: number, key: keyof NavItem, val: string) =>
        setColumns((c) =>
            c.map((col, x) =>
                x === i
                    ? { ...col, links: col.links.map((l, y) => (y === j ? { ...l, [key]: val } : l)) }
                    : col,
            ),
        )

    // --- helpers header nav ---
    const addNav = () => setTopNav((n) => [...n, { label: '', href: '' }])
    const removeNav = (i: number) => setTopNav((n) => n.filter((_, x) => x !== i))
    const setNav = (i: number, key: keyof NavItem, val: string) =>
        setTopNav((n) => n.map((it, x) => (x === i ? { ...it, [key]: val } : it)))

    return (
        <Loading loading={loading}>
            <div className="flex flex-col gap-4 max-w-4xl">
                <div className="flex items-center justify-between">
                    <h3>Header y Footer</h3>
                    <div className="flex items-center gap-3">
                        {saved && <span className="text-emerald-600 text-sm">Guardado ✓</span>}
                        <Button variant="solid" loading={saving} onClick={save}>
                            Guardar
                        </Button>
                    </div>
                </div>

                {/* Header nav */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h5>Menú superior (header)</h5>
                        <Button size="sm" onClick={addNav}>
                            + Link
                        </Button>
                    </div>
                    <div className="flex flex-col gap-2">
                        {topNav.map((it, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <Input
                                    placeholder="Etiqueta"
                                    value={it.label}
                                    onChange={(e) => setNav(i, 'label', e.target.value)}
                                />
                                <Input
                                    placeholder="/ruta"
                                    value={it.href}
                                    onChange={(e) => setNav(i, 'href', e.target.value)}
                                />
                                <Button size="sm" variant="plain" onClick={() => removeNav(i)}>
                                    Eliminar
                                </Button>
                            </div>
                        ))}
                        {topNav.length === 0 && (
                            <p className="text-gray-500 text-sm">Sin links. Agregá uno con “+ Link”.</p>
                        )}
                    </div>
                </Card>

                {/* Footer columns */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h5>Columnas del footer</h5>
                        <Button size="sm" onClick={addColumn}>
                            + Columna
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {columns.map((col, i) => (
                            <div key={i} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                                <div className="flex gap-2 items-center mb-2">
                                    <Input
                                        placeholder="Título de la columna"
                                        value={col.title}
                                        onChange={(e) => setColTitle(i, e.target.value)}
                                    />
                                    <Button size="sm" variant="plain" onClick={() => removeColumn(i)}>
                                        Quitar
                                    </Button>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {col.links.map((l, j) => (
                                        <div key={j} className="flex gap-2 items-center">
                                            <Input
                                                placeholder="Etiqueta"
                                                value={l.label}
                                                onChange={(e) => setLink(i, j, 'label', e.target.value)}
                                            />
                                            <Input
                                                placeholder="/ruta"
                                                value={l.href}
                                                onChange={(e) => setLink(i, j, 'href', e.target.value)}
                                            />
                                            <Button size="sm" variant="plain" onClick={() => removeLink(i, j)}>
                                                ×
                                            </Button>
                                        </div>
                                    ))}
                                    <Button size="sm" onClick={() => addLink(i)}>
                                        + Link
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {columns.length === 0 && (
                            <p className="text-gray-500 text-sm">Sin columnas. Agregá una con “+ Columna”.</p>
                        )}
                    </div>
                </Card>

                {/* Copyright */}
                <Card>
                    <h5 className="mb-2">Copyright</h5>
                    <Input value={copyright} onChange={(e) => setCopyright(e.target.value)} />
                </Card>
            </div>
        </Loading>
    )
}

export default HeaderFooterConfig
