"use client";

import { useEffect, useState } from "react";
import { Button, Input } from "@platform/ui";
import type { Product } from "@/types";
import { type ReviewItem, submitReview } from "@/lib/api";
import { useToast } from "@/components/providers/ToastContext";
import { cn } from "@/lib/utils";

function Stars({ n }: { n: number }) {
  return (
    <span className="text-brand-orange" aria-label={`${n} de 5`}>
      {"★★★★★".slice(0, Math.round(n))}
      <span className="text-[#d9d9e0]">{"★★★★★".slice(Math.round(n))}</span>
    </span>
  );
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-PY", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function ReviewForm({ productId }: { productId: string }) {
  const { toast } = useToast();
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !body.trim()) return;
    setSending(true);
    try {
      await submitReview({ productId, author: author.trim(), rating, title: title.trim() || undefined, body: body.trim() });
      setDone(true);
      setAuthor("");
      setTitle("");
      setBody("");
      setRating(5);
      toast("¡Gracias! Tu valoración quedó pendiente de aprobación.");
    } catch {
      toast("No se pudo enviar la valoración. Intentá de nuevo.", "error");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <p className="rounded-md bg-[#f3f9f3] px-4 py-3 text-sm text-[#2d7a33]">
        ¡Gracias por tu valoración! Será publicada una vez aprobada.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex max-w-lg flex-col gap-3 border-t border-[#ededf1] pt-5">
      <h3 className="font-heading text-base font-bold text-brand-text">Dejá tu valoración</h3>
      <div className="flex items-center gap-2">
        <span className="text-sm text-brand-muted">Puntuación:</span>
        <div className="flex" role="radiogroup" aria-label="Puntuación">
          {[1, 2, 3, 4, 5].map((v) => (
            <Button
              key={v}
              type="button"
              variant="plain"
              onClick={() => setRating(v)}
              aria-label={`${v} estrellas`}
              aria-checked={rating === v}
              role="radio"
              className={cn("px-0.5 text-xl leading-none", v <= rating ? "text-brand-orange" : "text-[#d9d9e0]")}
            >
              ★
            </Button>
          ))}
        </div>
      </div>
      <Input
        type="text"
        placeholder="Tu nombre *"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        required
      />
      <Input
        type="text"
        placeholder="Título (opcional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Input
        textArea
        placeholder="Tu opinión *"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        rows={3}
      />
      <Button
        type="submit"
        variant="solid"
        shape="round"
        loading={sending}
        disabled={sending}
        className="self-start brand-gradient px-6 py-2.5 text-sm font-semibold"
      >
        {sending ? "Enviando…" : "Enviar valoración"}
      </Button>
    </form>
  );
}

export function ProductTabs({
  product,
  reviews,
  average = 0,
}: {
  product: Product;
  reviews: ReviewItem[];
  average?: number;
}) {
  const [tab, setTab] = useState<"desc" | "info" | "rev">("desc");
  const [customDefs, setCustomDefs] = useState<{ key: string; label: string }[]>([]);
  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${API}/cms/settings/mod_product_fields`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const fields = (d?.value?.fields ?? []) as { key: string; label: string; builtin?: boolean; enabled?: boolean }[];
        setCustomDefs(fields.filter((f) => !f.builtin && f.enabled !== false).map((f) => ({ key: f.key, label: f.label })));
      })
      .catch(() => {});
  }, []);
  const customRows = customDefs
    .map((d) => [d.label, product.custom?.[d.key]] as const)
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
    .map(([k, v]) => [k, typeof v === "boolean" ? (v ? "Sí" : "No") : String(v)] as [string, string]);
  const tabs = [
    { id: "desc" as const, label: "Descripción" },
    { id: "info" as const, label: "Información adicional" },
    { id: "rev" as const, label: `Valoraciones (${reviews.length})` },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-1 border-b border-[#ededf1]">
        {tabs.map((t) => (
          <Button
            key={t.id}
            type="button"
            variant="plain"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id}
            className={cn(
              "-mb-px rounded-t-md px-4 py-2.5 text-sm font-semibold transition",
              tab === t.id ? "border-b-2 border-brand-orange text-brand-text" : "text-brand-muted hover:text-brand-text",
            )}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <div className="py-5 text-sm leading-relaxed text-brand-text">
        {tab === "desc" && <p>{product.description}</p>}

        {tab === "info" && (
          <table className="w-full max-w-md border-collapse text-sm">
            <tbody>
              {[
                ["Marca", product.brand ?? "—"],
                ["SKU", product.sku ?? "—"],
                ["Categoría", product.category ?? "—"],
                ["Disponibilidad", product.stock === 0 ? "Sin stock" : "En stock"],
                ...customRows,
              ].map(([k, v]) => (
                <tr key={k} className="border-b border-[#ededf1]">
                  <th className="py-2 pr-4 text-left font-medium text-brand-muted">{k}</th>
                  <td className="py-2 text-brand-text">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "rev" && (
          <div>
            {reviews.length > 0 ? (
              <>
                <div className="mb-4 flex items-center gap-2">
                  <Stars n={average} />
                  <span className="text-sm font-medium text-brand-text">{average.toFixed(1)} / 5</span>
                  <span className="text-xs text-brand-muted">({reviews.length} valoraciones)</span>
                </div>
                <ul className="flex flex-col gap-4">
                  {reviews.map((r) => (
                    <li key={r.id} className="border-b border-[#ededf1] pb-4 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-brand-text">{r.author}</span>
                        <Stars n={r.rating} />
                        <span className="text-xs text-brand-muted">{fmtDate(r.createdAt)}</span>
                      </div>
                      {r.title && <p className="mt-1 font-medium text-brand-text">{r.title}</p>}
                      <p className="mt-1 text-brand-muted">{r.body}</p>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-brand-muted">Aún no hay valoraciones. ¡Sé el primero en opinar!</p>
            )}
            <ReviewForm productId={product.id} />
          </div>
        )}
      </div>
    </div>
  );
}
