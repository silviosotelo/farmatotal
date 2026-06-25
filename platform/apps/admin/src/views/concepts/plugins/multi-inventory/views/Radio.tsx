import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import Switcher from '@/components/ui/Switcher'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { apiGetPlugin, apiSavePlugin, type PluginField } from '@/services/PluginService'

const GROUP_NAME = 'Envío por radio'

const Radio = () => {
    const [fields, setFields] = useState<PluginField[]>([])
    const [values, setValues] = useState<Record<string, unknown>>({})
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        apiGetPlugin('multi_inventory').then((d) => {
            const groupFields = (d.fields || []).filter((f: PluginField) => f.group === GROUP_NAME)
            setFields(groupFields)
            setValues(d.values || {})
            setLoading(false)
        }).catch(() => setLoading(false))
    }, [])

    const set = (k: string, v: unknown) => setValues((s) => ({ ...s, [k]: v }))

    const save = async () => {
        setSaving(true)
        try {
            await apiSavePlugin('multi_inventory', { values })
            toast.push(<Notification type="success">Guardado</Notification>, { placement: 'top-center' })
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <Card><p className="py-6 text-center text-gray-400">Cargando...</p></Card>

    return (
        <Card>
            <div className="max-w-xl space-y-1">
                {fields.map((f) => {
                    if (f.type === 'toggle') {
                        return (
                            <div key={f.key} className="flex items-center justify-between gap-4 py-2">
                                <span className="text-sm">{f.label}</span>
                                <Switcher checked={!!values[f.key]} onChange={(c) => set(f.key, c)} />
                            </div>
                        )
                    }
                    return (
                        <div key={f.key} className="mb-3">
                            <label className="block text-sm font-medium mb-1">{f.label}</label>
                            {f.type === 'select' ? (
                                <Select
                                    size="md"
                                    options={f.options || []}
                                    value={(f.options || []).find((o) => o.value === values[f.key])}
                                    onChange={(o) => set(f.key, o?.value)}
                                />
                            ) : f.type === 'number' ? (
                                <Input
                                    size="md"
                                    type="number"
                                    value={String(values[f.key] ?? '')}
                                    onChange={(e) => set(f.key, Number(e.target.value))}
                                />
                            ) : (
                                <Input
                                    size="md"
                                    type={f.type === 'password' ? 'password' : 'text'}
                                    value={String(values[f.key] ?? '')}
                                    placeholder={f.placeholder}
                                    onChange={(e) => set(f.key, e.target.value)}
                                />
                            )}
                            {f.help && <p className="mt-1 text-xs text-gray-400">{f.help}</p>}
                        </div>
                    )
                })}
                {fields.length === 0 && <p className="py-6 text-center text-gray-400">No hay campos configurables en este grupo.</p>}
            </div>
            <div className="mt-5">
                <Button variant="solid" loading={saving} onClick={save}>Guardar configuración</Button>
            </div>
        </Card>
    )
}

export default Radio
