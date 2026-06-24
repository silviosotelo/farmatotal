import { useState } from 'react'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Checkbox from '@/components/ui/Checkbox'
import { FormItem } from '@/components/ui/Form'
import Loading from '@/components/shared/Loading'
import {
    apiGetBranches,
    apiCreateBranch,
    apiUpdateBranch,
    type Branch,
} from '@/services/BranchService'
import { useTenantFlags } from '@/services/features'
import PlainCustomFields from '@/views/concepts/entity-fields/PlainCustomFields'
import useSWR from 'swr'

type BranchForm = {
    id?: string
    code: string
    erpCode: string
    name: string
    address: string
    city: string
    phone: string
    lat: string
    lng: string
    pickupEnabled: boolean
    deliveryEnabled: boolean
    active: boolean
    custom: Record<string, unknown>
}

const emptyForm: BranchForm = {
    code: '',
    erpCode: '',
    name: '',
    address: '',
    city: '',
    phone: '',
    lat: '',
    lng: '',
    pickupEnabled: true,
    deliveryEnabled: false,
    active: true,
    custom: {},
}

const Branches = () => {
    const flags = useTenantFlags()
    const { data, isLoading, mutate } = useSWR(['/branches'], () => apiGetBranches(), {
        revalidateOnFocus: false,
    })
    const branches = (data?.data ?? []) as Branch[]

    const [form, setForm] = useState<BranchForm | null>(null)
    const [saving, setSaving] = useState(false)
    const [busyId, setBusyId] = useState<string | null>(null)

    const set = <K extends keyof BranchForm>(k: K, v: BranchForm[K]) =>
        setForm((f) => (f ? { ...f, [k]: v } : f))

    const openNew = () => setForm({ ...emptyForm })
    const openEdit = (b: Branch) =>
        setForm({
            id: b.id,
            code: b.code,
            erpCode: b.erpCode ?? '',
            name: b.name,
            address: b.address ?? '',
            city: b.city ?? '',
            phone: b.phone ?? '',
            lat: '',
            lng: '',
            pickupEnabled: b.pickupEnabled,
            deliveryEnabled: b.deliveryEnabled,
            active: b.active,
            custom: (b.custom as Record<string, unknown>) ?? {},
        })

    const save = async () => {
        if (!form || !form.code.trim() || !form.name.trim()) return
        setSaving(true)
        try {
            const payload = {
                code: form.code.trim(),
                erpCode: form.erpCode.trim() || null,
                name: form.name.trim(),
                address: form.address.trim() || null,
                city: form.city.trim() || null,
                phone: form.phone.trim() || null,
                lat: form.lat ? Number(form.lat) : null,
                lng: form.lng ? Number(form.lng) : null,
                pickupEnabled: form.pickupEnabled,
                deliveryEnabled: form.deliveryEnabled,
                active: form.active,
                custom: form.custom && Object.keys(form.custom).length ? form.custom : null,
            }
            if (form.id) await apiUpdateBranch(form.id, payload)
            else await apiCreateBranch(payload)
            setForm(null)
            await mutate()
        } finally {
            setSaving(false)
        }
    }

    const toggleActive = async (b: Branch) => {
        setBusyId(b.id)
        try {
            await apiUpdateBranch(b.id, { active: !b.active })
            await mutate()
        } finally {
            setBusyId(null)
        }
    }

    if (!flags.branches) {
        return (
            <Card>
                <h3 className="mb-1">Sucursales</h3>
                <p>Función no habilitada para esta tienda.</p>
            </Card>
        )
    }

    return (
        <Loading loading={isLoading}>
            <div className="flex flex-col gap-4">
                <div className="flex items-end justify-between">
                    <div>
                        <h3 className="mb-1">Sucursales</h3>
                        <p className="text-gray-500">
                            {branches.length} sucursales · inventario por sucursal
                        </p>
                    </div>
                    {!form && (
                        <Button variant="solid" onClick={openNew}>
                            Nueva sucursal
                        </Button>
                    )}
                </div>

                {form && (
                    <Card>
                        <h6 className="mb-3">
                            {form.id ? 'Editar sucursal' : 'Nueva sucursal'}
                        </h6>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <FormItem label="Código *">
                                    <Input value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="SUC-01" />
                                </FormItem>
                            </div>
                            <div>
                                <FormItem label="Nombre *">
                                    <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Casa Central" />
                                </FormItem>
                            </div>
                            <div>
                                <FormItem label="Código ERP">
                                    <Input value={form.erpCode} onChange={(e) => set('erpCode', e.target.value)} placeholder="STK_SUCURSAL (ej. 1)" />
                                </FormItem>
                                <p className="mt-1 text-xs text-gray-400">
                                    Código de la sucursal en el ERP (para stock en vivo). Dato operativo.
                                </p>
                            </div>
                            <div className="md:col-span-2">
                                <FormItem label="Dirección">
                                    <Input value={form.address} onChange={(e) => set('address', e.target.value)} />
                                </FormItem>
                            </div>
                            <div>
                                <FormItem label="Ciudad">
                                    <Input value={form.city} onChange={(e) => set('city', e.target.value)} />
                                </FormItem>
                            </div>
                            <div>
                                <FormItem label="Teléfono">
                                    <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                                </FormItem>
                            </div>
                            <div>
                                <FormItem label="Latitud">
                                    <Input value={form.lat} onChange={(e) => set('lat', e.target.value)} placeholder="-25.30" />
                                </FormItem>
                            </div>
                            <div>
                                <FormItem label="Longitud">
                                    <Input value={form.lng} onChange={(e) => set('lng', e.target.value)} placeholder="-57.63" />
                                </FormItem>
                            </div>
                            <PlainCustomFields settingsKey="mod_branch_fields" value={form.custom} onChange={(c) => set('custom', c)} />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-6">
                            <Checkbox checked={form.pickupEnabled} onChange={(v) => set('pickupEnabled', v)}>
                                Retiro en sucursal
                            </Checkbox>
                            <Checkbox checked={form.deliveryEnabled} onChange={(v) => set('deliveryEnabled', v)}>
                                Delivery
                            </Checkbox>
                            <Checkbox checked={form.active} onChange={(v) => set('active', v)}>
                                Activa
                            </Checkbox>
                        </div>
                        <div className="mt-4 flex gap-2">
                            <Button variant="solid" loading={saving} onClick={save}>
                                {form.id ? 'Guardar cambios' : 'Crear sucursal'}
                            </Button>
                            <Button onClick={() => setForm(null)}>Cancelar</Button>
                        </div>
                    </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {branches.map((b) => (
                        <Card key={b.id}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <h6 className="font-bold">{b.name}</h6>
                                    <p className="text-xs text-gray-400">{b.code}</p>
                                </div>
                                <Tag
                                    className={
                                        b.active
                                            ? 'bg-emerald-100 text-emerald-600'
                                            : 'bg-gray-100 text-gray-500'
                                    }
                                >
                                    {b.active ? 'Activa' : 'Inactiva'}
                                </Tag>
                            </div>
                            <div className="mt-3 text-sm text-gray-600 flex flex-col gap-1">
                                <span>{b.address}</span>
                                <span>{b.city}</span>
                                <span>{b.phone}</span>
                            </div>
                            <div className="mt-3 flex gap-2">
                                {b.pickupEnabled && (
                                    <Tag className="bg-sky-100 text-sky-600">Retiro</Tag>
                                )}
                                {b.deliveryEnabled && (
                                    <Tag className="bg-violet-100 text-violet-600">Delivery</Tag>
                                )}
                            </div>
                            <div className="mt-4 flex gap-2">
                                <Button size="md" onClick={() => openEdit(b)}>
                                    Editar
                                </Button>
                                <Button
                                    size="md"
                                    variant="plain"
                                    loading={busyId === b.id}
                                    onClick={() => toggleActive(b)}
                                >
                                    {b.active ? 'Desactivar' : 'Activar'}
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </Loading>
    )
}

export default Branches
