import { db } from "@/lib/db";
import Link from "next/link";

async function getStats() {
  const [products, orders, customers, revenue, recentOrders, lowStock] = await Promise.all([
    db.product.count({ where: { published: true } }),
    db.order.count(),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.order.aggregate({ _sum: { total: true }, where: { status: { not: "CANCELLED" } } }),
    db.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    }),
    db.product.findMany({
      where: { published: true, stock: { lt: 5 } },
      take: 10,
      orderBy: { stock: "asc" },
      select: { id: true, title: true, sku: true, stock: true },
    }),
  ]);

  return {
    products,
    orders,
    customers,
    revenue: revenue._sum.total ?? 0,
    recentOrders,
    lowStock,
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  const formatG = (n: number) => new Intl.NumberFormat("es-PY").format(n);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Productos", value: stats.products, color: "bg-blue-500" },
          { label: "Pedidos", value: stats.orders, color: "bg-green-500" },
          { label: "Clientes", value: stats.customers, color: "bg-purple-500" },
          { label: "Facturación", value: `${formatG(stats.revenue)} Gs.`, color: "bg-yellow-500" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow p-4">
            <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center text-white text-lg mb-2`}>
              {card.label[0]}
            </div>
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Pedidos recientes</h2>
            <Link href="/admin/orders" className="text-sm text-green-600 hover:underline">Ver todos</Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Nº</th>
                <th className="pb-2">Cliente</th>
                <th className="pb-2">Total</th>
                <th className="pb-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map((o) => (
                <tr key={o.id} className="border-b last:border-0">
                  <td className="py-2 font-mono">{o.number}</td>
                  <td className="py-2">{o.user?.firstName ?? "—"}</td>
                  <td className="py-2">{formatG(o.total)} Gs.</td>
                  <td className="py-2">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800">
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
              {stats.recentOrders.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-center text-gray-400">Sin pedidos aún</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-semibold mb-4">Stock bajo (&lt;5 unidades)</h2>
          {stats.lowStock.length === 0 ? (
            <p className="text-gray-400 text-sm">Sin alertas de stock</p>
          ) : (
            <ul className="space-y-2">
              {stats.lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm border-b pb-2">
                  <div>
                    <span className="font-mono text-xs text-gray-400 mr-2">{p.sku}</span>
                    {p.title}
                  </div>
                  <span className={`font-bold ${p.stock === 0 ? "text-red-600" : "text-yellow-600"}`}>
                    {p.stock}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
