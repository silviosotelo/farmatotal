# SuperRombo Specification

## Overview
- **Target file:** `src/components/sections/SuperRombo.tsx` (client component — live countdown)
- **Screenshot:** `docs/design-references/home-desktop-loaded.png` (the "¡Super Rombo!" block) and `home-mobile-390.png`
- **Interaction model:** live countdown (setInterval 1s) + product carousel (autoplay 5000ms).

## Layout
- Outer: `.ft-container`, margin-top 24px.
- Card: `flex` row on desktop (`lg:flex-row`), stacked on mobile (`flex-col`), border `1px solid #ededf1`, `rounded-[10px]`, bg white, overflow visible.
- **Left panel** (fixed width `lg:w-[300px]` shrink-0, padding ~24px, border-right on lg):
  - Title `¡Super Rombo!` — `font-heading` (Ubuntu) **bold**, color `var(--brand-orange)`, font-size ~32px, line-height tight.
  - Subtitle `¡Descuentos increíbles!` — Ubuntu bold, color `#7a7a7a`, ~20px.
  - `¡Estás a tiempo!` (br) `Todavía quedan` — small text `#202435`, ~13px, link style (it is an `<a href="#">` on the live site; render as text).
  - **Countdown**: row of 3 boxes (Hs / Min / Seg). Each box: big number `font-heading` (Ubuntu) **700**, color `var(--brand-orange)`, font-size clamp ~36–40px (desktop big; live computed 69px but scaled — use `text-[40px]`), zero-padded 2 digits; small label below (`Hs.` / `Min.` / `Seg.`) `#7a7a7a` ~12px. Boxes separated by gap.
  - Countdown logic: count down to end of current day (23:59:59) or a fixed 8h offset; when it hits 0, reset to a fresh interval. Update every 1s with `setInterval`, clear on unmount.
- **Right panel** (flex-1, padding ~16px): product carousel using shared `Carousel` + `ProductCard`:
  - `import { Carousel } from "@/components/ui/Carousel"`, `import { ProductCard } from "@/components/ProductCard"`.
  - data: `SUPER_ROMBO_PRODUCTS` (`@/lib/data`).
  - Carousel props: `autoplayDelay={5000}`, `showArrows`, `showDots`, `options={{ loop: true }}`, `slideClassName="basis-1/2 lg:basis-1/3 px-2"` (3 visible desktop, 2 on mobile/tablet ≤991). Each slide renders `<ProductCard product={p} />`.

## Notes
- The trailing full-width promo banner ("HASTA UN 70%") is a SEPARATE section (PromoBanner) handled in page assembly — do NOT include it here.

## Responsive
- Desktop: left panel + carousel side by side, 3 cards. Tablet/mobile: panel stacks on top, carousel shows 2 cards.

## Verify
- `npx tsc --noEmit` passes. `"use client"` at top.
