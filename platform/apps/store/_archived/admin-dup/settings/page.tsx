import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function updateSetting(key: string, formData: FormData) {
  "use server";
  const value = formData.get("value") as string;
  try {
    JSON.parse(value); // validate JSON
    await db.siteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    revalidatePath("/admin/settings");
  } catch {
    // invalid JSON — ignore
  }
}

export default async function AdminSettingsPage() {
  const settings = await db.siteSetting.findMany({ orderBy: { key: "asc" } });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Configuración del Sitio</h1>
      <div className="space-y-4">
        {settings.map((s) => (
          <form key={s.key} action={updateSetting.bind(null, s.key)} className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">{s.key}</h3>
              <span className="text-xs text-gray-400">Actualizado: {s.updatedAt.toLocaleDateString("es-PY")}</span>
            </div>
            <textarea
              name="value"
              defaultValue={s.value}
              rows={4}
              className="w-full border rounded-lg p-2 font-mono text-xs"
            />
            <button type="submit" className="mt-2 bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-700">
              Guardar
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
