import { db } from "@/lib/db";
import SyncPanel from "@/components/admin/SyncPanel";

export default async function AdminSyncPage() {
  const logs = await db.erpSyncLog.findMany({
    orderBy: { ranAt: "desc" },
    take: 50,
  });

  const lastSync = logs[0];
  const lastSuccess = logs.find((l) => l.ok);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Sincronización ERP</h1>

      {/* Status cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Último sync</p>
          <p className="text-lg font-bold">{lastSync ? lastSync.ranAt.toLocaleString("es-PY") : "Nunca"}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Último exitoso</p>
          <p className="text-lg font-bold text-green-600">{lastSuccess ? lastSuccess.ranAt.toLocaleString("es-PY") : "Nunca"}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Total de syncs</p>
          <p className="text-lg font-bold">{logs.length}</p>
        </div>
      </div>

      {/* Sync Panel */}
      <SyncPanel />

      {/* Logs table */}
      <div className="bg-white rounded-xl shadow overflow-hidden mt-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="p-3">Fecha</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Items</th>
              <th className="p-3">Mensaje</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-3">{l.ranAt.toLocaleString("es-PY")}</td>
                <td className="p-3"><span className="px-2 py-0.5 rounded bg-gray-100 text-xs">{l.type}</span></td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${l.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {l.ok ? "OK" : "ERROR"}
                  </span>
                </td>
                <td className="p-3">{l.itemsCount}</td>
                <td className="p-3 text-gray-500 truncate max-w-64">{l.message ?? "—"}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400">Sin registros de sincronización</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
