"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/components/providers/AuthContext";

/**
 * Display condition de autenticación: muestra/oculta según el estado de login.
 * `in` = solo logueados, `out` = solo anónimos. (Cliente: en SSR isLoggedIn es
 * false hasta hidratar, puede haber un breve flash — aceptable para v1.)
 */
export function AuthGate({ mode, children }: { mode: "in" | "out"; children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  if (mode === "in" && !isLoggedIn) return null;
  if (mode === "out" && isLoggedIn) return null;
  return <>{children}</>;
}
