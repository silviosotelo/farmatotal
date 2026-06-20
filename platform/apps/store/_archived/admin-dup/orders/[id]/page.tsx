import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PAID: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-indigo-100 text-indigo-800",
  SHIPPED: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

async function changeStatus(orderId: string, formData: FormData) {
  "use server";
  const newStatus = formData.get("status") as string;
  await db.order.update({ where: { id: orderId }, data: { status: newStatus } });
  revalidatePath(`/admin/orders/${orderId}`);
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      lines: true,
      user: { select: { firstName: true, lastName: true, email: true, phone: true } },
      payment: true,
      branch: true,
    },
  });
  if (!order) notFound();

  const formatG = (n: number) => new Intl.NumberFormat("es-PY").format(n);
  const ALL_STATUSES = ["PENDING", "PAID", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED"];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Pedido {order.number}</h1>
          <p className="text-gray-500 text-sm">{order.createdAt.toLocaleString("es-PY")}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[order.status]}`}>
          {order.status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Order info */}
        <div className="col-span-2 space-y-4">
          {/* Items */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold mb-3">Productos</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">SKU</th>
                  <th className="pb-2">Producto</th>
                  <th className="pb-2 text-right">Precio</th>
                  <th className="pb-2 text-right">Cant.</th>
                  <th className="pb-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{l.sku}</td>
                    <td className="py-2">{l.title}</td>
                    <td className="py-2 text-right">{formatG(l.unitPrice)} Gs.</td>
                    <td className="py-2 text-right">{l.quantity}</td>
                    <td className="py-2 text-right font-semibold">{formatG(l.subtotal)} Gs.</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td colSpan={4} className="pt-2 text-right">Subtotal:</td>
                  <td className="pt-2 text-right">{formatG(order.subtotal)} Gs.</td>
                </tr>
                {order.discount > 0 && (
                  <tr className="text-red-600">
                    <td colSpan={4} className="text-right">Descuento{order.couponCode ? ` (${order.couponCode})` : ""}:</td>
                    <td className="text-right">-{formatG(order.discount)} Gs.</td>
                  </tr>
                )}
                <tr className="text-lg font-bold border-t">
                  <td colSpan={4} className="pt-2 text-right">Total:</td>
                  <td className="pt-2 text-right">{formatG(order.total)} Gs.</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment info */}
          {order.payment && (
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-semibold mb-3">Pago</h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">Proveedor:</span> {order.payment.provider}</div>
                <div><span className="text-gray-500">Estado:</span> {order.payment.status}</div>
                <div><span className="text-gray-500">Monto:</span> {formatG(order.payment.amount)} Gs.</div>
                <div><span className="text-gray-500">Transacción:</span> {order.payment.transactionId ?? "—"}</div>
                <div><span className="text-gray-500">Process ID:</span> {order.payment.processId ?? "—"}</div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Customer + Actions */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold mb-3">Cliente</h2>
            <div className="text-sm space-y-1">
              <p className="font-medium">{order.billingName ?? order.user?.firstName ?? "—"}</p>
              <p className="text-gray-500">{order.user?.email ?? "—"}</p>
              <p className="text-gray-500">{order.billingPhone ?? order.user?.phone ?? "—"}</p>
              {order.billingDoc && <p className="text-gray-500">{order.billingDocType}: {order.billingDoc}</p>}
            </div>
          </div>

          {/* Shipping */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold mb-3">Envío</h2>
            <div className="text-sm space-y-1">
              <p><span className="text-gray-500">Método:</span> {order.shippingMethod === "delivery" ? "Delivery" : "Retiro en sucursal"}</p>
              {order.shippingAddress && <p><span className="text-gray-500">Dirección:</span> {order.shippingAddress}</p>}
              {order.branch && <p><span className="text-gray-500">Sucursal:</span> {order.branch.name}</p>}
            </div>
          </div>

          {/* Payment method */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold mb-3">Método de pago</h2>
            <p className="text-sm">{order.paymentMethod === "online" ? "Pago online (Bancard)" : "Contra entrega"}</p>
          </div>

          {/* Status change */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold mb-3">Cambiar estado</h2>
            <form action={changeStatus.bind(null, id)} className="space-y-2">
              <select name="status" defaultValue={order.status} className="w-full border rounded-lg px-3 py-2 text-sm">
                {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button type="submit" className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm">
                Actualizar estado
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
