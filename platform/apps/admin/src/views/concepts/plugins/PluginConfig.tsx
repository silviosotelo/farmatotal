import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Menu from '@/components/ui/Menu'
import ScrollBar from '@/components/ui/ScrollBar'
import ToggleDrawer from '@/components/shared/ToggleDrawer'
import Tag from '@/components/ui/Tag'
import Switcher from '@/components/ui/Switcher'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Loading from '@/components/shared/Loading'
import useResponsive from '@/utils/hooks/useResponsive'
import useSWR from 'swr'
import { apiGetPlugin, apiSavePlugin, type PluginField } from '@/services/PluginService'
import type { ToggleDrawerRef } from '@/components/shared/ToggleDrawer'
import type { ReactNode } from 'react'
import {
    TbSettings,
    TbKey,
    TbCreditCard,
    TbRepeat,
    TbQrcode,
    TbLink,
    TbMail,
    TbTruck,
    TbEye,
    TbAdjustments,
    TbPuzzle,
} from 'react-icons/tb'

const { MenuItem } = Menu

const GROUP_ICONS: Record<string, ReactNode> = {}

/** Extrae iconos de react-icons/tb según el group name */
function getGroupIcon(group: string): ReactNode {
    if (GROUP_ICONS[group]) return GROUP_ICONS[group]
    const g = group.toLowerCase()
    if (g.includes('general') || g.includes('config')) return <TbSettings />
    if (g.includes('credential') || g.includes('credencial')) return <TbKey />
    if (g.includes('payment') || g.includes('pago')) return <TbCreditCard />
    if (g.includes('recurring') || g.includes('recurrente')) return <TbRepeat />
    if (g.includes('qr')) return <TbQrcode />
    if (g.includes('webhook')) return <TbLink />
    if (g.includes('email') || g.includes('correo')) return <TbMail />
    if (g.includes('shipping') || g.includes('envío')) return <TbTruck />
    if (g.includes('display') || g.includes('visual')) return <TbEye />
    if (g.includes('advanced') || g.includes('avanzado')) return <TbAdjustments />
    return <TbPuzzle />
}

/** Renderiza un campo del plugin según su tipo */
function PluginFieldRenderer({
    field,
    value,
    onChange,
}: {
    field: PluginField
    value: unknown
    onChange: (v: unknown) => void
}) {
    if (field.type === 'toggle') {
        return (
            <div key={field.key} className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
                <div>
                    <span className="text-sm font-medium">{field.label}</span>
                    {field.help && <p className="text-xs text-gray-400 mt-0.5">{field.help}</p>}
                </div>
                <Switcher checked={!!value} onChange={(c) => onChange(c)} />
            </div>
        )
    }
    if (field.type === 'select') {
        return (
            <div key={field.key} className="mb-4">
                <label className="block text-sm font-medium mb-1.5">{field.label}</label>
                <select
                    value={String(value ?? '')}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:border-gray-600"
                >
                    <option value="">Seleccionar...</option>
                    {(field.options ?? []).map((o) => (
                        <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
                    ))}
                </select>
                {field.help && <p className="mt-1 text-xs text-gray-400">{field.help}</p>}
            </div>
        )
    }
    return (
        <div key={field.key} className="mb-4">
            <label className="block text-sm font-medium mb-1.5">{field.label}</label>
            <input
                type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
                value={String(value ?? '')}
                placeholder={field.placeholder}
                onChange={(e) => onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:border-gray-600"
            />
            {field.help && <p className="mt-1 text-xs text-gray-400">{field.help}</p>}
        </div>
    )
}

/**
 * PluginConfig — Componente estándar de configuración para TODOS los plugins.
 * Patrón Ecme Settings: AdaptiveCard + Menu sidebar + responsive drawer.
 *
 * Uso: <PluginConfig pluginKey="gw_bancard" />
 * El plugin_key se usa para fetchear configSchema y values de la API.
 */
const PluginConfig = ({ pluginKey }: { pluginKey: string }) => {
    const { data, isLoading, mutate } = useSWR(['/plugins', pluginKey], () => apiGetPlugin(pluginKey), {
        revalidateOnFocus: false,
    })
    const [enabled, setEnabled] = useState(false)
    const [values, setValues] = useState<Record<string, unknown>>({})
    const [saving, setSaving] = useState(false)
    const [currentGroup, setCurrentGroup] = useState('')
    const drawerRef = useRef<ToggleDrawerRef>(null)
    const { smaller, larger } = useResponsive()

    useEffect(() => {
        if (data) {
            setEnabled(data.enabled)
            setValues(data.values ?? {})
            if (!currentGroup && groups.length > 0) {
                setCurrentGroup(groups[0].group)
            }
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

    const activeFields = groups.find((g) => g.group === currentGroup)?.fields ?? []

    if (isLoading) {
        return <Loading loading />
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
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

            {/* Content — Ecme Settings pattern */}
            <AdaptiveCard className="h-full">
                <div className="flex flex-auto h-full">
                    {/* Desktop sidebar */}
                    {larger.lg && groups.length > 1 && (
                        <div className="w-[200px] xl:w-[280px]">
                            <div className="flex flex-col justify-between h-full">
                                <ScrollBar className="h-full overflow-y-auto">
                                    <Menu className="mx-2 mb-10">
                                        {groups.map((g) => (
                                            <MenuItem
                                                key={g.group}
                                                eventKey={g.group}
                                                className={`mb-2 ${
                                                    currentGroup === g.group
                                                        ? 'bg-gray-100 dark:bg-gray-700'
                                                        : ''
                                                }`}
                                                isActive={currentGroup === g.group}
                                                onSelect={() => setCurrentGroup(g.group)}
                                            >
                                                <span className="text-2xl ltr:mr-2 rtl:ml-2">
                                                    {getGroupIcon(g.group)}
                                                </span>
                                                <span>{g.group}</span>
                                            </MenuItem>
                                        ))}
                                    </Menu>
                                </ScrollBar>
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    <div className="xl:ltr:pl-6 xl:rtl:pr-6 flex-1 py-2">
                        {/* Mobile menu */}
                        {smaller.lg && groups.length > 1 && (
                            <div className="mb-6">
                                <ToggleDrawer ref={drawerRef} title="Configuración">
                                    <div className="py-2">
                                        {groups.map((g) => (
                                            <button
                                                key={g.group}
                                                onClick={() => {
                                                    setCurrentGroup(g.group)
                                                    drawerRef.current?.handleCloseDrawer()
                                                }}
                                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left rounded-lg transition ${
                                                    currentGroup === g.group
                                                        ? 'bg-gray-100 dark:bg-gray-700 font-medium'
                                                        : 'hover:bg-gray-50'
                                                }`}
                                            >
                                                <span className="text-lg">{getGroupIcon(g.group)}</span>
                                                {g.group}
                                            </button>
                                        ))}
                                    </div>
                                </ToggleDrawer>
                            </div>
                        )}

                        {/* Fields */}
                        {groups.length === 0 ? (
                            <p className="py-12 text-center text-gray-400">Este plugin no tiene parámetros de configuración.</p>
                        ) : (
                            <div className="max-w-xl">
                                {activeFields.map((f) => (
                                    <PluginFieldRenderer
                                        key={f.key}
                                        field={f}
                                        value={values[f.key]}
                                        onChange={(v) => set(f.key, v)}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Save */}
                        <div className="mt-5">
                            <Button variant="solid" loading={saving} onClick={save}>Guardar configuración</Button>
                        </div>
                    </div>
                </div>
            </AdaptiveCard>
        </div>
    )
}

export default PluginConfig
