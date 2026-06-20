import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function updateProduct(productId: string, formData: FormData) {
  "use server";
  const titleOverride = formData.get("titleOverride") as string;
  const descriptionOverride = formData.get("descriptionOverride") as string;
  const slugOverride = formData.get("slugOverride") as string;
  const seoTitle = formData.get("seoTitle") as string;
  const seoDescription = formData.get("seoDescription") as string;
  const priceWeb = Number(formData.get("priceWeb"));
  const onPromo = formData.get("onPromo") === "on";
  const featured = formData.get("featured") === "on";
  const published = formData.get("published") === "on";
  const controlled = formData.get("controlled") === "on";
  const categoryId = formData.get("categoryId") as string;

  await db.product.update({
    where: { id: productId },
    data: {
      titleOverride: titleOverride || null,
      descriptionOverride: descriptionOverride || null,
      slugOverride: slugOverride || null,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      priceWeb: priceWeb || undefined,
      onPromo,
      featured,
      published,
      controlled,
      categoryId: categoryId || null,
    },
  });

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
}

export default async function AdminProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [product, categories] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: { images: true, category: true, inventory: { include: { branch: true } } },
    }),
    db.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!product) notFound();

  const formatG = (n: number) => new Intl.NumberFormat("es-PY").format(n);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Editar: {product.title}</h1>

      <div className="grid grid-cols-3 gap-6">
        {/* Main form */}
        <div className="col-span-2">
          <form action={updateProduct.bind(null, id)} className="space-y-4">
            {/* ERP Data (read-only) */}
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-semibold mb-3 text-gray-500">Datos ERP (solo lectura)</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">SKU:</span>
                  <span className="ml-2 font-mono">{product.sku}</span>
                </div>
                <div>
                  <span className="text-gray-400">Cod Interno:</span>
                  <span className="ml-2 font-mono">{product.codInterno ?? "—"}</span>
                </div>
                <div>
                  <span className="text-gray-400">Título ERP:</span>
                  <span className="ml-2">{product.title}</span>
                </div>
                <div>
                  <span className="text-gray-400">Marca:</span>
                  <span className="ml-2">{product.brand ?? "—"}</span>
                </div>
                <div>
                  <span className="text-gray-400">Precio Normal:</span>
                  <span className="ml-2 font-semibold">{formatG(product.priceNormal)} Gs.</span>
                </div>
                <div>
                  <span className="text-gray-400">Slug ERP:</span>
                  <span className="ml-2 font-mono">{product.slug}</span>
                </div>
              </div>
            </div>

            {/* Web Overrides */}
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-semibold mb-3">Overrides Web</h2>
              <p className="text-xs text-gray-400 mb-3">Dejá vacío para usar el valor del ERP.</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">Título override</label>
                  <input name="titleOverride" defaultValue={product.titleOverride ?? ""} className="border rounded px-2 py-1.5 w-full text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Descripción override</label>
                  <textarea name="descriptionOverride" defaultValue={product.descriptionOverride ?? ""} rows={3} className="border rounded px-2 py-1.5 w-full text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Slug override</label>
                  <input name="slugOverride" defaultValue={product.slugOverride ?? ""} className="border rounded px-2 py-1.5 w-full text-sm font-mono" />
                </div>
              </div>
            </div>

            {/* SEO */}
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-semibold mb-3">SEO</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">SEO Title</label>
                  <input name="seoTitle" defaultValue={product.seoTitle ?? ""} className="border rounded px-2 py-1.5 w-full text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">SEO Description</label>
                  <textarea name="seoDescription" defaultValue={product.seoDescription ?? ""} rows={2} className="border rounded px-2 py-1.5 w-full text-sm" />
                </div>
              </div>
            </div>

            {/* Pricing & Flags */}
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-semibold mb-3">Precio y Flags</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Precio Web (Gs.)</label>
                  <input name="priceWeb" type="number" defaultValue={product.priceWeb} className="border rounded px-2 py-1.5 w-full text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Categoría</label>
                  <select name="categoryId" defaultValue={product.categoryId ?? ""} className="border rounded px-2 py-1.5 w-full text-sm">
                    <option value="">Sin categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2">
                  <input name="onPromo" type="checkbox" defaultChecked={product.onPromo} className="rounded" />
                  <span className="text-sm">En promo</span>
                </label>
                <label className="flex items-center gap-2">
                  <input name="featured" type="checkbox" defaultChecked={product.featured} className="rounded" />
                  <span className="text-sm">Destacado</span>
                </label>
                <label className="flex items-center gap-2">
                  <input name="published" type="checkbox" defaultChecked={product.published} className="rounded" />
                  <span className="text-sm">Publicado</span>
                </label>
                <label className="flex items-center gap-2">
                  <input name="controlled" type="checkbox" defaultChecked={product.controlled} className="rounded" />
                  <span className="text-sm">Controlado (receta)</span>
                </label>
              </div>
            </div>

            <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
              Guardar cambios
            </button>
          </form>
        </div>

        {/* Sidebar: Images & Stock */}
        <div className="space-y-4">
          {/* Images */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold mb-3">Imágenes</h2>
            {product.images.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {product.images.map((img) => (
                  <div key={img.id} className="aspect-square bg-gray-100 rounded overflow-hidden">
                    <img src={img.url} alt={img.alt ?? ""} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin imágenes</p>
            )}
          </div>

          {/* Stock by branch */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold mb-3">Stock por sucursal</h2>
            <p className="text-sm mb-2">Total: <span className="font-bold">{product.stock}</span></p>
            {product.inventory.length > 0 ? (
              <ul className="space-y-1">
                {product.inventory.map((inv) => (
                  <li key={inv.branchId} className="flex justify-between text-sm">
                    <span className="text-gray-600">{inv.branch.name}</span>
                    <span className={`font-bold ${inv.quantity === 0 ? "text-red-600" : "text-green-600"}`}>{inv.quantity}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">Sin inventario asignado</p>
            )}
          </div>

          {/* Product info */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold mb-3">Info</h2>
            <div className="text-sm space-y-1 text-gray-600">
              <p>ID: <span className="font-mono text-xs">{product.id}</span></p>
              <p>ERP Source: {product.erpSourced ? "Sí" : "No"}</p>
              <p>Creado: {product.createdAt.toLocaleDateString("es-PY")}</p>
              <p>Sync: {product.syncedAt.toLocaleDateString("es-PY")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
