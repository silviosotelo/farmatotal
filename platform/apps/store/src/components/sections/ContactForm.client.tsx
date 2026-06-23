"use client";

import { useState } from "react";
import { Input, Button } from "@platform/ui";
import { useToast } from "@/components/providers/ToastContext";

export function ContactFormFields() {
  const { toast } = useToast();
  const [form, setForm] = useState({ nombre: "", email: "", asunto: "", mensaje: "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    toast("El envío de mensajes aún no está disponible. Intentá por los datos de contacto.", "error");
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="c-nombre" className="mb-1 block text-sm text-brand-text">Nombre *</label>
          <Input id="c-nombre" required value={form.nombre} onChange={set("nombre")} />
        </div>
        <div>
          <label htmlFor="c-email" className="mb-1 block text-sm text-brand-text">Correo electrónico *</label>
          <Input id="c-email" type="email" inputMode="email" required value={form.email} onChange={set("email")} />
        </div>
      </div>
      <div>
        <label htmlFor="c-asunto" className="mb-1 block text-sm text-brand-text">Asunto</label>
        <Input id="c-asunto" value={form.asunto} onChange={set("asunto")} />
      </div>
      <div>
        <label htmlFor="c-mensaje" className="mb-1 block text-sm text-brand-text">Mensaje *</label>
        <Input textArea id="c-mensaje" required rows={5} value={form.mensaje} onChange={set("mensaje")} className="resize-y" />
      </div>
      <p role="note" className="rounded-md border border-[#f0d8b0] bg-[#fff7ec] px-3 py-2 text-xs text-brand-muted">
        El envío de mensajes está pendiente de conexión con el backend. Mientras tanto, escribinos usando los datos de contacto.
      </p>
      <Button
        type="submit"
        variant="solid"
        shape="round"
        className="brand-gradient h-[44px] w-fit px-8 text-sm font-semibold"
      >
        Enviar mensaje
      </Button>
    </form>
  );
}
