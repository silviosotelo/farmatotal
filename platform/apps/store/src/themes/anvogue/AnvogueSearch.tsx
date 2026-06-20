"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

/**
 * Buscador del header Anvogue. Cliente: maneja el estado del input y navega
 * a /productos?q=... al enviar. Estética fashion (pill blanca, borde sutil).
 */
export function AnvogueSearch({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [term, setTerm] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    router.push(q ? `/productos?q=${encodeURIComponent(q)}` : "/productos");
  };

  return (
    <form
      onSubmit={handleSubmit}
      autoComplete="off"
      className={`relative w-full ${className}`}
    >
      <input
        type="text"
        placeholder="¿Qué estás buscando?"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        className="h-11 w-full rounded-full border border-[#E9E9E9] bg-white pl-5 pr-12 text-sm text-[#1F1F1F] placeholder:text-[#A0A0A0] focus:border-[#1F1F1F] focus:outline-none"
      />
      <button
        type="submit"
        aria-label="Buscar"
        className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#1F1F1F] text-white transition-colors hover:bg-[var(--brand-orange)]"
      >
        <Search size={18} />
      </button>
    </form>
  );
}
