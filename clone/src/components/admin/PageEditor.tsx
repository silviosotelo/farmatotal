"use client";

import { useState, useTransition } from "react";

interface Block {
  id: string;
  type: string;
  props: Record<string, unknown>;
}

const BLOCK_TYPES = [
  { type: "HERO_SLIDER", label: "Hero Slider", icon: "🖼️" },
  { type: "CATEGORY_GRID", label: "Grilla de Categorías", icon: "📂" },
  { type: "PRODUCT_CAROUSEL", label: "Carrusel de Productos", icon: "🎠" },
  { type: "PRODUCT_DEALS", label: "Ofertas / Súper Rombo", icon: "🔥" },
  { type: "SHOP_BANNER", label: "Banner Publicitario", icon: "📢" },
  { type: "RICH_TEXT", label: "Texto Enriquecido", icon: "📝" },
  { type: "FEATURED_PRODUCTS", label: "Productos Destacados", icon: "⭐" },
  { type: "NEWSLETTER", label: "Newsletter", icon: "📧" },
  { type: "FAQ", label: "Preguntas Frecuentes", icon: "❓" },
  { type: "CONTACT_FORM", label: "Formulario de Contacto", icon: "📬" },
  { type: "MAP", label: "Mapa", icon: "🗺️" },
  { type: "CUSTOM_HTML", label: "HTML Personalizado", icon: "💻" },
];

let blockCounter = 0;
function newId() {
  return `block-${Date.now()}-${++blockCounter}`;
}

export default function PageEditor({
  page,
  saveAction,
  publishAction,
}: {
  page: { id: string; slug: string; title: string; blocks: string; status: string };
  saveAction: (formData: FormData) => Promise<void>;
  publishAction: () => Promise<void>;
}) {
  const [blocks, setBlocks] = useState<Block[]>(() => {
    try { return JSON.parse(page.blocks); } catch { return []; }
  });
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [isPending, startTransition] = useTransition();

  function addBlock(type: string) {
    setBlocks((prev) => [...prev, { id: newId(), type, props: {} }]);
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function moveBlock(id: string, direction: "up" | "down") {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function updateBlockProps(id: string, key: string, value: unknown) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, props: { ...b.props, [key]: value } } : b))
    );
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Left: Settings */}
      <div className="col-span-1 space-y-4">
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-semibold mb-3">Propiedades</h3>
          <label className="text-xs text-gray-500 block mb-1">Título</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="border rounded px-2 py-1.5 w-full mb-3" />
          <label className="text-xs text-gray-500 block mb-1">Slug</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className="border rounded px-2 py-1.5 w-full mb-3 font-mono text-sm" />
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${page.status === "PUBLISHED" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
            {page.status}
          </span>
        </div>

        {/* Add block */}
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-semibold mb-3">Agregar bloque</h3>
          <div className="grid grid-cols-2 gap-2">
            {BLOCK_TYPES.map((bt) => (
              <button
                key={bt.type}
                onClick={() => addBlock(bt.type)}
                className="flex items-center gap-1 p-2 border rounded-lg text-xs hover:bg-green-50 hover:border-green-300 transition-colors"
              >
                <span>{bt.icon}</span>
                <span>{bt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Block list */}
      <div className="col-span-2">
        <form action={saveAction}>
          <input type="hidden" name="title" value={title} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="blocks" value={JSON.stringify(blocks)} />
          <input type="hidden" name="status" value={page.status} />

          <div className="space-y-3 mb-4">
            {blocks.map((block, idx) => {
              const bt = BLOCK_TYPES.find((t) => t.type === block.type);
              return (
                <div key={block.id} className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{bt?.icon ?? "📦"}</span>
                      <span className="font-medium text-sm">{bt?.label ?? block.type}</span>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => moveBlock(block.id, "up")} disabled={idx === 0} className="px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-30">↑</button>
                      <button type="button" onClick={() => moveBlock(block.id, "down")} disabled={idx === blocks.length - 1} className="px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-30">↓</button>
                      <button type="button" onClick={() => removeBlock(block.id)} className="px-2 py-1 text-xs border rounded text-red-600 hover:bg-red-50">✕</button>
                    </div>
                  </div>
                  {/* Block props editor */}
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(block.props).map(([key, val]) => (
                      <div key={key}>
                        <label className="text-xs text-gray-400">{key}</label>
                        <input
                          value={typeof val === "string" ? val : JSON.stringify(val)}
                          onChange={(e) => {
                            let v: unknown = e.target.value;
                            try { v = JSON.parse(e.target.value); } catch {}
                            updateBlockProps(block.id, key, v);
                          }}
                          className="border rounded px-2 py-1 w-full text-xs font-mono"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => updateBlockProps(block.id, `prop${Object.keys(block.props).length + 1}`, "")}
                      className="text-xs text-green-600 hover:underline"
                    >
                      + Agregar propiedad
                    </button>
                  </div>
                </div>
              );
            })}
            {blocks.length === 0 && (
              <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-400 border-2 border-dashed">
                Agregá bloques desde el panel izquierdo
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={isPending} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">
              {isPending ? "Guardando..." : "Guardar borrador"}
            </button>
            <button type="button" onClick={() => startTransition(() => publishAction())} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              Publicar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
