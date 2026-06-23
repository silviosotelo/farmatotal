"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Notification } from "@platform/ui";

type ToastType = "success" | "error" | "info";
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastCtx {
  toast: (message: string, type?: ToastType) => void;
}

const Ctx = createContext<ToastCtx | null>(null);
let counter = 0;

// Ecme Notification uses "danger" instead of "error"
const toEcmeType = (t: ToastType) =>
  (t === "error" ? "danger" : t) as "success" | "danger" | "info";

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++counter;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[3000] flex flex-col gap-2">
        {toasts.map((t) => (
          <Notification
            key={t.id}
            type={toEcmeType(t.type)}
            closable
            duration={0}
            onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="pointer-events-auto"
          >
            {t.message}
          </Notification>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
