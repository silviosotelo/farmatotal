import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function approveReview(id: string) {
  "use server";
  await db.review.update({ where: { id }, data: { approved: true } });
  revalidatePath("/admin/reviews");
}

async function deleteReview(id: string) {
  "use server";
  await db.review.delete({ where: { id } });
  revalidatePath("/admin/reviews");
}

export default async function AdminReviewsPage() {
  const reviews = await db.review.findMany({
    include: { product: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Reseñas</h1>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="p-3">Producto</th>
              <th className="p-3">Autor</th>
              <th className="p-3">Rating</th>
              <th className="p-3">Comentario</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 truncate max-w-32">{r.product.title}</td>
                <td className="p-3">{r.author}</td>
                <td className="p-3">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</td>
                <td className="p-3 truncate max-w-48">{r.body}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${r.approved ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                    {r.approved ? "Aprobada" : "Pendiente"}
                  </span>
                </td>
                <td className="p-3 flex gap-2">
                  {!r.approved && (
                    <form action={approveReview.bind(null, r.id)}>
                      <button type="submit" className="text-green-600 text-xs hover:underline">Aprobar</button>
                    </form>
                  )}
                  <form action={deleteReview.bind(null, r.id)}>
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
