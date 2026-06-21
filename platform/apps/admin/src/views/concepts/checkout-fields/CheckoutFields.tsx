import { useEffect, useState } from 'react'
import useSWR from 'swr'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Switcher from '@/components/ui/Switcher'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Loading from '@/components/shared/Loading'
import EmptyState from '@/components/shared/EmptyState'
import { HiOutlineTrash, HiOutlinePlus, HiOutlineArrowUp, HiOutlineArrowDown } from 'react-icons/hi'
import {
    apiGetCheckoutFields,
    apiSaveCheckoutFields,
    type CheckoutField,
    type CheckoutFieldsConfig,
} from '@/services/CheckoutFieldsService'

const slug = (s: string) =>
    s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)/g, '') || 'campo'

const selCls =
    'h-9 rounded-md border border-gray-200 dark:border-gray-600 bg-transparent px-2 text-sm w-full'

const CheckoutFields = () => {
    const { data, isLoading, mutate } = useSWR('/cms/settings/mod_checkout', apiGetCheckoutFields, {
        revalidateOnFocus: false,
    })
    const [fields, setFields] = useState<CheckoutField[]>([])
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (data) setFields(data.fields)
    }, [data])

    const patch = (i: number, p: Partial<CheckoutField>) =>
        setFields((f) => f.map((x, k) => (k === i ? { ...x, ...p } : x)))
    const add = () =>
        setFields((f) => [...f, { key: '', label: '', type: 'text', required: false, width: 'half' }])
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
            const clean: CheckoutFieldsConfig = {
                fields: fields
                    .filter((f) => f.label.trim())
                    .map((f) => ({
                        ...f,
                        key: f.key || slug(f.label),
                        options:
                            f.type === 'select' && f.options?.length ? f.options.map((o) => o.trim()).filter(Boolean) : undefined,
                    })),
            }
            await apiSaveCheckoutFields(clean)
            await mutate()
            toast.push(<Notification type="success">Campos del checkout guardados</Notification>, { placement: 'top-center' })
        } finally {
            setSaving(false)
        }
    }

    return (
        <Loading loading={isLoading}>
            <div className="flex flex-col gap-4">
                <div>
                    <h3 className="mb-1">Campos del checkout</h3>
                    <p className="text-gray-500">
                        Configurá los campos adicionales del formulario de compra: etiqueta, tipo, si es obligatorio y
                        el ancho (línea completa o media columna). El orden de la lista define el orden en el checkout.
                    </p>
                </div>

                <Card>
                    <div className="flex flex-col gap-3">
                        <div className="hidden md:grid grid-cols-12 gap-2 text-xs text-gray-400">
                            <span className="col-span-4">Etiqueta</span>
                            <span className="col-span-2">Tipo</span>
                            <span className="col-span-2">Ancho</span>
                            <span className="col-span-2">Obligatorio</span>
                            <span className="col-span-2 text-right">Acciones</span>
                        </div>

                        {fields.map((f, i) => (
                            <div key={i} className="grid grid-cols-12 items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-3 md:border-0 md:pb-0">
                                <div className="col-span-12 md:col-span-4">
                                    <Input
                                        value={f.label}
                                        onChange={(e) => patch(i, { label: e.target.value })}
                                        placeholder="Ej. RUC / CI"
                                    />
                                </div>
                                <div className="col-span-6 md:col-span-2">
                                    <select className={selCls} value={f.type} onChange={(e) => patch(i, { type: e.target.value as CheckoutField['type'] })}>
                                        <option value="text">Texto</option>
                                        <option value="textarea">Texto largo</option>
                                        <option value="select">Lista</option>
                                    </select>
                                </div>
                                <div className="col-span-6 md:col-span-2">
                                    <select className={selCls} value={f.width} onChange={(e) => patch(i, { width: e.target.value as CheckoutField['width'] })}>
                                        <option value="half">Media columna</option>
                                        <option value="full">Línea completa</option>
                                    </select>
                                </div>
                                <div className="col-span-6 md:col-span-2">
                                    <Switcher checked={f.required} onChange={(c) => patch(i, { required: c })} />
                                </div>
                                <div className="col-span-6 md:col-span-2 flex items-center justify-end gap-1">
                                    <Button size="xs" variant="plain" icon={<HiOutlineArrowUp />} disabled={i === 0} onClick={() => move(i, -1)} />
                                    <Button size="xs" variant="plain" icon={<HiOutlineArrowDown />} disabled={i === fields.length - 1} onClick={() => move(i, 1)} />
                                    <Button size="xs" variant="plain" icon={<HiOutlineTrash />} onClick={() => remove(i)} />
                                </div>
                                {f.type === 'select' && (
                                    <div className="col-span-12">
                                        <Input
                                            value={(f.options ?? []).join(', ')}
                                            onChange={(e) => patch(i, { options: e.target.value.split(',').map((s) => s.trim()) })}
                                            placeholder="Opciones separadas por coma (ej. Casa, Trabajo, Otro)"
                                        />
                                    </div>
                                )}
                            </div>
                        ))}

                        {fields.length === 0 && (
                            <EmptyState compact title="Sin campos custom" description="Agregá campos adicionales para el checkout (RUC/CI, referencias, notas, etc.)." />
                        )}

                        <div>
                            <Button size="sm" icon={<HiOutlinePlus />} onClick={add}>
                                Agregar campo
                            </Button>
                        </div>
                    </div>
                </Card>

                <div>
                    <Button variant="solid" loading={saving} onClick={save}>
                        Guardar
                    </Button>
                </div>
            </div>
        </Loading>
    )
}

export default CheckoutFields
