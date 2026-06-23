"use client";

import { useState } from "react";
import Link from "next/link";
import { Input, Button } from "@platform/ui";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useToast } from "@/components/providers/ToastContext";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const FORGOT_PASSWORD_ENDPOINT = "/auth/forgot-password";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Status = "idle" | "loading" | "sent" | "error";

export default function RecoverPasswordFallback() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      toast("Ingresá un correo válido", "error");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch(`${API}${FORGOT_PASSWORD_ENDPOINT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        const detail =
          res.status === 404
            ? "El servicio de recuperación no está disponible todavía. Intentá más tarde."
            : (body?.message ?? "No pudimos procesar tu solicitud. Intentá nuevamente.");
        setStatus("error");
        toast(detail, "error");
        return;
      }
      setStatus("sent");
      toast("Si el correo existe, te enviamos un enlace de recuperación.", "success");
      setEmail("");
    } catch {
      setStatus("error");
      toast("No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.", "error");
    }
  }

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
              <Input
                id="r-email"
                type="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              variant="solid"
              shape="round"
              loading={status === "loading"}
              disabled={status === "loading"}
              block
              className="brand-gradient h-[48px] text-sm font-semibold"
            >
              {status === "loading" ? "Enviando…" : "Enviar enlace"}
            </Button>
            <Link href="/mi-cuenta" className="focus-ring rounded-sm text-center text-sm text-brand-orange-ink hover:underline">
              Volver a iniciar sesión
            </Link>
          </form>
        </div>
      </div>
    </main>
  );
}
