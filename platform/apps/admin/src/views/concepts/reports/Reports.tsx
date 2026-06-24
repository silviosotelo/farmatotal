import { useMemo, useState } from 'react'
import useSWR from 'swr'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import Loading from '@/components/shared/Loading'
import Chart from '@/components/shared/Chart'
import EmptyState from '@/components/shared/EmptyState'
import { apiGetSalesReport } from '@/services/ReportService'
import { gs } from '@/utils/format'

const { Tr, Th, Td, THead, TBody } = Table

const PRESETS = [
    { key: '7', label: '7 días', days: 7 },
    { key: '30', label: '30 días', days: 30 },
    { key: '90', label: '90 días', days: 90 },
]

const STATUS_LABEL: Record<string, string> = {
    pending: 'Pendiente',
    paid: 'Pagado',
    processing: 'Procesando',
    fulfilled: 'Preparado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
    refunded: 'Reembolsado',
}
const PAY_LABEL: Record<string, string> = {
    cash: 'Efectivo',
    transfer: 'Transferencia',
    bancard: 'Bancard',
}

const Kpi = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
    <Card className="flex-1">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </Card>
)

const Reports = () => {
    const [days, setDays] = useState(30)
    const range = useMemo(() => {
        const to = new Date()
        const from = new Date(to.getTime() - (days - 1) * 24 * 3600 * 1000)
        return { from: from.toISOString(), to: to.toISOString() }
    }, [days])

    const { data, isLoading } = useSWR(
        ['/stats/reports', range.from, range.to],
        () => apiGetSalesReport(range.from, range.to),
        { revalidateOnFocus: false },
    )

    const series = data?.series ?? []
    const hasData = series.some((s) => s.revenue > 0 || s.orders > 0)

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h3 className="mb-1">Reportes de ventas</h3>
                    <p className="text-gray-500">Ingresos, pedidos y productos más vendidos por período.</p>
                </div>
                <div className="flex gap-2">
                    {PRESETS.map((p) => (
                        <Button
                            key={p.key}
                            size="md"
                            variant={days === p.days ? 'solid' : 'default'}
                            onClick={() => setDays(p.days)}
                        >
                            {p.label}
                        </Button>
                    ))}
                </div>
            </div>

            <Loading loading={isLoading}>
                <div className="flex flex-wrap gap-4">
                    <Kpi label="Ingresos" value={gs(data?.kpis.revenue ?? 0)} />
                    <Kpi label="Pedidos" value={String(data?.kpis.orders ?? 0)} hint={`${data?.kpis.allOrders ?? 0} totales`} />
                    <Kpi label="Ticket promedio" value={gs(data?.kpis.avgOrderValue ?? 0)} />
                    <Kpi label="Unidades vendidas" value={String(data?.kpis.unitsSold ?? 0)} />
                </div>

                <Card className="mt-4">
                    <h6 className="mb-4">Ingresos por día</h6>
                    {hasData ? (
                        <Chart
                            type="area"
                            height={320}
                            series={[{ name: 'Ingresos', data: series.map((s) => s.revenue) }]}
                            xAxis={series.map((s) => s.day.slice(5))}
                        />
                    ) : (
                        <EmptyState
                            title="Sin ventas en el período"
                            description="No hay ventas concretadas en el rango seleccionado. Probá ampliar el período."
                        />
                    )}
                </Card>

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Card>
                        <h6 className="mb-4">Productos más vendidos</h6>
                        {data?.topProducts.length ? (
                            <Table>
                                <THead>
                                    <Tr className="text-left text-gray-400 border-b">
                                        <Th className="py-2">Producto</Th>
                                        <Th className="text-right">Unid.</Th>
                                        <Th className="text-right">Ingresos</Th>
                                    </Tr>
                                </THead>
                                <TBody>
                                    {data.topProducts.map((p) => (
                                        <Tr key={p.sku} className="border-b last:border-0">
                                            <Td className="py-2">
                                                <div className="font-medium line-clamp-1">{p.title}</div>
                                                <div className="text-xs text-gray-400">{p.sku}</div>
                                            </Td>
                                            <Td className="text-right">{p.units}</Td>
                                            <Td className="text-right">{gs(p.revenue)}</Td>
                                        </Tr>
                                    ))}
                                </TBody>
                            </Table>
                        ) : (
                            <EmptyState compact title="Sin datos en el período" />
                        )}
                    </Card>

                    <Card>
                        <h6 className="mb-4">Pedidos por estado</h6>
                        {data?.byStatus.length ? (
                            <div className="flex flex-col gap-2">
                                {data.byStatus.map((s) => (
                                    <div key={s.status} className="flex items-center justify-between text-sm">
                                        <span>{STATUS_LABEL[s.status] ?? s.status}</span>
                                        <span className="text-gray-500">
                                            {s.count} · {gs(s.revenue)}
                                        </span>
                                    </div>
                                ))}
                                <div className="mt-3 border-t pt-3">
                                    <h6 className="mb-2 text-sm">Por método de pago</h6>
                                    {data.byPayment.map((p) => (
                                        <div key={p.method} className="flex items-center justify-between text-sm">
                                            <span>{PAY_LABEL[p.method] ?? p.method}</span>
                                            <span className="text-gray-500">
                                                {p.count} · {gs(p.revenue)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <EmptyState compact title="Sin datos en el período" />
                        )}
                    </Card>
                </div>
            </Loading>
        </div>
    )
}

export default Reports
