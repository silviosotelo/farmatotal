"use client";

import { useState } from "react";
import { useToast } from "@/components/providers/ToastContext";

const inputClass =
  "w-full bg-search-bg rounded-md h-11 px-3 text-sm outline-none border border-transparent focus-visible:ring-2 focus-visible:ring-brand-orange/40";

/**
 * Formulario de contacto (parte interactiva).
 *
 * IMPORTANTE: el API (apps/api) NO expone hoy un endpoint público de
 * contacto/mensajería — el módulo `mailer` es solo de administración
 * (plantillas/cola/config/test) y no hay ruta de leads. Por eso el envío
 * queda deshabilitado de forma HONESTA: se muestra un aviso visible y, al
 * intentar enviar, un mensaje de error real (no un "enviado" falso).
 *
 * TODO(backend): conectar a un endpoint público (p. ej. POST /contact o
 * POST /leads en apps/api) cuando exista; entonces reemplazar el handler por
 * la llamada real vía el helper de @/lib/api.
 */
export function ContactFormFields() {
  const { toast } = useToast();
  const [form, setForm] = useState({ nombre: "", email: "", asunto: "", mensaje: "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Sin backend de contacto: no se simula un envío exitoso.
    toast("El envío de mensajes aún no está disponible. Intentá por los datos de contacto.", "error");
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="c-nombre" className="mb-1 block text-sm text-brand-text">Nombre *</label>
          <input id="c-nombre" required value={form.nombre} onChange={set("nombre")} className={inputClass} />
        </div>
        <div>
          <label htmlFor="c-email" className="mb-1 block text-sm text-brand-text">Correo electrónico *</label>
          <input id="c-email" type="email" inputMode="email" required value={form.email} onChange={set("email")} className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor="c-asunto" className="mb-1 block text-sm text-brand-text">Asunto</label>
        <input id="c-asunto" value={form.asunto} onChange={set("asunto")} className={inputClass} />
      </div>
      <div>
        <label htmlFor="c-mensaje" className="mb-1 block text-sm text-brand-text">Mensaje *</label>
        <textarea id="c-mensaje" required rows={5} value={form.mensaje} onChange={set("mensaje")} className={inputClass.replace("h-11", "py-2") + " resize-y"} />
      </div>
      <p role="note" className="rounded-md border border-[#f0d8b0] bg-[#fff7ec] px-3 py-2 text-xs text-brand-muted">
        El envío de mensajes está pendiente de conexión con el backend. Mientras tanto, escribinos usando los datos de contacto.
      </p>
      <button type="submit" className="brand-gradient focus-ring h-[44px] w-fit rounded-[30px] px-8 text-sm font-semibold text-white">
        Enviar mensaje
      </button>
    </form>
  );
}
