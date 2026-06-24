import { useEffect, useState } from 'react'
import useSWR from 'swr'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Table from '@/components/ui/Table'
import Select from '@/components/ui/Select'
import Tag from '@/components/ui/Tag'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { HiOutlineTrash, HiOutlinePlus } from 'react-icons/hi'
import PluginConfig from '../PluginConfig'
import { apiGetSyncRuns, apiGetMappings, apiSaveMappings, apiRunImport, type FieldMapping } from '@/services/ErpSyncService'

const { Tr, Th, Td, THead, TBody } = Table

const MappingEditor = ({ entity }: { entity: string }) => {
    const { data, mutate } = useSWR(['/erp-sync/mappings', entity], () => apiGetMappings(entity), { revalidateOnFocus: false })
    const [rows, setRows] = useState<FieldMapping[]>([])
    const [saving, setSaving] = useState(false)
    useEffect(() => { if (data) setRows(data.data) }, [data])

    const patch = (i: number, p: Partial<FieldMapping>) => setRows((r) => r.map((x, k) => (k === i ? { ...x, ...p } : x)))
    const add = () => setRows((r) => [...r, { sourceName: '', targetName: '', transform: null }])
    const remove = (i: number) => setRows((r) => r.filter((_, k) => k !== i))
    const save = async () => {
        setSaving(true)
        try {
            await apiSaveMappings(entity, rows.filter((r) => r.sourceName.trim() && r.targetName.trim()))
            await mutate()
            toast.push(<Notification type="success">Mapeo guardado</Notification>, { placement: 'top-center' })
        } finally { setSaving(false) }
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="hidden lg:grid grid-cols-12 gap-2 text-xs text-gray-400">
                <span className="col-span-4">Campo en el ERP (origen)</span>
                <span className="col-span-5">Campo destino (nativo o custom.&lt;key&gt;)</span>
                <span className="col-span-2">Transform</span>
                <span className="col-span-1"></span>
            </div>
            {rows.map((m, i) => (
                <div key={i} className="grid grid-cols-12 items-center gap-2">
                    <div className="col-span-4"><Input value={m.sourceName} onChange={(e) => patch(i, { sourceName: e.target.value })} placeholder="STK_ARTICULO" /></div>
                    <div className="col-span-5"><Input value={m.targetName} onChange={(e) => patch(i, { targetName: e.target.value })} placeholder="sku  o  custom.principio_activo" /></div>
                    <div className="col-span-2">
                        <Select
                            options={[
                                { value: '', label: '—' },
                                { value: 'number', label: 'número' },
                                { value: 'boolean', label: 'sí/no' },
                                { value: 'upper', label: 'MAYÚS' },
                                { value: 'lower', label: 'minús' },
                                { value: 'trim', label: 'trim' },
                                { value: 'slug', label: 'slug' },
                            ]}
                            value={[
                                { value: '', label: '—' },
                                { value: 'number', label: 'número' },
                                { value: 'boolean', label: 'sí/no' },
                                { value: 'upper', label: 'MAYÚS' },
                                { value: 'lower', label: 'minús' },
                                { value: 'trim', label: 'trim' },
                                { value: 'slug', label: 'slug' },
                            ].find((o) => o.value === (m.transform ?? ''))}
                            onChange={(o) => patch(i, { transform: o?.value || null })}
                        />
                    </div>
                    <div className="col-span-1 text-right"><Button size="md" variant="plain" icon={<HiOutlineTrash />} onClick={() => remove(i)} /></div>
                </div>
            ))}
            <div className="flex gap-2">
                <Button size="md" icon={<HiOutlinePlus />} onClick={add}>Agregar</Button>
                <Button size="md" variant="solid" loading={saving} onClick={save}>Guardar mapeo</Button>
            </div>
        </div>
    )
}

const statusTint: Record<string, string> = {
    ok: 'bg-emerald-100 text-emerald-600',
    running: 'bg-amber-100 text-amber-600',
    failed: 'bg-red-100 text-red-600',
    pending: 'bg-gray-100 text-gray-500',
}

const ErpSync = () => {
    const { data: runs, mutate: mutateRuns } = useSWR(['/erp-sync/runs'], () => apiGetSyncRuns(), { revalidateOnFocus: false })
    const [importing, setImporting] = useState(false)

    const runImport = async (entity: 'products' | 'categories') => {
        setImporting(true)
        try {
            const r = await apiRunImport(entity)
            toast.push(<Notification type="success">Importación lanzada ({r.adapter})</Notification>, { placement: 'top-center' })
            await mutateRuns()
        } catch {
            toast.push(<Notification type="danger">No se pudo importar (¿módulo activo? ¿adapter configurado?)</Notification>, { placement: 'top-center' })
        } finally { setImporting(false) }
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h3 className="mb-1">Sincronizador ERP</h3>
                <p className="text-gray-500">Conexión + adapter, mapeo de campos, importación y historial. Agnóstico: elegí el ERP (adapter) y mapeá sus campos a la plataforma (incluye campos custom con <code>custom.&lt;key&gt;</code>).</p>
            </div>

            {/* Config base del plugin (adapter, baseUrl, token, toggles) — genérico */}
            <PluginConfig pluginKey="erp_sync" />

            <Card>
                <div className="mb-3 flex items-center justify-between">
                    <h5>Importar ahora</h5>
                    <div className="flex gap-2">
                        <Button size="md" loading={importing} onClick={() => runImport('categories')}>Categorías</Button>
                        <Button size="md" variant="solid" loading={importing} onClick={() => runImport('products')}>Productos</Button>
                    </div>
                </div>
                <p className="text-sm text-gray-500">Usa el adapter configurado para traer datos del ERP (idempotente).</p>
            </Card>

            <Card>
                <h5 className="mb-3">Mapeo de campos — Productos</h5>
                <MappingEditor entity="product" />
            </Card>
            <Card>
                <h5 className="mb-3">Mapeo de campos — Categorías</h5>
                <MappingEditor entity="category" />
            </Card>

            <Card>
                <h5 className="mb-3">Historial de sincronizaciones</h5>
                <Table>
                    <THead>
                        <Tr className="text-left text-xs text-gray-400">
                            <Th className="py-1">Tipo</Th><Th>Estado</Th><Th>Stats</Th><Th>Fecha</Th>
                        </Tr>
                    </THead>
                    <TBody>
                        {(runs?.data ?? []).slice(0, 15).map((r) => (
                            <Tr key={r.id} className="border-t border-gray-100 dark:border-gray-700">
                                <Td className="py-1.5">{r.kind}</Td>
                                <Td><Tag className={statusTint[r.status] ?? ''}>{r.status}</Tag></Td>
                                <Td className="text-xs text-gray-500">{r.stats ? JSON.stringify(r.stats) : '—'}</Td>
                                <Td className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleString('es-PY')}</Td>
                            </Tr>
                        ))}
                        {(runs?.data ?? []).length === 0 && (
                            <Tr><Td colSpan={4} className="py-3 text-gray-400">Sin sincronizaciones todavía.</Td></Tr>
                        )}
                    </TBody>
                </Table>
            </Card>
        </div>
    )
}

export default ErpSync
