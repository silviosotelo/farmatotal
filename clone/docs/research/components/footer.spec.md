# Footer Specification

## Overview
- **Target file:** `src/components/sections/Footer.tsx` (server component OK)
- **Screenshot:** bottom of `docs/design-references/home-desktop-loaded.png` and `home-mobile-390.png`
- **Interaction model:** static (link hovers only).

## Layout
- `<footer>`: white bg, border-top `1px solid #ededf1`, total height ~105px desktop, margin-top ~40px.
- Inner `.ft-container`, flex items-center justify-between, full height; stack/center on mobile (`flex-col gap-3 text-center md:flex-row md:text-left`), py-6.
- Left: copyright text — `Copyright 2023 © Defensores S.A. Todos los derechos reservados.` — color `#202435`, font-size ~14–16px.
- Right: payment logo — `<a href="https://www.century.com.py/" target="_blank" rel="noopener">` wrapping `next/image` `/brand/century.webp` (width 120, height 30, alt "pago", `unoptimized` ok). The original alt text is "pago".

## Responsive
- Desktop: copyright left, logo right. Mobile: stacked, centered (copyright on top, logo below) — matches mobile screenshot.

## Verify
- `npx tsc --noEmit` passes.
