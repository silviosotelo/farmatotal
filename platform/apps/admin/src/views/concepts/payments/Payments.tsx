import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import Tabs from '@/components/ui/Tabs'
import Tag from '@/components/ui/Tag'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Table from '@/components/ui/Table'
import { FormItem } from '@/components/ui/Form'
import Switcher from '@/components/ui/Switcher'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Loading from '@/components/shared/Loading'
import { Link } from 'react-router'
import { TbSettings } from 'react-icons/tb'
import useSWR from 'swr'
import {
    apiGetPaymentMethods,
    apiSavePaymentMethod,
    apiDeleteCustomMethod,
    apiGetTransactions,
    type PaymentMethod,
    type Transaction,
} from '@/services/PaymentService'
import { gs } from '@/utils/format'

const { TabNav, TabList, TabContent } = Tabs
const { Tr, Th, Td, THead, TBody } = Table

const txTint: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-600',
    approved: 'bg-emerald-100 text-emerald-600',
    rejected: 'bg-red-100 text-red-500',
    rolled_back: 'bg-gray-100 text-gray-500',
}

const GatewayCard = ({ m }: { m: PaymentMethod }) => (
    <Card>
        <div className="flex items-start justify-between gap-3">
            <div>
                <h6>{m.name}</h6>
                <p className="mt-1 text-sm text-gray-500">{m.description}</p>
                <Tag className={m.enabled ? 'bg-emerald-100 text-emerald-600 mt-2' : 'bg-gray-100 text-gray-500 mt-2'}>
                    {m.enabled ? 'Activo' : 'Inactivo'}
                </Tag>
            </div>
            <Link to={`/concepts/plugins/${m.key}`}>
                <Button size="sm" icon={<TbSettings />}>Configurar</Button>
            </Link>
        </div>
    </Card>
)

const CustomMethodCard = ({ m, onSaved }: { m: PaymentMethod; onSaved: () => void }) => {
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
        await apiDeleteCustomMethod(m.key)
        onSaved()
    }
    return (
        <Card>
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h6>{m.name}</h6>
                        <Tag className="bg-amber-100 text-amber-600">Custom</Tag>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{m.description}</p>
                </div>
                <Switcher checked={enabled} onChange={setEnabled} />
            </div>
            {m.fields.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {m.fields.map((f) => (
                        <FormItem key={f.key} label={f.label}>
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
                        </FormItem>
                    ))}
                </div>
            )}
            <div className="mt-4 flex items-center gap-2">
                <Button variant="solid" loading={saving} onClick={save}>Guardar</Button>
                <Button variant="plain" onClick={del}>Eliminar</Button>
            </div>
        </Card>
    )
}

const MethodsTab = () => {
    const { data, isLoading, mutate } = useSWR(['/payments/methods'], () => apiGetPaymentMethods(), { revalidateOnFocus: false })
    const methods = (data?.data ?? []) as PaymentMethod[]
    return (
        <Loading loading={isLoading}>
            <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {methods.map((m) =>
                        m.custom ? (
                            <CustomMethodCard key={m.key} m={m} onSaved={() => mutate()} />
                        ) : (
                            <GatewayCard key={m.key} m={m} />
                        ),
                    )}
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
                <Table>
                    <THead>
                        <Tr className="text-left text-gray-400 border-b">
                            <Th className="py-2">Fecha</Th><Th>Pedido</Th><Th>Cliente</Th><Th>Proveedor</Th><Th>Monto</Th><Th>Estado</Th>
                        </Tr>
                    </THead>
                    <TBody>
                        {items.map((t) => (
                            <Tr key={t.id} className="border-b last:border-0">
                                <Td className="py-2 text-xs text-gray-400">{new Date(t.createdAt).toLocaleString('es-PY')}</Td>
                                <Td className="font-semibold">{t.orderNumber ?? '—'}</Td>
                                <Td>{t.customerName ?? '—'}</Td>
                                <Td>{t.provider}</Td>
                                <Td>{gs(t.amount)}</Td>
                                <Td><Tag className={txTint[t.status] ?? 'bg-gray-100 text-gray-500'}>{t.status}</Tag></Td>
                            </Tr>
                        ))}
                    </TBody>
                </Table>
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
