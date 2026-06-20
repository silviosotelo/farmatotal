"use client";

import { useState } from "react";
import { useToast } from "@/components/providers/ToastContext";

const inputClass =
  "w-full bg-search-bg rounded-md h-11 px-3 text-sm outline-none border border-transparent focus-visible:ring-2 focus-visible:ring-brand-orange/40";

export function ContactForm() {
  const { toast } = useToast();
  const [form, setForm] = useState({ nombre: "", email: "", asunto: "", mensaje: "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    toast("Mensaje enviado. Te responderemos a la brevedad.");
    setForm({ nombre: "", email: "", asunto: "", mensaje: "" });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
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
        <button type="submit" className="brand-gradient focus-ring h-[44px] w-fit rounded-[30px] px-8 text-sm font-semibold text-white">
          Enviar mensaje
        </button>
      </form>

      <aside className="rounded-[10px] border border-[#ededf1] bg-search-bg p-6 text-sm">
        <h2 className="mb-3 font-heading text-lg font-bold text-brand-text">Datos de contacto</h2>
        <ul className="flex flex-col gap-3 text-brand-muted">
          <li><span className="font-medium text-brand-text">Teléfono:</span> 021 000 000</li>
          <li><span className="font-medium text-brand-text">Correo:</span> contacto@farmatotal.com.py</li>
          <li><span className="font-medium text-brand-text">Dirección:</span> Asunción, Paraguay</li>
          <li><span className="font-medium text-brand-text">Horario:</span> Lun a Sáb 8:00–20:00</li>
        </ul>
      </aside>
    </div>
  );
}
