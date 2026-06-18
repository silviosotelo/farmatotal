"use client";

import { useState } from "react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useToast } from "@/components/providers/ToastContext";
import { cn } from "@/lib/utils";

const STEPS = ["Recibido", "En preparación", "Listo para retiro", "Entregado"];
const inputClass =
  "w-full bg-search-bg rounded-md h-11 px-3 text-sm outline-none border border-transparent focus-visible:ring-2 focus-visible:ring-brand-orange/40";

export default function RastrearPedidoPage() {
  const { toast } = useToast();
  const [nro, setNro] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const activeStep = 1; // mock: "En preparación"

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nro.trim()) return toast("Ingresá el número de pedido", "error");
    setResult(nro.trim().toUpperCase());
  };

  return (
    <main className="flex-1">
      <Breadcrumbs items={[{ label: "¿Donde está mi pedido?" }]} />
      <div className="ft-container max-w-2xl py-8">
        <h1 className="mb-2 font-heading text-2xl font-bold text-brand-text">¿Dónde está mi pedido?</h1>
        <p className="mb-6 text-sm text-brand-muted">Ingresá el número de pedido y el correo con el que compraste.</p>

        <form onSubmit={submit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="t-nro" className="mb-1 block text-sm text-brand-text">N° de pedido *</label>
            <input id="t-nro" placeholder="FT-10432" value={nro} onChange={(e) => setNro(e.target.value)} className={inputClass} />
          </div>
          <div className="flex-1">
            <label htmlFor="t-email" className="mb-1 block text-sm text-brand-text">Correo</label>
            <input id="t-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>
          <button type="submit" className="brand-gradient focus-ring h-[44px] shrink-0 rounded-[30px] px-8 text-sm font-semibold text-white">
            Rastrear
          </button>
        </form>

        {result && (
          <div className="mt-8 rounded-[10px] border border-[#ededf1] p-6">
            <p className="mb-6 text-sm">
              Pedido <span className="font-bold text-brand-text">{result}</span> —{" "}
              <span className="font-medium text-brand-orange-ink">{STEPS[activeStep]}</span>
            </p>
            <ol className="flex items-center">
              {STEPS.map((s, i) => (
                <li key={s} className="flex flex-1 flex-col items-center text-center last:flex-none">
                  <div className="flex w-full items-center">
                    <span
                      className={cn(
                        "z-10 flex size-8 items-center justify-center rounded-full text-xs font-bold",
                        i <= activeStep ? "bg-brand-orange text-white" : "bg-search-bg text-brand-muted",
                      )}
                    >
                      {i < activeStep ? "✓" : i + 1}
                    </span>
                    {i < STEPS.length - 1 && (
                      <span className={cn("h-1 flex-1", i < activeStep ? "bg-brand-orange" : "bg-[#ededf1]")} />
                    )}
                  </div>
                  <span className={cn("mt-2 text-xs", i <= activeStep ? "text-brand-text" : "text-brand-muted")}>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </main>
  );
}
