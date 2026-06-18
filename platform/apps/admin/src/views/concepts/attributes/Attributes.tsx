import { useEffect, useState } from 'react'
import useSWR from 'swr'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Tag from '@/components/ui/Tag'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Loading from '@/components/shared/Loading'
import EmptyState from '@/components/shared/EmptyState'
import { HiOutlineTrash, HiOutlinePlus } from 'react-icons/hi'
import { apiGetAttributes, apiSaveAttributes, type GlobalAttribute } from '@/services/AttributeService'

const slug = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'attr'

const Attributes = () => {
    const { data, isLoading, mutate } = useSWR('/attributes', apiGetAttributes, { revalidateOnFocus: false })
    const [attrs, setAttrs] = useState<GlobalAttribute[]>([])
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (data) setAttrs(data.attributes)
    }, [data])

    const setName = (i: number, name: string) =>
        setAttrs((a) => a.map((x, k) => (k === i ? { ...x, name } : x)))
    const setValues = (i: number, raw: string) =>
        setAttrs((a) =>
            a.map((x, k) =>
                k === i ? { ...x, values: raw.split(',').map((s) => s.trim()).filter(Boolean) } : x,
            ),
        )
    const add = () => setAttrs((a) => [...a, { id: `attr${a.length + 1}`, name: '', values: [] }])
    const remove = (i: number) => setAttrs((a) => a.filter((_, k) => k !== i))

    const save = async () => {
        setSaving(true)
        try {
            const clean = attrs
                .filter((a) => a.name.trim())
                .map((a) => ({ ...a, id: a.id || slug(a.name) }))
            await apiSaveAttributes({ attributes: clean })
            await mutate()
            toast.push(<Notification type="success">Atributos guardados</Notification>, { placement: 'top-center' })
        } finally {
            setSaving(false)
        }
    }

    return (
        <Loading loading={isLoading}>
            <div className="flex flex-col gap-4">
                <div>
                    <h3 className="mb-1">Atributos globales</h3>
                    <p className="text-gray-500">
                        Definí atributos reutilizables (color, talle, presentación…) para generar variantes
                        más rápido. Se usan en el generador de variantes del producto.
                    </p>
                </div>

                <Card>
                    <div className="flex flex-col gap-3">
                        {attrs.map((a, i) => (
                            <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start border-b pb-3 last:border-0">
                                <div className="md:col-span-3">
                                    <label className="text-sm">Atributo</label>
                                    <Input value={a.name} onChange={(e) => setName(i, e.target.value)} placeholder="Color" />
                                </div>
                                <div className="md:col-span-8">
                                    <label className="text-sm">Valores (separados por coma)</label>
                                    <Input
                                        defaultValue={a.values.join(', ')}
                                        onBlur={(e) => setValues(i, e.target.value)}
                                        placeholder="Rojo, Azul, Verde"
                                    />
                                    {a.values.length > 0 && (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {a.values.map((v) => (
                                                <Tag key={v} className="bg-indigo-50 text-indigo-600">{v}</Tag>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="md:col-span-1 pt-6 text-right">
                                    <Button size="sm" variant="plain" icon={<HiOutlineTrash />} onClick={() => remove(i)} />
                                </div>
                            </div>
                        ))}
                        {attrs.length === 0 && (
                            <EmptyState
                                compact
                                title="Aún no hay atributos"
                                description="Creá atributos reutilizables como Color o Talle para acelerar la generación de variantes."
                            />
                        )}
                        <div>
                            <Button size="sm" icon={<HiOutlinePlus />} onClick={add}>
                                Agregar atributo
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

export default Attributes
