"use client";

import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/components/providers/ToastContext";

/**
 * Bloque funcional "Recuperar contraseña" del builder: formulario que pide el
 * email y dispara el flujo de recuperación contra el API del tenant. Toda la
 * lógica (estado, validación, llamada real) embebida; se coloca/posiciona desde
 * el builder. Markup config-driven, white-label (sin marca/moneda hardcodeadas).
 *
 * IMPORTANTE — pendiente de backend: a la fecha apps/api NO expone un endpoint de
 * recuperación de contraseña (las rutas de /auth son login, refresh, logout,
 * bootstrap, register y me). Por eso el bloque:
 *   1) llama al endpoint REAL convenido (`/auth/forgot-password`) — no fake;
 *   2) muestra un aviso visible de "pendiente de backend";
 *   3) ante 404/error NO simula éxito: surface el error honesto.
 * Cuando el backend implemente la ruta, basta poner BACKEND_READY = true y el
 * bloque ya queda funcional sin más cambios.
 */

// Cliente: el API público se consume directo (igual que los hooks de lib/checkout.ts).
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Endpoint convenido para el flujo de recuperación. Cambiar acá si el backend lo
// expone con otro path.
const FORGOT_PASSWORD_ENDPOINT = "/auth/forgot-password";

// El backend aún NO implementa el endpoint (verificado en apps/api/modules/auth).
// Mientras sea false se muestra el aviso de "pendiente de backend". Poner true
// cuando la ruta exista.
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
        // 404 = endpoint aún no implementado en el backend (no fingimos éxito).
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
          <div
            role="status"
            className="mt-5 rounded-lg border border-brand-orange/40 bg-[#fff4ec] px-4 py-3 text-sm text-brand-orange"
          >
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
              <input
                id="recovery-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === "error") setStatus("idle");
                }}
                placeholder="tu@email.com"
                className="h-[44px] rounded-[8px] border border-[#ededf1] bg-search-bg px-4 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition-colors"
                aria-invalid={status === "error"}
              />
            </div>

            {status === "error" && message && (
              <p className="text-sm text-[#c0392b]" role="alert">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="brand-gradient focus-ring text-white rounded-[30px] h-[44px] px-6 text-sm font-semibold flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === "loading" ? "Enviando…" : submitLabel}
            </button>

            <Link
              href={loginHref}
              className="text-xs text-brand-muted hover:text-brand-orange transition-colors text-center underline"
            >
              Volver a iniciar sesión
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
