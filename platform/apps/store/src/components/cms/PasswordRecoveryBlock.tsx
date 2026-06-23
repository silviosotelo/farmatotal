"use client";

import Link from "next/link";
import { useState } from "react";
import { Input, Button } from "@platform/ui";
import { useToast } from "@/components/providers/ToastContext";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const FORGOT_PASSWORD_ENDPOINT = "/auth/forgot-password";
const BACKEND_READY = false;

type Status = "idle" | "loading" | "sent" | "error";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PasswordRecoveryBlock({
  title = "Recuperar contraseña",
  description = "Ingresá el email de tu cuenta y te enviaremos un enlace para restablecer tu contraseña.",
  submitLabel = "Enviar enlace de recuperación",
  successMessage = "Si el email existe, te enviamos las instrucciones para restablecer tu contraseña.",
  loginHref = "/mi-cuenta/",
}: {
  title?: string;
  description?: string;
  submitLabel?: string;
  successMessage?: string;
  loginHref?: string;
} = {}) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setStatus("error");
      setMessage("Ingresá un email válido.");
      return;
    }
    setStatus("loading");
    setMessage("");
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
        setMessage(detail);
        toast(detail, "error");
        return;
      }
      setStatus("sent");
      setMessage(successMessage);
      toast(successMessage, "success");
    } catch {
      const detail = "No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.";
      setStatus("error");
      setMessage(detail);
      toast(detail, "error");
    }
  }

  return (
    <div className="ft-container py-10 flex justify-center">
      <div className="w-full max-w-md border border-[#ededf1] rounded-xl p-6 sm:p-8 bg-white">
        <h2 className="font-heading text-2xl text-brand-text">{title}</h2>
        <p className="mt-2 text-sm text-brand-muted">{description}</p>

        {!BACKEND_READY && (
          <div role="status" className="mt-5 rounded-lg border border-brand-orange/40 bg-[#fff4ec] px-4 py-3 text-sm text-brand-orange">
            Pendiente de backend: el endpoint de recuperación de contraseña aún no
            está disponible en el API. El formulario queda listo y se activará
            automáticamente cuando el backend lo implemente.
          </div>
        )}

        {status === "sent" ? (
          <div className="mt-6">
            <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              {message}
            </p>
            <Link
              href={loginHref}
              className="mt-6 focus-ring text-brand-text border border-[#ededf1] rounded-[30px] h-[44px] px-6 text-sm font-semibold flex items-center justify-center hover:border-brand-orange hover:text-brand-orange transition-colors"
            >
              Volver a iniciar sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-2">
              <label htmlFor="recovery-email" className="text-sm font-semibold text-brand-text">
                Email
              </label>
              <Input
                id="recovery-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === "error") setStatus("idle");
                }}
                placeholder="tu@email.com"
                aria-invalid={status === "error"}
              />
            </div>

            {status === "error" && message && (
              <p className="text-sm text-[#c0392b]" role="alert">
                {message}
              </p>
            )}

            <Button
              type="submit"
              variant="solid"
              shape="round"
              loading={status === "loading"}
              disabled={status === "loading"}
              block
              className="brand-gradient h-[44px] text-sm font-semibold"
            >
              {status === "loading" ? "Enviando…" : submitLabel}
            </Button>

            <Link href={loginHref} className="text-xs text-brand-muted hover:text-brand-orange transition-colors text-center underline">
              Volver a iniciar sesión
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
