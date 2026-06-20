import { db } from "@/lib/db";
import Link from "next/link";

export default async function AdminPagesPage() {
  const pages = await db.page.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Páginas</h1>
        <Link href="/admin/pages/new" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm">
          + Nueva página
        </Link>
      </div>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="p-3">Título</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Bloques</th>
              <th className="p-3">Última edición</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => {
              const blocks = JSON.parse(p.blocks);
              return (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">
                    <Link href={`/admin/pages/${p.id}`} className="text-green-600 hover:underline font-medium">{p.title}</Link>
                  </td>
                  <td className="p-3 font-mono text-gray-500">/{p.slug}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${p.status === "PUBLISHED" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3">{blocks.length}</td>
                  <td className="p-3 text-gray-500">{p.updatedAt.toLocaleDateString("es-PY")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
