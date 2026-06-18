"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@/types";

interface AuthCtx {
  user: User | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; message: string }>;
  register: (data: { email: string; password: string; firstName: string; lastName: string; phone?: string }) => Promise<{ ok: boolean; message: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // On mount, check session via /api/auth/me
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setUser(data);
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, message: data.error ?? "Error al iniciar sesión" };
      setUser(data);
      return { ok: true, message: "Sesión iniciada" };
    } catch {
      return { ok: false, message: "Error de conexión" };
    }
  }, []);

  const register = useCallback(async (formData: { email: string; password: string; firstName: string; lastName: string; phone?: string }) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, message: data.error ?? "Error al registrarse" };
      setUser(data);
      return { ok: true, message: "Cuenta creada" };
    } catch {
      return { ok: false, message: "Error de conexión" };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch { /* ignore */ }
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch { /* ignore */ }
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({ user, isLoggedIn: !!user, login, register, logout, refresh }),
    [user, login, register, logout, refresh],
  );

  if (!hydrated) return null; // Don't render until session check completes

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
