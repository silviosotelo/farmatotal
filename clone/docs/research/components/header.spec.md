# Header Specification

## Overview
- **Target file:** `src/components/sections/Header.tsx` (client component — sticky scroll + mobile drawer state)
- **Screenshot:** `docs/design-references/header-desktop.png`, mobile in `home-mobile-390.png`
- **Interaction model:** sticky-on-scroll (JS) + click (mega-menu dropdown, mobile drawer)

## Structure (desktop ≥1024px)
`<header>` total height 127px, two rows:

### Row 1 — TopBar (`.header-top`)
- bg `#f9f9f9`, height **40px**, text color `#3e445a`, font-size **12px**, Inter.
- Inner: `.ft-container` (max-width 1200px, padding-inline 15px), flex, items-center, justify-between, full height.
- Left: links from `TOP_NAV` (import from `@/lib/data`): "Sucursales" (/sucursales/), "Trabaja con Nosotros" (#), "¿Donde está mi pedido?" (/rastrear-pedido/). Separated by spacing/gap-5. hover → color `#f16522`.
- Right: location text `📍 Sucursal más cercana: Seleccionar Sucursal` (use `LocationIcon` size 14, "Seleccionar Sucursal" colored `#f16522`), then language switch (LANGUAGES: English/Spanish/German) and currency (CURRENCIES: USD/INR/GBP) as small text dropdowns separated by a divider. Each shows a `ChevronDownIcon`.
- **Hidden below lg** (`hidden lg:flex`).

### Row 2 — Main header (`.header-main`)
- background: `brand-gradient` utility (linear-gradient(100deg,#f16522,#ffca05)), height **87px**, padding `14px 0`.
- Inner `.ft-container`, flex items-center gap-6.
- **Logo:** `next/image` `/brand/logo-farmatotal.svg`, width 200 height 44 (use `unoptimized` since SVG), Link to `/`.
- **"Categorías" button:** white text, `GridIcon` + label "Categorías" + `ChevronDownIcon`, font-medium. On click toggles a **mega-menu dropdown** (absolute, white card, shadow, rounded-lg, mt-2) listing `MENU_CATEGORIES` (9 items) as a vertical list; each row hover bg `#f3f4f7`, text `#202435`, hover text `#f16522`. Close on outside click.
- **Search (flex-1):** `<form>`, relative. `<input>` placeholder "Buscar productos...", bg `var(--search-bg)` (#f3f4f7) → use `bg-search-bg`, height **48px**, border-radius **50px** (rounded-full), padding-left 20px, padding-right 56px, font-size 15px, text `#202435`, no border, outline-none. Submit `<button>` absolute right-1, circular size ~40px, `brand-gradient` OR solid `bg-brand-orange`, white `SearchIcon`. (Reference screenshot: orange round button on right.)
- **Account:** Link `/mi-cuenta/`, `UserIcon` white, ~size 24, in a subtle hover circle.
- **Cart:** Link `/carrito/`, `CartIcon` white size 24, with a small count badge "0" (white circle, orange text, absolute top-right). 

## Sticky behavior
- On `window.scrollY > 200`, the main header (Row 2) becomes `position: fixed; top:0; left:0; right:0; z-index:1001` and slides in (`translateY(0)` from `-100%`), with `transition: transform .3s ease` and a `shadow-md`. Above threshold it returns to normal flow. TopBar is NOT sticky.
- Implement with a `useState`+scroll listener. Keep a spacer so content doesn't jump, OR render a fixed clone. Simplest: render main header normally; additionally render a fixed clone that is visible only when scrolled. Either approach OK; must not cause layout shift.

## Mobile (<1024px)
- TopBar hidden.
- Main header (gradient): left = hamburger (`MenuIcon`, white) + `LocationIcon`; center = logo (h ~36); right = account + cart icons.
- Below header: a **yellow strip** bg `var(--brand-yellow)` (#ffca05), dark text `#202435`, padding y-2, centered: `📍 Sucursal más cercana: Seleccionar Sucursal`.
- Below: full-width search input (same styling, inside gradient or white strip — see mobile screenshot: search is on the gradient, full width).
- Hamburger opens an off-canvas **drawer** (left, white, slide-in, with overlay) listing `MENU_CATEGORIES` then `TOP_NAV`. Close button + overlay click closes.

## Assets / imports
- `next/image`, `next/link`
- Icons from `@/components/icons`: GridIcon, ChevronDownIcon, SearchIcon, UserIcon, CartIcon, LocationIcon, MenuIcon
- Data from `@/lib/data`: TOP_NAV, MENU_CATEGORIES, LANGUAGES, CURRENCIES
- `cn` from `@/lib/utils`

## Responsive
- Switch desktop↔mobile layout at `lg` (1024px). Search reflows; topbar hidden < lg.

## Verify
- `npx tsc --noEmit` passes. Use `"use client"` at top.
