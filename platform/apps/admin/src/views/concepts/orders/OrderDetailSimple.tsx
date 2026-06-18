import { useState } from 'react'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Loading from '@/components/shared/Loading'
import { apiGetOrder, apiUpdateOrderStatus, apiRefundOrder } from '@/services/OrderService'
import { apiGetTaxConfig } from '@/services/TaxService'
import { useParams, useNavigate } from 'react-router'
import useSWR from 'swr'

type Line = {
    id: string
    sku: string
    title: string
    unitPrice: number
    quantity: number
    lineTotal: number
}
type OrderFull = {
    id: string
    number: string
    customerName: string
    customerEmail: string
    customerPhone: string | null
    status: string
    paymentMethod: string
    shippingMethod: string
    subtotal: number
    discount: number
    total: number
    createdAt: string
    lines: Line[]
    events?: { at: string; type: string; note?: string; amount?: number }[]
}

const gs = (n: number) => '₲ ' + (n ?? 0).toLocaleString('es-PY').replace(/,/g, '.')

const statusOptions = [
    'pending',
    'paid',
    'processing',
    'fulfilled',
    'delivered',
    'cancelled',
    'refunded',
].map((s) => ({ value: s, label: s }))

const OrderDetailSimple = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { data, isLoading, mutate } = useSWR(
        id ? [`/orders/${id}`] : null,
        () => apiGetOrder<OrderFull, { id: string }>({ id: id as string }),
        { revalidateOnFocus: false },
    )
    const { data: taxCfg } = useSWR('/tax/config', apiGetTaxConfig, { revalidateOnFocus: false })
    const [saving, setSaving] = useState(false)
    const [refundAmount, setRefundAmount] = useState('')
    const [refundReason, setRefundReason] = useState('')
    const [refunding, setRefunding] = useState(false)
    const o = data as OrderFull | undefined

    const changeStatus = async (status: string) => {
        if (!id) return
        setSaving(true)
        try {
            await apiUpdateOrderStatus(id, status)
            await mutate()
            toast.push(
                <Notification type="success">Estado: {status}</Notification>,
                { placement: 'top-center' },
            )
        } finally {
            setSaving(false)
        }
    }

    const refund = async () => {
        if (!id) return
        setRefunding(true)
        try {
            const amount = refundAmount.trim() ? Number(refundAmount) : undefined
            await apiRefundOrder(id, amount, refundReason.trim() || undefined)
            setRefundAmount('')
            setRefundReason('')
            await mutate()
            toast.push(
                <Notification type="success">Reembolso registrado</Notification>,
                { placement: 'top-center' },
            )
        } finally {
            setRefunding(false)
        }
    }

    return (
        <Loading loading={isLoading}>
            {o && (
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="mb-1">Pedido {o.number}</h3>
                            <p className="text-gray-500">
                                {new Date(o.createdAt).toLocaleString('es-PY')}
                            </p>
                        </div>
                        <Button onClick={() => navigate('/concepts/orders/order-list')}>
                            Volver
                        </Button>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-4">
                        <Card className="flex-1">
                            <h6 className="mb-3">Cliente</h6>
                            <p>{o.customerName}</p>
                            <p className="text-gray-500">{o.customerEmail}</p>
                            <p className="text-gray-500">{o.customerPhone}</p>
                            <div className="mt-3 flex gap-2">
                                <Tag>{o.shippingMethod}</Tag>
                                <Tag>{o.paymentMethod}</Tag>
                            </div>
                        </Card>
                        <Card className="lg:w-80">
                            <h6 className="mb-3">Estado</h6>
                            <Select
                                options={statusOptions}
                                value={statusOptions.find(
                                    (s) => s.value === o.status,
                                )}
                                isDisabled={saving}
                                onChange={(opt) =>
                                    opt && changeStatus(opt.value)
                                }
                            />
                        </Card>
                    </div>

                    <Card>
                        <h6 className="mb-3">Líneas</h6>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-400 border-b">
                                    <th className="py-2">Producto</th>
                                    <th>SKU</th>
                                    <th>Precio</th>
                                    <th>Cant.</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {o.lines?.map((l) => (
                                    <tr key={l.id} className="border-b last:border-0">
                                        <td className="py-2">{l.title}</td>
                                        <td>{l.sku}</td>
                                        <td>{gs(l.unitPrice)}</td>
                                        <td>{l.quantity}</td>
                                        <td>{gs(l.lineTotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {(() => {
                            const rate =
                                taxCfg?.rates.find((r) => r.isDefault) ?? taxCfg?.rates[0]
                            const pct = rate?.percent ?? 0
                            const ivaIncluido =
                                taxCfg?.pricesIncludeTax && pct > 0
                                    ? Math.round(o.total - o.total / (1 + pct / 100))
                                    : null
                            return (
                                <div className="mt-4 flex flex-col items-end gap-1 text-sm">
                                    <div>Subtotal: {gs(o.subtotal)}</div>
                                    {o.discount > 0 && <div>Descuento: -{gs(o.discount)}</div>}
                                    <div className="text-lg font-bold">Total: {gs(o.total)}</div>
                                    {ivaIncluido !== null && (
                                        <div className="text-xs text-gray-400">
                                            {rate?.name} incluido: {gs(ivaIncluido)}
                                        </div>
                                    )}
                                </div>
                            )
                        })()}
                    </Card>

                    <div className="flex flex-col lg:flex-row gap-4">
                        <Card className="lg:w-96">
                            <h6 className="mb-1">Reembolso</h6>
                            <p className="text-gray-500 text-sm mb-3">
                                Dejá el monto vacío para reembolso total (marca el
                                pedido como reembolsado). Un monto menor al total es un
                                reembolso parcial.
                            </p>
                            <div className="flex flex-col gap-2">
                                <Input
                                    type="number"
                                    value={refundAmount}
                                    onChange={(e) => setRefundAmount(e.target.value)}
                                    placeholder={`Monto (total ${gs(o.total)})`}
                                />
                                <Input
                                    value={refundReason}
                                    onChange={(e) => setRefundReason(e.target.value)}
                                    placeholder="Motivo (opcional)"
                                />
                                <Button
                                    variant="solid"
                                    color="red"
                                    loading={refunding}
                                    disabled={o.status === 'refunded'}
                                    onClick={refund}
                                >
                                    {o.status === 'refunded' ? 'Pedido reembolsado' : 'Reembolsar'}
                                </Button>
                            </div>
                        </Card>

                        <Card className="flex-1">
                            <h6 className="mb-3">Actividad</h6>
                            {o.events?.length ? (
                                <ul className="flex flex-col gap-2 text-sm">
                                    {[...o.events].reverse().map((ev, i) => (
                                        <li key={i} className="flex items-start gap-2 border-b last:border-0 pb-2">
                                            <span className="text-gray-400 whitespace-nowrap">
                                                {new Date(ev.at).toLocaleString('es-PY')}
                                            </span>
                                            <span className="flex-1">
                                                <span className="font-medium">{ev.type}</span>
                                                {ev.note ? ` — ${ev.note}` : ''}
                                                {typeof ev.amount === 'number' ? ` (${gs(ev.amount)})` : ''}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-400 text-sm">Sin actividad registrada.</p>
                            )}
                        </Card>
                    </div>
                </div>
            )}
        </Loading>
    )
}

export default OrderDetailSimple
