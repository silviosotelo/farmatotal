import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function toggleFeatured(productId: string, featured: boolean) {
  "use server";
  await db.product.update({ where: { id: productId }, data: { featured: !featured } });
  revalidatePath("/admin/products");
}

async function togglePublished(productId: string, published: boolean) {
  "use server";
  await db.product.update({ where: { id: productId }, data: { published: !published } });
  revalidatePath("/admin/products");
}

async function updateTitleOverride(productId: string, formData: FormData) {
  "use server";
  const override = formData.get("titleOverride") as string;
  await db.product.update({
    where: { id: productId },
    data: { titleOverride: override || null },
  });
  revalidatePath("/admin/products");
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const q = sp.q ?? "";
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { sku: { contains: q } },
      { brand: { contains: q } },
    ];
  }

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      include: { category: true, images: { take: 1 } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.product.count({ where }),
  ]);

  const formatG = (n: number) => new Intl.NumberFormat("es-PY").format(n);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Productos</h1>

      {/* Search */}
      <form className="mb-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por título, SKU o marca..."
          className="border rounded-lg px-4 py-2 w-80"
        />
        <button type="submit" className="ml-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Buscar</button>
      </form>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="p-3">SKU</th>
              <th className="p-3">Producto</th>
              <th className="p-3">Categoría</th>
              <th className="p-3">Precio</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Destacado</th>
              <th className="p-3">Publicado</th>
              <th className="p-3">Override</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-mono text-xs">{p.sku}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded overflow-hidden">
                      {p.images[0] && <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <a href={`/admin/products/${p.id}`} className="text-green-600 hover:underline truncate max-w-48">{p.title}</a>
                  </div>
                </td>
                <td className="p-3 text-gray-500">{p.category?.name ?? "—"}</td>
                <td className="p-3">
                  {p.onPromo && <span className="text-xs text-red-500 line-through mr-1">{formatG(p.priceNormal)}</span>}
                  <span className="font-semibold">{formatG(p.priceWeb)} Gs.</span>
                </td>
                <td className="p-3">
                  <span className={`font-bold ${p.stock === 0 ? "text-red-600" : p.stock < 5 ? "text-yellow-600" : "text-green-600"}`}>
                    {p.stock}
                  </span>
                </td>
                <td className="p-3">
                  <form action={async () => { "use server"; await toggleFeatured(p.id, p.featured); }}>
                    <button type="submit" className={`w-8 h-8 rounded ${p.featured ? "bg-yellow-400" : "bg-gray-200"}`}>
                      {p.featured ? "★" : "☆"}
                    </button>
                  </form>
                </td>
                <td className="p-3">
                  <form action={async () => { "use server"; await togglePublished(p.id, p.published); }}>
                    <button type="submit" className={`px-2 py-0.5 rounded text-xs ${p.published ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {p.published ? "Sí" : "No"}
                    </button>
                  </form>
                </td>
                <td className="p-3">
                  <form action={updateTitleOverride.bind(null, p.id)} className="flex gap-1">
                    <input name="titleOverride" defaultValue={p.titleOverride ?? ""} placeholder="Override..." className="border rounded px-1 py-0.5 text-xs w-32" />
                    <button type="submit" className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">OK</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {Math.ceil(total / limit) > 1 && (
        <div className="flex gap-2 mt-4 justify-center">
          {Array.from({ length: Math.ceil(total / limit) }, (_, i) => i + 1).map((p) => (
            <a key={p} href={`/admin/products?page=${p}${q ? `&q=${q}` : ""}`} className={`px-3 py-1 rounded ${p === page ? "bg-green-600 text-white" : "bg-white border"}`}>{p}</a>
          ))}
        </div>
      )}
    </div>
  );
}
