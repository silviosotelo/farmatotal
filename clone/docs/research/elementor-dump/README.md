# Snapshot Elementor — producción farmatotal.com.py

> Volcado **read-only** del `_elementor_data` (MySQL Hostinger `btw70_`) tomado **2026-05-25**. Insumo del importer pixel-perfect (ver [`../PAGE-BUILDER.md §5`](../PAGE-BUILDER.md)). El sitio vivo puede cambiar; este es el estado congelado.

## Archivos
| Archivo | post_id | Página | bytes |
|---|---|---|---|
| `page-773.json` | 773 | **Inicio (home, page_on_front)** | 45 477 |
| `page-1544.json` | 1544 | Sobre Nosotros | 10 416 |
| `page-45796.json` | 45796 | Registrarse | 726 |
| `page-1681.json` | 1681 | ¿Dónde está mi pedido? | 426 |
| `page-2386.json` | 2386 | Sucursales | 411 |
| `page-633.json` | 633 | Mis Favoritos | 382 |
| `page-2277.json` | 2277 | Elementor Loop Item (card de producto) | 329 |
| `kit-6-settings.json` | 6 | Kit global Elementor (tokens) | 365 |
| `active_kit_id.txt` | — | id del kit activo (=6) | 2 |

> El sitio real usa el theme **Bacola** (`template=bacola`), no Nest. Los widgets son `bacola-*`. Nest queda solo como inspiración de features ([`../NEST-FEATURE-ANALYSIS.md`](../NEST-FEATURE-ANALYSIS.md)); **el importer mapea widgets Bacola**.

## Inventario de widgets de la HOME (773)
6 secciones top-level (7 `section`, 8 `column`):
- `shortcode` ×1 → es el `[custom_slider]` (hero por día/plataforma, ver `../WOO-CUSTOM-INVENTORY.md §5`)
- `bacola-product-categories` ×1 → círculos de categorías
- `bacola-product-carousel` ×2 → carruseles de productos (Super Rombo / Selección)
- `countdown` ×1 → timer del Super Rombo
- `image` ×2 → banners promocionales
- `heading` ×3 → títulos de sección

Coincide con el clon ya construido (HeroSlider, CategoryCircles, SuperRombo, SeleccionParaVos, PromoBanners).

## Tabla de mapeo widget Bacola → BlockType (importer)
| Widget Elementor | → BlockType | Props a extraer |
|---|---|---|
| `shortcode` (`[custom_slider]`) | `HERO_SLIDER` | resolver del CMS de banners (imagen/días/plataforma) |
| `bacola-product-categories` | `CATEGORY_GRID` | categorías, columnas |
| `bacola-product-carousel` | `PRODUCT_CAROUSEL` | query (categoría/ids), límite, título |
| `countdown` (+ carousel asociado) | `PRODUCT_DEALS` | `countdownTo`, query `porcDcto>=N` |
| `image` | `SHOP_BANNER` | url imagen (resolver R2), link |
| `heading` | `RICH_TEXT` | texto, nivel |
| `bacola-hero-banner` (en "Sobre Nosotros") | `SHOP_BANNER` / hero | imagen, texto, link |

Widgets sin equivalente → log + fallback `RICH_TEXT`.

## Cómo se generó
SSH `ft_key -p 65002 u377556581@85.31.229.54` → `mysql -N -r ... WHERE meta_key='_elementor_data'`. Reproducible. (Las internas chicas <800 bytes suelen ser solo un heading o shortcode contenedor; el grueso del layout vive en el theme Bacola, no en Elementor.)
