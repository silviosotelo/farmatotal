import { useEffect, useMemo, useState } from 'react'
import Card from '@/components/ui/Card'
import Tabs from '@/components/ui/Tabs'
import Tag from '@/components/ui/Tag'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import { FormItem } from '@/components/ui/Form'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Loading from '@/components/shared/Loading'
import { Link } from 'react-router'
import { TbArrowLeft } from 'react-icons/tb'
import useSWR from 'swr'
import { apiGetPlugin, apiSavePlugin, type PluginField } from '@/services/PluginService'

const { TabNav, TabList, TabContent } = Tabs

const VerticalTabs = ({ groups, renderField }: { groups: { group: string; fields: PluginField[] }[]; renderField: (f: PluginField) => React.ReactNode }) => {
    const [active, setActive] = useState(groups[0]?.group || '')
    return (
        <div className="flex flex-col lg:flex-row gap-0">
            <div className="lg:w-52 shrink-0 border-b lg:border-b-0 lg:border-r border-gray-100">
                <nav className="flex lg:flex-col overflow-x-auto">
                    {groups.map((g) => (
                        <button
                            key={g.group}
                            onClick={() => setActive(g.group)}
                            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition border-b-2 lg:border-b-0 lg:border-l-2 text-left ${
                                active === g.group
                                    ? 'border-primary text-primary bg-primary/5'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            {g.group}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="flex-1 p-6">
                {groups.filter((g) => g.group === active).map((g) => (
                    <div key={g.group} className="max-w-xl space-y-1">{g.fields.map(renderField)}</div>
                ))}
            </div>
        </div>
    )
}

/**
 * Vista de configuración reutilizable por plugin (cada plugin tiene su propia
 * ruta/vista que monta este componente con su `pluginKey`). Renderiza los
 * campos agrupados en tabs según la definición del backend.
 */
const PluginConfig = ({ pluginKey, embedded = false, layout = 'horizontal' }: { pluginKey: string; embedded?: boolean; layout?: 'horizontal' | 'vertical' }) => {
    const { data, isLoading, mutate } = useSWR(['/plugins', pluginKey], () => apiGetPlugin(pluginKey), {
        revalidateOnFocus: false,
    })
    const [enabled, setEnabled] = useState(false)
    const [values, setValues] = useState<Record<string, unknown>>({})
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (data) {
            setEnabled(data.enabled)
            setValues(data.values ?? {})
        }
    }, [data])

    const groups = useMemo(() => {
        const fields = data?.fields ?? []
        const order: string[] = []
        const byGroup: Record<string, PluginField[]> = {}
        for (const f of fields) {
            if (!byGroup[f.group]) {
                byGroup[f.group] = []
                order.push(f.group)
            }
            byGroup[f.group].push(f)
        }
        return order.map((g) => ({ group: g, fields: byGroup[g] }))
    }, [data])

    const set = (k: string, v: unknown) => setValues((s) => ({ ...s, [k]: v }))

    const save = async () => {
        setSaving(true)
        try {
            await apiSavePlugin(pluginKey, { enabled, values })
            await mutate()
            toast.push(<Notification type="success">{data?.name} guardado</Notification>, { placement: 'top-center' })
        } finally {
            setSaving(false)
        }
    }

    const renderField = (f: PluginField) => {
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
                <FormItem label={f.label}>
                    {f.type === 'select' ? (
                    <Select
                        size="md"
                        options={f.options ?? []}
                        value={(f.options ?? []).find((o) => o.value === values[f.key])}
                        onChange={(o) => set(f.key, o?.value)}
                    />
                ) : (
                    <Input
                        size="md"
                        type={f.type === 'password' ? 'password' : 'text'}
                        value={(values[f.key] as string) ?? ''}
                        placeholder={f.placeholder}
                        onChange={(e) => set(f.key, e.target.value)}
                    />
                )}
                {f.help && <p className="mt-1 text-xs text-gray-400">{f.help}</p>}
                </FormItem>
            </div>
        )
    }

    return (
        <Loading loading={isLoading}>
            <div className="flex flex-col gap-4">
                {embedded ? (
                    <div className="flex items-center justify-end gap-2">
                        <span className="text-sm text-gray-400">Activar plugin</span>
                        <Switcher checked={enabled} onChange={setEnabled} />
                    </div>
                ) : (
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <Link to="/concepts/modules" className="text-gray-400 hover:text-primary">
                                    <TbArrowLeft className="text-xl" />
                                </Link>
                                <h3 className="mb-0">{data?.name}</h3>
                                <Tag className={enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}>
                                    {enabled ? 'Activo' : 'Inactivo'}
                                </Tag>
                            </div>
                            <p className="mt-1 text-gray-500">{data?.description}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm text-gray-400">Activar plugin</span>
                            <Switcher checked={enabled} onChange={setEnabled} />
                        </div>
                    </div>
                )}

                <Card>
                    {groups.length === 0 ? (
                        <p className="py-6 text-center text-gray-400">Este plugin no tiene parámetros de configuración.</p>
                    ) : groups.length === 1 ? (
                        <div className="max-w-xl">{groups[0].fields.map(renderField)}</div>
                    ) : layout === 'vertical' ? (
                        <VerticalTabs groups={groups} renderField={renderField} />
                    ) : (
                        <Tabs defaultValue={groups[0].group}>
                            <TabList>
                                {groups.map((g) => (
                                    <TabNav key={g.group} value={g.group}>{g.group}</TabNav>
                                ))}
                            </TabList>
                            <div className="mt-6">
                                {groups.map((g) => (
                                    <TabContent key={g.group} value={g.group}>
                                        <div className="max-w-xl">{g.fields.map(renderField)}</div>
                                    </TabContent>
                                ))}
                            </div>
                        </Tabs>
                    )}
                    <div className="mt-5">
                        <Button variant="solid" loading={saving} onClick={save}>Guardar configuración</Button>
                    </div>
                </Card>
            </div>
        </Loading>
    )
}

export default PluginConfig
