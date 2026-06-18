import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Loading from '@/components/shared/Loading'
import useSWR from 'swr'
import {
    apiGetShippingConfig,
    apiSaveShippingConfig,
    type ShippingConfig,
    type ShippingZone,
    type ShippingMethod,
} from '@/services/ShippingService'

const typeOptions = [
    { value: 'flat', label: 'Tarifa fija' },
    { value: 'free', label: 'Gratis (desde monto)' },
    { value: 'pickup', label: 'Retiro en sucursal' },
    { value: 'weight', label: 'Por peso (kg)' },
]

const uid = () => Math.random().toString(36).slice(2, 9)

const Shipping = () => {
    const { data, isLoading, mutate } = useSWR(['/shipping/config'], () => apiGetShippingConfig(), { revalidateOnFocus: false })
    const [cfg, setCfg] = useState<ShippingConfig>({ zones: [] })
    const [saving, setSaving] = useState(false)
    useEffect(() => { if (data) setCfg(data) }, [data])

    const addZone = () => setCfg((c) => ({ zones: [...c.zones, { id: uid(), name: 'Nueva zona', cities: [], methods: [] }] }))
    const removeZone = (zid: string) => setCfg((c) => ({ zones: c.zones.filter((z) => z.id !== zid) }))
    const patchZone = (zid: string, patch: Partial<ShippingZone>) =>
        setCfg((c) => ({ zones: c.zones.map((z) => (z.id === zid ? { ...z, ...patch } : z)) }))
    const addMethod = (zid: string) =>
        patchZoneMethods(zid, (ms) => [...ms, { id: uid(), name: 'Método', type: 'flat', cost: 0, freeFrom: 0, perKg: 0, active: true }])
    const patchZoneMethods = (zid: string, fn: (ms: ShippingMethod[]) => ShippingMethod[]) =>
        setCfg((c) => ({ zones: c.zones.map((z) => (z.id === zid ? { ...z, methods: fn(z.methods) } : z)) }))
    const patchMethod = (zid: string, mid: string, patch: Partial<ShippingMethod>) =>
        patchZoneMethods(zid, (ms) => ms.map((m) => (m.id === mid ? { ...m, ...patch } : m)))
    const removeMethod = (zid: string, mid: string) => patchZoneMethods(zid, (ms) => ms.filter((m) => m.id !== mid))

    const save = async () => {
        setSaving(true)
        try {
            await apiSaveShippingConfig(cfg)
            await mutate()
            toast.push(<Notification type="success">Envíos guardado</Notification>, { placement: 'top-center' })
        } finally {
            setSaving(false)
        }
    }

    return (
        <Loading loading={isLoading}>
            <div className="flex flex-col gap-4">
                <div className="flex items-end justify-between">
                    <div>
                        <h3 className="mb-1">Envíos</h3>
                        <p className="text-gray-500">Zonas de envío, tipos y lógica de tarifas. Es nativo.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={addZone}>Agregar zona</Button>
                        <Button variant="solid" loading={saving} onClick={save}>Guardar</Button>
                    </div>
                </div>

                {cfg.zones.length === 0 && (
                    <Card><p className="py-6 text-center text-gray-400">Sin zonas. Agregá una para empezar.</p></Card>
                )}

                {cfg.zones.map((z) => (
                    <Card key={z.id}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="text-sm">Nombre de la zona</label>
                                <Input value={z.name} onChange={(e) => patchZone(z.id, { name: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-sm">Ciudades (separadas por coma)</label>
                                <Input
                                    value={z.cities.join(', ')}
                                    onChange={(e) => patchZone(z.id, { cities: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                                    placeholder="Asunción, Luque, San Lorenzo"
                                />
                            </div>
                        </div>

                        <div className="rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between px-3 py-2 border-b">
                                <span className="text-sm font-medium">Métodos de envío</span>
                                <Button size="xs" onClick={() => addMethod(z.id)}>+ Método</Button>
                            </div>
                            {z.methods.length === 0 ? (
                                <p className="px-3 py-3 text-sm text-gray-400">Sin métodos en esta zona.</p>
                            ) : (
                                <div className="divide-y">
                                    {z.methods.map((m) => (
                                        <div key={m.id} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end px-3 py-3">
                                            <div className="col-span-2 md:col-span-1">
                                                <label className="text-xs text-gray-400">Nombre</label>
                                                <Input size="sm" value={m.name} onChange={(e) => patchMethod(z.id, m.id, { name: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-400">Tipo</label>
                                                <Select size="sm" options={typeOptions} value={typeOptions.find((o) => o.value === m.type)} onChange={(o) => patchMethod(z.id, m.id, { type: (o?.value as ShippingMethod['type']) ?? 'flat' })} />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-400">Costo (₲)</label>
                                                <Input size="sm" type="number" value={m.cost} onChange={(e) => patchMethod(z.id, m.id, { cost: Number(e.target.value) })} />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-400">Gratis desde (₲)</label>
                                                <Input size="sm" type="number" value={m.freeFrom} onChange={(e) => patchMethod(z.id, m.id, { freeFrom: Number(e.target.value) })} />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-400">$/kg</label>
                                                <Input size="sm" type="number" value={m.perKg} onChange={(e) => patchMethod(z.id, m.id, { perKg: Number(e.target.value) })} />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Switcher checked={m.active} onChange={(c) => patchMethod(z.id, m.id, { active: c })} />
                                                <Button size="xs" variant="plain" onClick={() => removeMethod(z.id, m.id)}>✕</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-3 text-right">
                            <Button size="xs" variant="plain" onClick={() => removeZone(z.id)}>Eliminar zona</Button>
                        </div>
                    </Card>
                ))}
            </div>
        </Loading>
    )
}

export default Shipping
