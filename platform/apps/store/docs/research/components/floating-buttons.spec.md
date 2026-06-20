# FloatingButtons Specification

## Overview
- **Target file:** `src/components/sections/FloatingButtons.tsx` (client component)
- **Screenshot:** right edge of `docs/design-references/header-desktop.png` / `home-desktop-loaded.png`
- **Interaction model:** fixed overlay; scroll-to-top appears after scrolling.

## Elements
Fixed to the **right edge**, vertically around mid-viewport, stacked vertical with small gap, `z-50`:
1. **Escanear** button — blue `#2d9cdb`, white text, `BarcodeIcon` + label "Escanear". Pill, rounded-left (`rounded-l-full`), attached to right edge (`right-0`). Padding ~`px-3 py-2`, font-size 13–14px, small shadow. aria-label "Escanear código de barras".
2. **Voz** button — red `#e74c3c`, white text, `MicIcon` + label "Voz". Same pill style, below Escanear. aria-label "Búsqueda por voz".

Layout each button: icon above small label OR icon + label inline — match screenshot (compact pill, icon + text). Use `flex items-center gap-1.5`.

## Scroll-to-top
- A separate small **circular** button, `fixed bottom-6 right-6`, size ~44px, `bg-brand-orange` text-white, `ArrowUpIcon`. Visible only when `window.scrollY > 400` (fade/scale in). On click `window.scrollTo({top:0, behavior:'smooth'})`.

## Imports
- Icons `@/components/icons`: BarcodeIcon, MicIcon, ArrowUpIcon
- `cn` from `@/lib/utils`

## Notes
- These are decorative/demo (no real scanner or voice). Buttons can be non-functional except scroll-to-top.

## Verify
- `npx tsc --noEmit` passes. `"use client"` at top.
