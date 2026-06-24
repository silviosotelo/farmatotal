import { useEffect, useState } from 'react'
import useSWR from 'swr'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Switcher from '@/components/ui/Switcher'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import Loading from '@/components/shared/Loading'
import Tag from '@/components/ui/Tag'
import { HiOutlineTrash, HiOutlinePlus, HiOutlineArrowUp, HiOutlineArrowDown } from 'react-icons/hi'
import {
    apiGetEntityFields,
    apiSaveEntityFields,
    type EntityField,
    type EntityFieldsConfig,
} from '@/services/EntityFieldsService'
import { slug } from '@/utils/slug'

const selCls = 'h-9 rounded-md border border-gray-200 dark:border-gray-600 bg-transparent px-2 text-sm w-full'

/** Editor genérico de campos por entidad. Reutiliza el patrón del checkout. */
const EntityFieldsEditor = ({
    settingsKey,
    title,
    description,
    defaultFields,
}: {
    settingsKey: string
    title: string
    description: string
    defaultFields: EntityField[]
}) => {
    const { data, isLoading, mutate } = useSWR(['/cms/settings', settingsKey], () => apiGetEntityFields(settingsKey), {
        revalidateOnFocus: false,
    })
    const [fields, setFields] = useState<EntityField[]>([])
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!data) return
        // Si no hay config, se siembran los builtin por defecto. Si hay, se fusionan
        // los builtin faltantes (por si se agregó un nativo nuevo en una versión).
        if (!data.fields.length) {
            setFields(defaultFields)
            return
        }
        const present = new Set(data.fields.map((f) => f.key))
        const missingBuiltins = defaultFields.filter((f) => !present.has(f.key))
        setFields([...data.fields, ...missingBuiltins])
    }, [data, defaultFields])

    const patch = (i: number, p: Partial<EntityField>) => setFields((f) => f.map((x, k) => (k === i ? { ...x, ...p } : x)))
    const add = () =>
        setFields((f) => [...f, { key: '', label: '', type: 'text', required: false, width: 'half', enabled: true }])
    const remove = (i: number) => setFields((f) => f.filter((_, k) => k !== i))
    const move = (i: number, dir: -1 | 1) =>
        setFields((f) => {
            const j = i + dir
            if (j < 0 || j >= f.length) return f
            const c = [...f]
            ;[c[i], c[j]] = [c[j], c[i]]
            return c
        })

    const save = async () => {
        setSaving(true)
        try {
            const clean: EntityFieldsConfig = {
                fields: fields
                    .filter((f) => f.label.trim())
                    .map((f) => ({
                        ...f,
                        key: f.key || slug(f.label),
                        enabled: f.enabled !== false,
                        options: f.type === 'select' && f.options?.length ? f.options.map((o) => o.trim()).filter(Boolean) : undefined,
                    })),
            }
            await apiSaveEntityFields(settingsKey, clean)
            await mutate()
            toast.push(<Notification type="success">Campos guardados</Notification>, { placement: 'top-center' })
        } finally {
            setSaving(false)
        }
    }

    return (
        <Loading loading={isLoading}>
            <div className="flex flex-col gap-4">
                <div>
                    <h3 className="mb-1">{title}</h3>
                    <p className="text-gray-500">{description}</p>
                </div>

                <Card>
                    <div className="flex flex-col gap-3">
                        <div className="hidden lg:grid grid-cols-12 gap-2 text-xs text-gray-400">
                            <span className="col-span-3">Etiqueta</span>
                            <span className="col-span-3">Clave / Tipo</span>
                            <span className="col-span-2">Ancho</span>
                            <span className="col-span-1">Activo</span>
                            <span className="col-span-1">Oblig.</span>
                            <span className="col-span-2 text-right">Acciones</span>
                        </div>

                        {fields.map((f, i) => (
                            <div key={i} className="grid grid-cols-12 items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-3 lg:border-0 lg:pb-0">
                                <div className="col-span-12 lg:col-span-3">
                                    <Input value={f.label} onChange={(e) => patch(i, { label: e.target.value })} placeholder="Ej. Principio activo" />
                                </div>
                                <div className="col-span-6 lg:col-span-3 flex items-center gap-2">
                                    {f.builtin ? (
                                        <>
                                            <Tag className="bg-gray-100 text-gray-500">Nativo</Tag>
                                            <span className="text-xs text-gray-400 truncate">{f.key}</span>
                                        </>
                                    ) : (
                                        <Select
                                            options={[
                                                { value: 'text', label: 'Texto' },
                                                { value: 'number', label: 'Número' },
                                                { value: 'email', label: 'Email' },
                                                { value: 'tel', label: 'Teléfono' },
                                                { value: 'textarea', label: 'Texto largo' },
                                                { value: 'select', label: 'Lista' },
                                                { value: 'boolean', label: 'Sí/No' },
                                                { value: 'date', label: 'Fecha' },
                                            ]}
                                            value={{ value: f.type, label: f.type }}
                                            onChange={(o) => patch(i, { type: (o?.value as EntityField['type']) ?? 'text' })}
                                        />
                                    )}
                                </div>
                                <div className="col-span-6 lg:col-span-2">
                                    <Select
                                        options={[
                                            { value: 'half', label: 'Media columna' },
                                            { value: 'full', label: 'Línea completa' },
                                        ]}
                                        value={{ value: f.width, label: f.width === 'half' ? 'Media columna' : 'Línea completa' }}
                                        onChange={(o) => patch(i, { width: (o?.value as EntityField['width']) ?? 'half' })}
                                    />
                                </div>
                                <div className="col-span-3 lg:col-span-1">
                                    <Switcher checked={f.enabled !== false} onChange={(c) => patch(i, { enabled: c })} />
                                </div>
                                <div className="col-span-3 lg:col-span-1">
                                    <Switcher checked={f.required} onChange={(c) => patch(i, { required: c })} />
                                </div>
                                <div className="col-span-6 lg:col-span-2 flex items-center justify-end gap-1">
                                    <Button size="xs" variant="plain" icon={<HiOutlineArrowUp />} disabled={i === 0} onClick={() => move(i, -1)} />
                                    <Button size="xs" variant="plain" icon={<HiOutlineArrowDown />} disabled={i === fields.length - 1} onClick={() => move(i, 1)} />
                                    {!f.builtin && <Button size="xs" variant="plain" icon={<HiOutlineTrash />} onClick={() => remove(i)} />}
                                </div>
                                {f.type === 'select' && !f.builtin && (
                                    <div className="col-span-12">
                                        <Input
                                            value={(f.options ?? []).join(', ')}
                                            onChange={(e) => patch(i, { options: e.target.value.split(',').map((s) => s.trim()) })}
                                            placeholder="Opciones separadas por coma"
                                        />
                                    </div>
                                )}
                            </div>
                        ))}

                        <div className="flex gap-2">
                            <Button size="sm" icon={<HiOutlinePlus />} onClick={add}>Agregar campo</Button>
                            <Button size="sm" variant="plain" onClick={() => setFields(defaultFields)}>Restaurar por defecto</Button>
                        </div>
                    </div>
                </Card>

                <div>
                    <Button variant="solid" loading={saving} onClick={save}>Guardar</Button>
                </div>
            </div>
        </Loading>
    )
}

export default EntityFieldsEditor
