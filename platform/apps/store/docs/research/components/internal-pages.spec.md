# Internal Pages Spec (catalogo, producto, carrito, mi-cuenta)

Header/Footer/FloatingButtons are rendered by `src/app/layout.tsx` — each page renders ONLY its `<main>` content.

## Shared conventions
- Container: wrap content in `<div className="ft-container">` (max-width 1200px, px 15px).
- **Breadcrumb bar** at top of each page: light strip, `.ft-container py-4 text-sm text-brand-muted`, e.g. `Inicio / Catálogo` (links text-brand-muted hover:text-brand-orange, current item text-brand-text).
- Page heading: `font-heading` (Ubuntu) bold, color `#202435` (or `#7a7a7a` for section subheads).
- Primary button = `.brand-gradient text-white rounded-[30px] h-[44px] px-6 text-sm font-medium`.
- Reuse `ProductCard` (named import `@/components/ProductCard`) and `Carousel` (`@/components/ui/Carousel`) and data/`formatGs` from `@/lib/data`.
- Brand tokens: `bg-brand-orange text-brand-orange bg-brand-yellow text-brand-text text-brand-muted bg-search-bg`, `.brand-gradient`, `.font-price`.

## /catalogo  (`src/app/catalogo/page.tsx`)  — from screenshot `orig-catalogo.png`
- Breadcrumb `Inicio / Catálogo`.
- Toolbar row (border-bottom, py-3, flex items-center justify-between, flex-wrap):
  - Left: "FILTRAR POR PRECIO" label + a price range display `Price: ₲ 0 — ₲ 500.000` + a small `Filtrar` button (visual only). Plus grid/list view toggle icons (`GridIcon`) — visual.
  - Right: a `<select>` "Orden predeterminado / Ordenar por popularidad / Ordenar por los últimos / Ordenar por precio: bajo a alto / Ordenar por precio: alto a bajo" and a `<select>` Show "12 / 24 / 36". Style selects: border, rounded, h-10, px-3, text-sm.
- Product grid: 4 columns desktop (`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5`), render ~12 cards by repeating `[...SUPER_ROMBO_PRODUCTS, ...SELECCION_PRODUCTS]` (slice/duplicate to 12) → `<ProductCard product={p} />` (give unique keys).
- Simple pagination row below (centered): page numbers 1 2 3 with active = `bg-brand-orange text-white rounded`, others bordered. Visual only.

## /producto/[slug]  (`src/app/producto/[slug]/page.tsx`)  — standard WooCommerce/Bacola single product
- NEXT 16: `params` is a Promise → `export default async function Page({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; }`. Look up product in `[...SUPER_ROMBO_PRODUCTS, ...SELECCION_PRODUCTS]` by slug; fallback to the first product if not found.
- Breadcrumb `Inicio / Catálogo / <title>`.
- Two columns (lg:grid-cols-2 gap-10): LEFT = product image in a bordered rounded-[10px] square card (next/image, object-contain, padding). RIGHT = summary: discount badge, `h1` title (font-heading bold ~28px), price block (font-price: `Precio Normal` struck `text-price-muted`, `Precio Web: <bold>` text-brand-text ~26px), short description paragraph (lorem-ish in Spanish), quantity stepper (− input +) + `Añadir al carrito` primary button inline, meta lines `Categoría: ...  ·  SKU: ...`.
- Tabs (client component allowed, or static): "Descripción", "Información adicional", "Valoraciones (0)" — show a description paragraph.
- "Productos relacionados" heading + `Carousel` of `ProductCard` (data `SELECCION_PRODUCTS`, slideClassName basis-1/2 md:basis-1/3 lg:basis-1/4, showArrows, loop).
- This page (or its tabs/qty) may be split: keep page as a server component that imports a small `"use client"` sub-component for the quantity+tabs if needed, OR make the whole page client. Simplicity first.

## /carrito  (`src/app/carrito/page.tsx`)  — WooCommerce cart with sample items
- Breadcrumb `Inicio / Carrito`.
- Heading "Carrito".
- Cart table (desktop): columns Producto (image+name), Precio, Cantidad (stepper), Subtotal, remove (×). 2–3 sample rows from data. On mobile, stack as cards.
- Right/below: "Total del carrito" summary card (Subtotal, Envío, Total) + `Finalizar compra` primary button (→ /caja/) and a `Seguir comprando` link (→ /catalogo).
- Keep it static/visual. A client stepper is optional.

## /mi-cuenta  (`src/app/mi-cuenta/page.tsx`)  — WooCommerce login/register
- Breadcrumb `Inicio / Mi Cuenta`.
- Heading "Mi Cuenta".
- Two columns (lg:grid-cols-2 gap-10): LEFT card "Acceder" (login): email + password inputs + "Recuérdame" checkbox + `Acceder` primary button + "¿Olvidaste tu contraseña?" link. RIGHT card "Registrarse": email input + privacy text + `Registrarse` primary button.
- Inputs: `bg-search-bg rounded-md h-11 px-3 text-sm w-full`, labels small. Cards: `border border-[#ededf1] rounded-[10px] p-6`.

## Rules for all
- Each is a Next App Router page (`export default`). Do NOT render Header/Footer (layout handles them).
- `next/image` for images, `unoptimized` for SVG. `next/link` for links.
- Run `npx tsc --noEmit` (cwd clone) before finishing.
