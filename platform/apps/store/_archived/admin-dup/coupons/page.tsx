import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function createCoupon(formData: FormData) {
  "use server";
  const code = (formData.get("code") as string).toUpperCase();
  const type = formData.get("type") as string;
  const value = Number(formData.get("value"));
  const description = formData.get("description") as string;
  if (!code || !value) return;
  await db.coupon.create({ data: { code, type, value, description } });
  revalidatePath("/admin/coupons");
}

async function deleteCoupon(id: string) {
  "use server";
  await db.coupon.delete({ where: { id } });
  revalidatePath("/admin/coupons");
}

export default async function AdminCouponsPage() {
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Cupones</h1>

      {/* Create form */}
      <form action={createCoupon} className="bg-white rounded-xl shadow p-4 mb-6 grid grid-cols-5 gap-3 items-end">
        <div>
          <label className="text-xs text-gray-500">Código</label>
          <input name="code" required className="border rounded px-2 py-1.5 w-full" placeholder="FARMA10" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Tipo</label>
          <select name="type" className="border rounded px-2 py-1.5 w-full">
            <option value="PERCENT">%</option>
            <option value="FIXED">Fijo (Gs.)</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Valor</label>
          <input name="value" type="number" required className="border rounded px-2 py-1.5 w-full" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Descripción</label>
          <input name="description" className="border rounded px-2 py-1.5 w-full" />
        </div>
        <button type="submit" className="bg-green-600 text-white px-4 py-1.5 rounded hover:bg-green-700">Crear</button>
      </form>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="p-3">Código</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Valor</th>
              <th className="p-3">Usos</th>
              <th className="p-3">Activo</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-mono">{c.code}</td>
                <td className="p-3">{c.type}</td>
                <td className="p-3">{c.type === "PERCENT" ? `${c.value}%` : `${new Intl.NumberFormat("es-PY").format(c.value)} Gs.`}</td>
                <td className="p-3">{c.usedCount}{c.maxUses ? `/${c.maxUses}` : ""}</td>
                <td className="p-3">{c.active ? "✅" : "❌"}</td>
                <td className="p-3">
                  <form action={deleteCoupon.bind(null, c.id)}>
                    <button type="submit" className="text-red-600 text-xs hover:underline">Eliminar</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
