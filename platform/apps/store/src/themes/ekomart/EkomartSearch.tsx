"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Button } from "@platform/ui";

/**
 * Buscador del header Ekomart. Cliente: maneja el estado del input y navega
 * a /productos?q=... al enviar.
 */
export function EkomartSearch() {
  const router = useRouter();
  const [term, setTerm] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    router.push(q ? `/productos?q=${encodeURIComponent(q)}` : "/productos");
  };

  return (
    <form onSubmit={handleSubmit} className="search-header" autoComplete="off">
      <Input
        type="text"
        placeholder="Buscar productos..."
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
      <Button type="submit" variant="plain" className="rts-btn btn-primary search-btn-inline" aria-label="Buscar">
        <i className="fa-light fa-magnifying-glass" />
      </Button>
    </form>
  );
}
