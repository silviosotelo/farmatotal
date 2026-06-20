# Farmatotal — Behavior Bible

## Carousels (all Slick 1.8.1 → cloned with Embla)
| Carousel | autoplay | interval | speed | slidesToShow (desktop) | responsive | arrows | dots | infinite | fade |
|---|---|---|---|---|---|---|---|---|---|
| HeroSlider | yes | 4000ms | 600 | 1 | 1 always | yes | yes | yes | **fade** |
| CategoryCircles | no | – | 1200 | 6 | 1400→5, 1200→4, 1024→3, 991→4, 768→2 | yes | no | yes | no |
| SuperRombo products | yes | 5000ms | 3000 | 3 | 991→2, 768→2 | yes | yes | yes | no |
| Selección products | no | – | 1200 | 4 | 1024→3, 991→2, 768→2 | yes | yes | yes | no |

Embla mapping: `loop:true` (infinite), `align:'start'`, `slidesToScroll:1`. Autoplay via embla-carousel-autoplay with `delay` = interval. Hero uses fade → Embla `fade` (or a simple opacity crossfade). Arrows = custom prev/next buttons; dots = custom dot nav.

## Header
- `<header>` is `position: relative; z-index: 1001`. NOT natively CSS-sticky.
- Bacola theme adds a JS sticky header on scroll: a fixed bar slides down once you scroll past the main header (~header height ≈ 120px). Clone: `position: fixed; top:0` variant that appears (translateY 0) when `scrollY > ~200`, hidden (translateY -100%) above threshold, with `transition: transform .3s ease`.
- Top bar `.header-top.hide-mobile` → `display:none` under mobile breakpoint.

## Countdown (Super Rombo)
- Live timer Hs/Min/Seg, JS `setInterval` 1s. Counts down to a target. Clone: count down to "end of today" (or a fixed offset) and reset; values zero-padded to 2 digits, each unit in its own box.

## Floating buttons
- Fixed to right edge, vertically centered-ish. "Escanear" (barcode icon, blue) + "Voz" (mic icon, orange). Pills.

## Hover states (to confirm per component during spec extraction)
- ProductCard: image slight zoom / card shadow; "Añadir al carrito" darkens.
- Category circle: scale / color shift.
- Nav links: color → orange.

## Responsive breakpoints (observed)
- Desktop ≥1200, tablet 768–1199, mobile <768.
- Mobile: top bar hidden; header collapses to pin + logo + account + cart; "Seleccionar Sucursal" yellow strip; search full width; mega-menu → off-canvas (hamburger). Cards 2-up.

## Categories (mega-menu "TODAS LAS CATEGORÍAS", 9)
Bazar y Hogar, Belleza, Fragancias, Higiene Personal, Infantiles, Mamás y Bebés, Medicamentos, Nutrición y Deporte, Ofertas → /categoria/<slug>/

## Top nav (header-top): Sucursales · Trabaja con Nosotros · ¿Donde está mi pedido? + lang (EN/ES/DE) + currency (USD/INR/GBP)
