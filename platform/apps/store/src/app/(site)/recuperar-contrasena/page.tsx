"use client";

import { useState } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useToast } from "@/components/providers/ToastContext";

export default function RecuperarContrasenaPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return toast("Ingresá un correo válido", "error");
    toast("Si el correo existe, te enviamos un enlace de recuperación.");
    setEmail("");
  };

  return (
    <main className="flex-1">
      <Breadcrumbs items={[{ label: "Recuperar contraseña" }]} />
      <div className="ft-container max-w-md py-10">
        <div className="rounded-[10px] border border-[#ededf1] p-8">
          <h1 className="mb-2 font-heading text-xl font-bold text-brand-text">Recuperar contraseña</h1>
          <p className="mb-5 text-sm text-brand-muted">
            Ingresá tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
          </p>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="r-email" className="mb-1 block text-sm text-brand-text">Correo electrónico *</label>
              <input
                id="r-email"
                type="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-search-bg rounded-md h-11 px-3 text-sm outline-none border border-transparent focus-visible:ring-2 focus-visible:ring-brand-orange/40"
              />
            </div>
            <button type="submit" className="brand-gradient focus-ring h-[48px] w-full rounded-[8px] text-sm font-semibold text-white">
              Enviar enlace
            </button>
            <Link href="/mi-cuenta" className="focus-ring rounded-sm text-center text-sm text-brand-orange-ink hover:underline">
              Volver a iniciar sesión
            </Link>
          </form>
        </div>
      </div>
    </main>
  );
}
