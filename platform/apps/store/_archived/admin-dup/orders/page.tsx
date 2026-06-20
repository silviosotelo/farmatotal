import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PAID: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-indigo-100 text-indigo-800",
  SHIPPED: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const ALL_STATUSES = ["PENDING", "PAID", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED"];

async function changeStatus(orderId: string, newStatus: string) {
  "use server";
  await db.order.update({ where: { id: orderId }, data: { status: newStatus } });
  revalidatePath("/admin/orders");
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const statusFilter = sp.status ?? undefined;
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (statusFilter && statusFilter !== "ALL") where.status = statusFilter;

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      include: { lines: true, user: { select: { firstName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.order.count({ where }),
  ]);

  const formatG = (n: number) => new Intl.NumberFormat("es-PY").format(n);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Pedidos</h1>

      {/* Status filter */}
      <div className="flex gap-2 mb-4">
        <a href="/admin/orders" className={`px-3 py-1 rounded-full text-sm ${!statusFilter ? "bg-gray-900 text-white" : "bg-gray-200"}`}>Todos</a>
        {ALL_STATUSES.map((s) => (
          <a key={s} href={`/admin/orders?status=${s}`} className={`px-3 py-1 rounded-full text-sm ${statusFilter === s ? "bg-gray-900 text-white" : "bg-gray-200"}`}>{s}</a>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="p-3">Nº Pedido</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Total</th>
              <th className="p-3">Pago</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Fecha</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-mono">{o.number}</td>
                <td className="p-3">{o.user?.firstName ?? o.billingName ?? "—"}</td>
                <td className="p-3 font-semibold">{formatG(o.total)} Gs.</td>
                <td className="p-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100">{o.paymentMethod}</span>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[o.status] ?? "bg-gray-100"}`}>
                    {o.status}
                  </span>
                </td>
                <td className="p-3 text-gray-500">{o.createdAt.toLocaleDateString("es-PY")}</td>
                <td className="p-3">
                  <form action={async (formData: FormData) => {
                    "use server";
                    const newStatus = formData.get("status") as string;
                    await changeStatus(o.id, newStatus);
                  }} className="flex gap-1">
                    <select name="status" defaultValue={o.status} className="text-xs border rounded px-1 py-0.5">
                      {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button type="submit" className="text-xs bg-green-600 text-white px-2 py-0.5 rounded hover:bg-green-700">
                      Guardar
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-gray-400">Sin pedidos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {Math.ceil(total / limit) > 1 && (
        <div className="flex gap-2 mt-4 justify-center">
          {Array.from({ length: Math.ceil(total / limit) }, (_, i) => i + 1).map((p) => (
            <a key={p} href={`/admin/orders?page=${p}${statusFilter ? `&status=${statusFilter}` : ""}`} className={`px-3 py-1 rounded ${p === page ? "bg-green-600 text-white" : "bg-white border"}`}>{p}</a>
          ))}
        </div>
      )}
    </div>
  );
}
