import { db } from "@/lib/db";

export default async function AdminCustomersPage() {
  const customers = await db.user.findMany({
    where: { role: "CUSTOMER" },
    include: { _count: { select: { orders: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Clientes</h1>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="p-3">Nombre</th>
              <th className="p-3">Email</th>
              <th className="p-3">Teléfono</th>
              <th className="p-3">Pedidos</th>
              <th className="p-3">Registro</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t hover:bg-gray-50">
                <td className="p-3">{c.firstName} {c.lastName}</td>
                <td className="p-3 text-gray-500">{c.email}</td>
                <td className="p-3">{c.phone ?? "—"}</td>
                <td className="p-3">{c._count.orders}</td>
                <td className="p-3 text-gray-500">{c.createdAt.toLocaleDateString("es-PY")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
