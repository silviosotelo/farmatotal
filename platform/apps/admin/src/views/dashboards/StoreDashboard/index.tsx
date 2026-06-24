import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import Table from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import Loading from '@/components/shared/Loading'
import Chart from '@/components/shared/Chart'
import { apiGetOverview, type OverviewStats } from '@/services/StatsService'
import { apiGetOrderList } from '@/services/OrderService'
import useSWR from 'swr'

const { Tr, Th, Td, THead, TBody } = Table
import { Link } from 'react-router'
import {
    PiPackageDuotone,
    PiStorefrontDuotone,
    PiTicketDuotone,
    PiShoppingCartDuotone,
    PiCurrencyDollarDuotone,
    PiWarningDuotone,
    PiTagDuotone,
    PiCheckCircleDuotone,
    PiPlusBold,
    PiImagesDuotone,
    PiStarDuotone,
    PiSlidersDuotone,
} from 'react-icons/pi'
import type { ReactNode } from 'react'
import { gs, num } from '@/utils/format'

type OrderRow = {
    id: string
    number: string
    customerName: string
    total: number
    status: string
    createdAt: string
}

const statusTint: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-600',
    paid: 'bg-emerald-100 text-emerald-600',
    processing: 'bg-sky-100 text-sky-600',
    fulfilled: 'bg-indigo-100 text-indigo-600',
    delivered: 'bg-green-100 text-green-600',
    cancelled: 'bg-red-100 text-red-500',
    refunded: 'bg-gray-100 text-gray-500',
}

const Stat = ({
    icon,
    label,
    value,
    tint,
}: {
    icon: ReactNode
    label: string
    value: string
    tint: string
}) => (
    <Card className="flex-1">
        <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center rounded-2xl h-12 w-12 text-2xl ${tint}`}>
                {icon}
            </div>
            <div>
                <div className="text-sm text-gray-500">{label}</div>
                <div className="text-2xl font-bold">{value}</div>
            </div>
        </div>
    </Card>
)

const shortcuts = [
    { to: '/concepts/products/product-list', label: 'Nuevo producto', icon: <PiPlusBold /> },
    { to: '/concepts/slides', label: 'Banners del Home', icon: <PiImagesDuotone /> },
    { to: '/concepts/reviews', label: 'Moderar valoraciones', icon: <PiStarDuotone /> },
    { to: '/concepts/store-config', label: 'Configuración de tienda', icon: <PiSlidersDuotone /> },
]

const StoreDashboard = () => {
    const { data, isLoading } = useSWR(['/stats/overview'], () => apiGetOverview(), {
        revalidateOnFocus: false,
    })
    const { data: ordersData } = useSWR(
        ['/orders', 'dashboard'],
        () =>
            apiGetOrderList<{ data: OrderRow[]; total: number }, Record<string, unknown>>({
                perPage: 6,
            }),
        { revalidateOnFocus: false },
    )

    const d = data as OverviewStats | undefined
    const orders = (ordersData?.data ?? []) as OrderRow[]

    const top = (d?.topCategories ?? []).slice(0, 6)
    const published = d?.products.published ?? 0
    const outOfStock = d?.products.outOfStock ?? 0
    const inStock = Math.max(0, published - outOfStock)
    const drafts = Math.max(0, (d?.products.total ?? 0) - published)

    return (
        <Loading loading={isLoading}>
            <div className="flex flex-col gap-4">
                <div>
                    <h3 className="mb-1">Panel de control</h3>
                    <p className="text-gray-500">Resumen en vivo del catálogo, inventario y pedidos.</p>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Stat icon={<PiPackageDuotone />} label="Productos" value={num(d?.products.total ?? 0)} tint="bg-sky-100 text-sky-600" />
                    <Stat icon={<PiCheckCircleDuotone />} label="Publicados" value={num(published)} tint="bg-emerald-100 text-emerald-600" />
                    <Stat icon={<PiWarningDuotone />} label="Sin stock" value={num(outOfStock)} tint="bg-amber-100 text-amber-600" />
                    <Stat icon={<PiTagDuotone />} label="Categorías" value={num(d?.categories ?? 0)} tint="bg-violet-100 text-violet-600" />
                    <Stat icon={<PiStorefrontDuotone />} label="Sucursales" value={num(d?.branches ?? 0)} tint="bg-rose-100 text-rose-600" />
                    <Stat icon={<PiTicketDuotone />} label="Cupones" value={num(d?.coupons ?? 0)} tint="bg-indigo-100 text-indigo-600" />
                    <Stat icon={<PiShoppingCartDuotone />} label="Pedidos" value={num(d?.orders.total ?? 0)} tint="bg-teal-100 text-teal-600" />
                    <Stat icon={<PiCurrencyDollarDuotone />} label="Ventas" value={gs(d?.orders.revenue ?? 0)} tint="bg-green-100 text-green-600" />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                    <Card className="xl:col-span-2">
                        <h5 className="mb-4">Top categorías por productos</h5>
                        {top.length > 0 ? (
                            <Chart
                                type="bar"
                                height={300}
                                series={[{ name: 'Productos', data: top.map((c) => c.count) }]}
                                xAxis={top.map((c) => c.name)}
                                customOptions={{
                                    plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
                                    colors: ['#f16522'],
                                }}
                            />
                        ) : (
                            <p className="text-gray-400">Sin datos.</p>
                        )}
                    </Card>

                    <Card>
                        <h5 className="mb-4">Salud del catálogo</h5>
                        <Chart
                            type="donut"
                            height={300}
                            series={[inStock, outOfStock, drafts]}
                            customOptions={{
                                labels: ['En stock', 'Sin stock', 'Borradores'],
                                colors: ['#10b981', '#f59e0b', '#94a3b8'],
                                legend: { position: 'bottom' },
                            }}
                        />
                    </Card>
                </div>

                {/* Últimos pedidos + atajos */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                    <Card className="xl:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <h5>Últimos pedidos</h5>
                            <Link to="/concepts/orders/order-list">
                                <Button size="md">Ver todos</Button>
                            </Link>
                        </div>
                        {orders.length > 0 ? (
                            <Table>
                                <THead>
                                    <Tr className="text-left text-gray-400 border-b">
                                        <Th className="py-2">N°</Th>
                                        <Th>Cliente</Th>
                                        <Th>Total</Th>
                                        <Th>Estado</Th>
                                    </Tr>
                                </THead>
                                <TBody>
                                    {orders.map((o) => (
                                        <Tr key={o.id} className="border-b last:border-0">
                                            <Td className="py-2 font-semibold">{o.number}</Td>
                                            <Td>{o.customerName}</Td>
                                            <Td>{gs(o.total)}</Td>
                                            <Td>
                                                <Tag className={statusTint[o.status] ?? 'bg-gray-100 text-gray-500'}>
                                                    {o.status}
                                                </Tag>
                                            </Td>
                                        </Tr>
                                    ))}
                                </TBody>
                            </Table>
                        ) : (
                            <div className="py-10 text-center text-gray-400">
                                Todavía no hay pedidos. Cuando lleguen, aparecen acá.
                            </div>
                        )}
                    </Card>

                    <Card>
                        <h5 className="mb-4">Atajos</h5>
                        <div className="flex flex-col gap-2">
                            {shortcuts.map((s) => (
                                <Link key={s.to} to={s.to}>
                                    <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 hover:border-primary hover:bg-primary-subtle transition-colors">
                                        <span className="text-xl text-primary">{s.icon}</span>
                                        <span className="text-sm font-medium">{s.label}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </Loading>
    )
}

export default StoreDashboard
