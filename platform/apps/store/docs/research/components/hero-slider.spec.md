# HeroSlider Specification

## Overview
- **Target file:** `src/components/sections/HeroSlider.tsx` (client component)
- **Screenshot:** `docs/design-references/home-desktop-loaded.png` (top), `header-desktop.png`
- **Interaction model:** autoplay carousel with FADE transition (Slick → Embla fade)

## Behavior (from live Slick config)
- autoplay: **true**, interval **4000ms**, transition speed 600ms, **fade: true**, infinite loop, slidesToShow 1.
- arrows: yes (prev/next). dots: yes (below, centered).

## Implementation
- Use the shared `Carousel` from `@/components/ui/Carousel` with props:
  - `fade` = true
  - `autoplayDelay` = 4000
  - `showArrows` = true, `showDots` = true
  - `options` = `{ loop: true }`
  - `slideClassName` = `"basis-full"` (1 slide visible)
- Slides from `HERO_SLIDES` (import `@/lib/data`): 4 items, each an `<a href={slide.href}>` wrapping a `next/image`.
- Each slide image: full width, `next/image` with `width`/`height` matching aspect (images are ~2438×1042 ≈ 2.34:1). Render responsive: container full-bleed width, image `w-full h-auto`. Use `priority` on first slide.
- The hero is **full viewport width** (full-bleed, edge to edge), NOT inside the 1200px container — see screenshot, banner spans entire width.

## Layout / sizing
- Wrapper: `relative w-full`, overflow hidden.
- Desktop banner aspect ~2.34:1; on mobile the same desktop images are used (site has no separate mobile slide here — keep desktop image, object-cover or contain). Use `className="w-full h-auto"` on Image with explicit width/height and `sizes="100vw"`.

## Arrows / dots styling
- Arrows: the shared Carousel renders white circular arrows left/right (size-9). Acceptable. Position them just inside edges. Pass `arrowClassName` if you want them larger (the site uses larger side arrows) e.g. `"size-11"`.
- Dots: shared Carousel renders dots below; active dot uses `bg-brand-orange`. Acceptable.

## Assets
- `/slider/pedidos-ya.png`, `/slider/banner-fpj.png`, `/slider/banner-familiar.png`, `/slider/banner-todos-los-dias.png` (already in HERO_SLIDES).

## Responsive
- Desktop & mobile: 1 slide, full width. No layout change beyond image scaling.

## Verify
- `npx tsc --noEmit` passes. `"use client"` at top.
