# Farmatotal — Page Topology (Homepage)

Target: https://www.farmatotal.com.py/ (WordPress + WooCommerce, theme "Bacola" by klbtheme)

## Global frame
- **Scroll container:** native window scroll (no Lenis/Locomotive detected — verify).
- **Page bg:** #ffffff. Max content width ~1200px centered, with full-bleed banners.
- **Carousel library:** Slick Carousel 1.8.1 (hero + product rows + category row).
- **Icon font:** Font Awesome 6.4.0.

## Sections (top → bottom)

1. **TopBar** (thin, above header) — links: Sucursales · Trabaja con Nosotros · ¿Donde está mi pedido? Right side: language/currency switchers (English/Spanish/German, USD/INR/GBP). Orange. *(May be hidden on mobile.)*

2. **Header / Navbar** (STICKY) — gradient orange→yellow. Left: location pin "Sucursal más cercana: Seleccionar Sucursal". Logo (logo-farmatotal-01.svg, white). "Categorías" mega-menu trigger ("TODAS LAS CATEGORÍAS"). Full-width search box ("Buscar productos...") with submit button. Right icons: account (mi-cuenta), cart (count badge "0"). INTERACTION: sticky on scroll; mega-menu dropdown on click/hover.

3. **HeroSlider** (Slick, 4 slides) — full-width banners, prev/next arrows + dot tabs. Slides:
   - PEDIDOS-YA-2026-02.png
   - BANNER-FPJ-2025-OK-01-scaled.png ("¡HOY LUNES! 30% DTO" Pi Financiera)
   - BANNER-FAMILIAR-2025-OK-01-scaled.png
   - BANNER-TODOS-LOS-DIAS-01.png
   INTERACTION: autoplay carousel (verify interval) + arrows + dots.

4. **FloatingButtons** (fixed, right edge, mid-page) — "Escanear" (barcode, blue) and "Voz" (voice search, orange). Pills with icon + label.

5. **CategoryCircles** (Slick carousel) — 6 items: Belleza, Fragancias, Higiene Personal, Mamás y Bebés, Medicamentos, Nutrición y Deporte. Each = circular icon (SVG) + label, links to /categoria/<slug>/. Prev/next arrows.

6. **SuperRombo** — bordered rounded card. Left panel: "¡Super Rombo!" (orange), "¡Descuentos increíbles!", "¡Estás a tiempo! Todavía quedan", + COUNTDOWN timer (Hs/Min/Seg boxes). Right: product-card Slick carousel. INTERACTION: live countdown (JS setInterval) + carousel. Trailing clickable banner BANNER-OFERTAS... → /catalogo/?descuento=70.

7. **PromoBanner A** — "TODOS LOS DÍAS · DESCUENTOS HASTA UN 70%" full-width image, links /catalogo/?descuento=70.

8. **SeleccionParaVos** — heading "Nuestra selección para vos" + "Ver todos →" link (/catalogo). Product-card Slick carousel.

9. **PromoBanner B** — "SUPER ROMBO · HASTA 50% DESCUENTO" full-width image, links /catalogo/?descuento=50.

10. **Footer** — "Copyright 2023 © Defensores S.A. Todos los derechos reservados." + Century payment logo (LOGO_CENTURY11.webp → century.com.py). + Scroll-to-top button.

## Shared component: ProductCard
Used in SuperRombo + SeleccionParaVos carousels.
- Discount badge (e.g. "16%", "30%") top-left, orange.
- Product image (square).
- Title (2-line clamp, link to /producto/<slug>/).
- Price block: "El precio original era: ₲ X" (strikethrough), "Precio Web: ₲ Y" (bold orange), current price.
- "Añadir al carrito" full-width orange button.
- Hover: (capture).

## Internal pages in scope (to recon separately)
- /catalogo/ or /shop (product grid + filters sidebar)
- /producto/<slug>/ (single product)
- /carrito/ (cart)
- /mi-cuenta/ (account login)
