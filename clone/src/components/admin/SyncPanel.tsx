"use client";

import { useState } from "react";

interface SyncResult {
  ok: boolean;
  type: string;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  errors: string[];
  duration: number;
  dryRun: boolean;
  preview?: Record<string, unknown>[];
}

const DEFAULT_PRODUCT_MAPPINGS = [
  { source: "art_codigo", target: "sku" },
  { source: "art_desc", target: "title" },
  { source: "art_descripcion_larga", target: "description" },
  { source: "art_marca", target: "brand" },
  { source: "art_precio_vta", target: "priceNormal", transform: "int" },
  { source: "art_precio_promo", target: "priceWeb", transform: "int" },
  { source: "art_ind_promo", target: "onPromo", transform: "bool" },
  { source: "art_cod_promo", target: "promoCode" },
  { source: "art_controlado", target: "controlled", transform: "bool" },
  { source: "art_ind_destacado", target: "featured", transform: "bool" },
];

const DEFAULT_STOCK_MAPPINGS = [
  { source: "art_codigo", target: "sku" },
  { source: "branch_id", target: "branchId" },
  { source: "quantity", target: "quantity", transform: "int" },
];

export default function SyncPanel() {
  const [syncType, setSyncType] = useState<"products" | "stock" | "categories">("products");
  const [data, setData] = useState("");
  const [mappings, setMappings] = useState(JSON.stringify(DEFAULT_PRODUCT_MAPPINGS, null, 2));
  const [dryRun, setDryRun] = useState(true);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runSync() {
    setError("");
    setResult(null);
    setLoading(true);

    try {
      let parsedData: Record<string, unknown>[];
      try {
        parsedData = JSON.parse(data);
        if (!Array.isArray(parsedData)) throw new Error("Data must be a JSON array");
      } catch (e) {
        setError(`Data JSON inválido: ${e instanceof Error ? e.message : String(e)}`);
        setLoading(false);
        return;
      }

      let parsedMappings;
      try {
        parsedMappings = JSON.parse(mappings);
      } catch (e) {
        setError(`Mappings JSON inválido: ${e instanceof Error ? e.message : String(e)}`);
        setLoading(false);
        return;
      }

      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: syncType,
          dryRun,
          data: parsedData,
          mappings: parsedMappings,
        }),
      });

      const resultData = await res.json();
      if (!res.ok) {
        setError(resultData.error ?? "Error en sync");
      } else {
        setResult(resultData);
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  function updateMappingType(type: string) {
    if (type === "products") setMappings(JSON.stringify(DEFAULT_PRODUCT_MAPPINGS, null, 2));
    else if (type === "stock") setMappings(JSON.stringify(DEFAULT_STOCK_MAPPINGS, null, 2));
    setSyncType(type as "products" | "stock" | "categories");
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="font-semibold text-lg mb-4">Ejecutar Sync</h2>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Input */}
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-500 block mb-1">Tipo de sync</label>
            <select
              value={syncType}
              onChange={(e) => updateMappingType(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full text-sm"
            >
              <option value="products">Productos</option>
              <option value="stock">Stock</option>
              <option value="categories">Categorías</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-500 block mb-1">Datos (JSON array)</label>
            <textarea
              value={data}
              onChange={(e) => setData(e.target.value)}
              rows={8}
              className="border rounded-lg px-3 py-2 w-full text-sm font-mono"
              placeholder={`[{"art_codigo":"779001","art_desc":"Paracetamol","art_precio_vta":9000}]`}
            />
          </div>

          <div>
            <label className="text-sm text-gray-500 block mb-1">Mappings (JSON)</label>
            <textarea
              value={mappings}
              onChange={(e) => setMappings(e.target.value)}
              rows={6}
              className="border rounded-lg px-3 py-2 w-full text-sm font-mono"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} className="rounded" />
              <span className="text-sm">Dry run (preview)</span>
            </label>
            <button
              onClick={runSync}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
            >
              {loading ? "Ejecutando..." : dryRun ? "Preview" : "Ejecutar Sync"}
            </button>
          </div>
        </div>

        {/* Right: Results */}
        <div>
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4 text-sm">{error}</div>
          )}

          {result && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${result.ok ? "bg-green-50" : "bg-yellow-50"}`}>
                <p className="font-semibold text-sm">{result.dryRun ? "Preview" : "Resultado"}</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <div>Procesados: <span className="font-bold">{result.itemsProcessed}</span></div>
                  <div>Creados: <span className="font-bold text-green-600">{result.itemsCreated}</span></div>
                  <div>Actualizados: <span className="font-bold text-blue-600">{result.itemsUpdated}</span></div>
                  <div>Omitidos: <span className="font-bold text-yellow-600">{result.itemsSkipped}</span></div>
                  <div>Duración: <span className="font-bold">{result.duration}ms</span></div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="font-semibold text-sm text-red-700 mb-2">Errores ({result.errors.length})</p>
                  <ul className="text-xs text-red-600 space-y-1 max-h-40 overflow-auto">
                    {result.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}

              {result.preview && result.preview.length > 0 && (
                <div>
                  <p className="font-semibold text-sm mb-2">Preview ({result.preview.length} items)</p>
                  <div className="max-h-60 overflow-auto border rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {Object.keys(result.preview[0]).map((key) => (
                            <th key={key} className="p-2 text-left font-mono">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.preview.slice(0, 10).map((row, i) => (
                          <tr key={i} className="border-t">
                            {Object.values(row).map((val, j) => (
                              <td key={j} className="p-2 truncate max-w-32">{String(val ?? "")}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {!result && !error && (
            <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-400">
              <p>Pegá los datos JSON y ejecutá un dry run para preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
