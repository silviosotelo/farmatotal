import { getSetting } from "@/lib/api";
import { ContactFormFields } from "./ContactForm.client";

/**
 * Datos de contacto del tenant. Se leen de forma DEFENSIVA desde los settings
 * (`store_config` / `footer_config`) porque los tipos tipados de esas configs
 * no incluyen contacto: usamos getSetting (raw) para no perder campos que el
 * tipo recorta. Si un campo no está configurado, NO se renderiza (white-label:
 * sin teléfono/email/dirección/horario hardcodeados).
 */
type ContactInfo = {
  phone?: string;
  email?: string;
  address?: string;
  hours?: string;
};

type RawContactConfig = Partial<ContactInfo> & {
  // alias en español que podría usar el admin
  telefono?: string;
  direccion?: string;
  horario?: string;
  contact?: Partial<ContactInfo> & { telefono?: string; direccion?: string; horario?: string };
};

function pickContact(...sources: (RawContactConfig | null | undefined)[]): ContactInfo {
  const out: ContactInfo = {};
  for (const s of sources) {
    if (!s) continue;
    const c = { ...s, ...(s.contact ?? {}) };
    out.phone = out.phone || c.phone || c.telefono || undefined;
    out.email = out.email || c.email || undefined;
    out.address = out.address || c.address || c.direccion || undefined;
    out.hours = out.hours || c.hours || c.horario || undefined;
  }
  return out;
}

export async function ContactForm() {
  const [storeCfg, footerCfg] = await Promise.all([
    getSetting<RawContactConfig>("store_config"),
    getSetting<RawContactConfig>("footer_config"),
  ]);
  const info = pickContact(storeCfg, footerCfg);

  const rows: { label: string; value: string }[] = [
    info.phone && { label: "Teléfono", value: info.phone },
    info.email && { label: "Correo", value: info.email },
    info.address && { label: "Dirección", value: info.address },
    info.hours && { label: "Horario", value: info.hours },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      <ContactFormFields />

      {rows.length > 0 && (
        <aside className="rounded-[10px] border border-[#ededf1] bg-search-bg p-6 text-sm">
          <h2 className="mb-3 font-heading text-lg font-bold text-brand-text">Datos de contacto</h2>
          <ul className="flex flex-col gap-3 text-brand-muted">
            {rows.map((r) => (
              <li key={r.label}>
                <span className="font-medium text-brand-text">{r.label}:</span> {r.value}
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}
