# CategoryCircles Specification

## Overview
- **Target file:** `src/components/sections/CategoryCircles.tsx` (client component — uses Carousel)
- **Screenshot:** `docs/design-references/home-desktop-loaded.png` (row just below hero)
- **Interaction model:** carousel (no autoplay), arrows only.

## Behavior (live Slick config)
- slidesToShow 6 (desktop), responsive: 1400→5, 1200→4, 1024→3, 991→4, 768→2. arrows yes, dots no, infinite loop, no autoplay.

## Implementation
- Section wrapper: `.ft-container`, white rounded card `rounded-[10px] border border-[#ededf1] bg-white`, padding ~`py-6 px-4`, margin-top ~24px (sits below hero).
- Use shared `Carousel` from `@/components/ui/Carousel`:
  - `showArrows` true, `showDots` false, `options={{ loop: true }}`, no autoplay.
  - `slideClassName="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6"` (≈ responsive 2→3→4→5→6).
- Items from `CATEGORY_CIRCLES` (`@/lib/data`), 6 entries. Each slide:
  - `<Link href={cat.href}>` → vertical flex, items-center, gap-2, padding-bottom 15px, group.
  - Icon: `next/image` `src={cat.icon}` (SVG → `unoptimized`), width 64 height 64, `className="transition-transform duration-300 group-hover:scale-110"`. The SVGs are orange line-art already.
  - Label: `<span>` text-sm (14px) text-`#202435` text-center, `group-hover:text-brand-orange`.

## Item metrics (from live)
- Each item column ~194px wide on desktop (controlled by basis), height ~80px, padding-bottom 15px.

## Assets
- `/categories/*.svg` (belleza, fragancias, higiene-personal, mamas-y-bebes, medicamentos, nutricion-y-deporte) — already in CATEGORY_CIRCLES.

## Responsive
- 6 visible ≥1400; 5 at xl; 4 at lg/md; 3 at sm; 2 on mobile. Arrows always present.

## Verify
- `npx tsc --noEmit` passes. `"use client"` at top.
