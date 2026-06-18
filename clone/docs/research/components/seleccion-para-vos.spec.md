# SeleccionParaVos Specification

## Overview
- **Target file:** `src/components/sections/SeleccionParaVos.tsx` (client component — uses Carousel)
- **Screenshot:** `docs/design-references/home-desktop-loaded.png` ("Nuestra selección para vos" row)
- **Interaction model:** product carousel (no autoplay), arrows + dots.

## Layout
- Outer: `.ft-container`, margin-top ~32px.
- Header row: flex items-center justify-between, margin-bottom ~16px.
  - Heading `Nuestra selección para vos` — `h2`/`h4`, `font-heading` (Ubuntu) **700**, color `#7a7a7a`, font-size **24px**.
  - Right link `Ver todos →` — `<Link href="/catalogo">`, color `var(--brand-orange)`, font-medium, with `ArrowRightIcon` (size 16) after the text; hover underline.
- Carousel: shared `Carousel` + `ProductCard`:
  - data `SELECCION_PRODUCTS` (`@/lib/data`).
  - props: `showArrows`, `showDots`, `options={{ loop: true }}`, NO autoplay, `slideClassName="basis-1/2 md:basis-1/3 lg:basis-1/4 px-2"` (4 visible desktop, 3 at md, 2 mobile).
  - Each slide `<ProductCard product={p} />`.

## Imports
- `Carousel` from `@/components/ui/Carousel`
- `ProductCard` from `@/components/ProductCard`
- `ArrowRightIcon` from `@/components/icons`
- `SELECCION_PRODUCTS` from `@/lib/data`
- `Link` from `next/link`

## Responsive
- Desktop 4 cards, md 3, mobile 2. Heading shrinks gracefully; "Ver todos" stays on the right.

## Verify
- `npx tsc --noEmit` passes. `"use client"` at top.
