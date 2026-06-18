import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import Tabs from '@/components/ui/Tabs'
import Tag from '@/components/ui/Tag'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Loading from '@/components/shared/Loading'
import useSWR from 'swr'
import {
    apiGetPaymentMethods,
    apiSavePaymentMethod,
    apiCreateCustomMethod,
    apiDeleteCustomMethod,
    apiGetTransactions,
    type PaymentMethod,
    type Transaction,
} from '@/services/PaymentService'

const { TabNav, TabList, TabContent } = Tabs

const gs = (n: number) => '₲ ' + (n ?? 0).toLocaleString('es-PY').replace(/,/g, '.')

const txTint: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-600',
    approved: 'bg-emerald-100 text-emerald-600',
    rejected: 'bg-red-100 text-red-500',
    rolled_back: 'bg-gray-100 text-gray-500',
}

const MethodCard = ({ m, onSaved }: { m: PaymentMethod; onSaved: () => void }) => {
    const [enabled, setEnabled] = useState(m.enabled)
    const [values, setValues] = useState<Record<string, unknown>>(m.values ?? {})
    const [saving, setSaving] = useState(false)
    useEffect(() => {
        setEnabled(m.enabled)
        setValues(m.values ?? {})
    }, [m])
    const set = (k: string, v: unknown) => setValues((s) => ({ ...s, [k]: v }))
    const save = async () => {
        setSaving(true)
        try {
            await apiSavePaymentMethod(m.key, { enabled, values })
            toast.push(<Notification type="success">{m.name} guardado</Notification>, { placement: 'top-center' })
            onSaved()
        } finally {
            setSaving(false)
        }
    }
    const del = async () => {
        if (!m.custom) return
        await apiDeleteCustomMethod(m.key)
        onSaved()
    }
    return (
        <Card>
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h6>{m.name}</h6>
                        {m.custom && <Tag className="bg-amber-100 text-amber-600">Custom</Tag>}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{m.description}</p>
                </div>
                <Switcher checked={enabled} onChange={setEnabled} />
            </div>
            {m.fields.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {m.fields.map((f) => (
                        <div key={f.key}>
                            <label className="text-sm">{f.label}</label>
                            {f.type === 'select' ? (
                                <Select
                                    options={f.options ?? []}
                                    value={(f.options ?? []).find((o) => o.value === values[f.key])}
                                    onChange={(o) => set(f.key, o?.value)}
                                />
                            ) : (
                                <Input
                                    type={f.type === 'password' ? 'password' : 'text'}
                                    value={(values[f.key] as string) ?? ''}
                                    onChange={(e) => set(f.key, e.target.value)}
                                />
                            )}
                        </div>
                    ))}
                </div>
            )}
            <div className="mt-4 flex items-center gap-2">
                <Button variant="solid" loading={saving} onClick={save}>Guardar</Button>
                {m.custom && <Button variant="plain" onClick={del}>Eliminar</Button>}
            </div>
        </Card>
    )
}

const MethodsTab = () => {
    const { data, isLoading, mutate } = useSWR(['/payments/methods'], () => apiGetPaymentMethods(), { revalidateOnFocus: false })
    const methods = (data?.data ?? []) as PaymentMethod[]
    const [nf, setNf] = useState({ name: '', description: '', instructions: '' })
    const [creating, setCreating] = useState(false)
    const create = async () => {
        if (!nf.name.trim()) return
        setCreating(true)
        try {
            await apiCreateCustomMethod(nf)
            setNf({ name: '', description: '', instructions: '' })
            await mutate()
            toast.push(<Notification type="success">Método creado</Notification>, { placement: 'top-center' })
        } finally {
            setCreating(false)
        }
    }
    return (
        <Loading loading={isLoading}>
            <div className="flex flex-col gap-4">
                <Card>
                    <h6 className="mb-3">Nuevo método de pago (custom)</h6>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        <div>
                            <label className="text-sm">Nombre</label>
                            <Input value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} placeholder="Ej. Pago en local" />
                        </div>
                        <div>
                            <label className="text-sm">Descripción</label>
                            <Input value={nf.description} onChange={(e) => setNf({ ...nf, description: e.target.value })} />
                        </div>
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <label className="text-sm">Instrucciones</label>
                                <Input value={nf.instructions} onChange={(e) => setNf({ ...nf, instructions: e.target.value })} placeholder="Texto para el cliente" />
                            </div>
                            <Button variant="solid" loading={creating} onClick={create}>Agregar</Button>
                        </div>
                    </div>
                </Card>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {methods.map((m) => (
                        <MethodCard key={m.key} m={m} onSaved={() => mutate()} />
                    ))}
                </div>
            </div>
        </Loading>
    )
}

const TransactionsTab = () => {
    const { data, isLoading } = useSWR(['/payments/transactions'], () => apiGetTransactions(), { revalidateOnFocus: false })
    const items = (data?.data ?? []) as Transaction[]
    return (
        <Card>
            {isLoading ? <p className="text-gray-400">Cargando…</p> : items.length === 0 ? (
                <p className="py-6 text-center text-gray-400">Todavía no hay transacciones.</p>
            ) : (
                <table className="w-full text-sm">
                    <thead><tr className="text-left text-gray-400 border-b"><th className="py-2">Fecha</th><th>Pedido</th><th>Cliente</th><th>Proveedor</th><th>Monto</th><th>Estado</th></tr></thead>
                    <tbody>
                        {items.map((t) => (
                            <tr key={t.id} className="border-b last:border-0">
                                <td className="py-2 text-xs text-gray-400">{new Date(t.createdAt).toLocaleString('es-PY')}</td>
                                <td className="font-semibold">{t.orderNumber ?? '—'}</td>
                                <td>{t.customerName ?? '—'}</td>
                                <td>{t.provider}</td>
                                <td>{gs(t.amount)}</td>
                                <td><Tag className={txTint[t.status] ?? 'bg-gray-100 text-gray-500'}>{t.status}</Tag></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </Card>
    )
}

const Payments = () => (
    <div className="flex flex-col gap-4">
        <div>
            <h3 className="mb-1">Pagos</h3>
            <p className="text-gray-500">Métodos de pago (pasarelas) y registro de transacciones.</p>
        </div>
        <Tabs defaultValue="methods">
            <TabList>
                <TabNav value="methods">Métodos</TabNav>
                <TabNav value="transactions">Transacciones</TabNav>
            </TabList>
            <div className="mt-6">
                <TabContent value="methods"><MethodsTab /></TabContent>
                <TabContent value="transactions"><TransactionsTab /></TabContent>
            </div>
        </Tabs>
    </div>
)

export default Payments
