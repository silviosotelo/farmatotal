# Paridad de estilo: clon vs WooCommerce productivo

> Verificación empírica del clon contra el sitio vivo `farmatotal.com.py` (theme **Bacola**, KLBTheme). 2026-05-25.
> Método: el sitio responde HTTP 200 con HTML real al curl/Playwright (el reCAPTCHA de LiteSpeed no bloquea la home), así que se compararon **estilos computados reales** + el CSS productivo (LiteSpeed combinado) + el kit de Elementor (`elementor-dump/`).

## ✅ Confirmado idéntico (medido)
| Token | Real (fuente) | Clon | OK |
|---|---|---|---|
| Naranja marca | `#F16522` (kit Elementor `Colo1`) | `--brand-orange #f16522` | ✓ |
| Amarillo marca | `#FFCA05` (kit `Color2`) | `--brand-yellow #ffca05` | ✓ |
| Fuente body | `--font-primary: "Inter"` | Inter (`--font-sans`) | ✓ |
| Fuente h1–h6 / títulos sección | Inter (`h1..h6{var(--font-primary)}`) | Inter | ✓ |
| Fuente título de card | Inter (computado en `.product` real) | Inter (base) | ✓ |
| Fuente precios | `--font-secondary: "Dosis"` (`.price`) | Dosis (`--font-price`) | ✓ |
| Fuente badge descuento | Dosis (`.badge` real) | Dosis | ✓ |
| Gradiente header | naranja→amarillo | `--brand-gradient` | ✓ |
| Estructura home | top-bar, header, hero, círculos cat (×6), Super Rombo+countdown, "selección"+"Ver todos", banner 70%, banner Super Rombo 50%, footer Defensores/Century | igual | ✓ |

## 🔧 Deltas corregidos (diff página por página, 2026-05-26)

**Global / Header**
1. **Tipografía Ubuntu → Inter.** El real NO carga Ubuntu (solo enquela Inter+Dosis). Quitado Ubuntu; headings ahora Inter. *(El `"Ubuntu"` del countdown Elementor es letra muerta: render en sans genérico → se usa Inter.)*
2. **Selectores idioma/moneda eliminados** del top-bar (el real no los tiene).
3. **Ícono "Categorías": grilla → hamburguesa** (≡).
4. **Botón de búsqueda: círculo naranja → lupa gris simple** (`bg transparent`, `color #3e445a`).

**Página de producto** (`/producto/[slug]`) — el real es minimalista; se simplificó el clon:
5. Quitado **rating de estrellas** (real no tiene).
6. Quitado **botón wishlist** y **"Comprar ahora"** (real solo tiene stepper + "Añadir al carrito").
7. Quitadas las **pestañas** Descripción/Información/Valoraciones (real no tiene).
8. **Relacionados**: carrusel → **grilla de 4** (como el real).
9. Breadcrumb sin crumb "Catálogo" (real = Inicio › Categoría › Producto).

**Categoría** (`/categoria/[slug]`)
10. Breadcrumb sin "Catálogo"; **quitado el H1 grande** (real va breadcrumb → filtros → grilla).
11. Label de orden "Relevancia" → **"Orden predeterminado"**.

**Mi cuenta** (`/mi-cuenta`) — ✅ ya coincidía (card centrada, login social Facebook/Google, "¿Olvidaste tu contraseña?", H1 sr-only). Sin cambios.

**Buscar** (`/buscar`)
12. Breadcrumb alineado: "Inicio › Catálogo › Resultados de búsqueda para «q»" (real igual). Comparte el shell de categoría (P6/P7 pendientes).
13. ✅ **Confirmado: el sitio real también usa el placeholder "IMAGEN NO DISPONIBLE"** para productos sin foto → el placeholder del clon es fiel (mitiga P3).

**Carrito** (`/carrito`) — ✅ estado vacío **casi idéntico** (círculo gris + bolsa roja + "TU CARRITO ESTÁ VACÍO." + "Volver a la tienda"). Falta breadcrumb "Inicio › Carrito" en vacío (menor). Estado lleno no comparable contra el vivo (ver P10).

## ⚠️ Deltas pendientes (punch-list)
| # | Delta | Tipo | Nota |
|---|---|---|---|
| P1 | Ícono de cuenta: real = **carita sonriente**; clon = persona | estilo | requiere SVG smiley nuevo |
| P2 | Sucursal por defecto: real = "Seleccionar Sucursal"; clon preselecciona "Médicos del Chaco" | contenido/UX | decisión del clon (mock) |
| P3 | **Imágenes de producto**: clon usa placeholder salvo 4 reales; real tiene fotos | contenido | se resuelve con el sync ERP + media real |
| P6 | **Categoría — filtro de precio**: real = **slider de rango** (2 manijas) + "FILTRAR"; clon = inputs Mín/Máx | estilo | requiere componente slider |
| P7 | **Categoría — iconos de vista** (lista / grilla 2-3-4): el real los tiene; el clon no | estilo | toolbar |
| P9 | **Sucursales**: real = **store-locator con Google Maps** (mapa interactivo + radio + pines + buscador de dirección, plugin agile-store-locator); clon = chips de zona + cards (sin mapa) | feature | requiere Google Maps API → Fase 5 |
| P10 | **Carrito lleno / Caja (checkout)**: no comparables contra el vivo — el `add-to-cart` real está gated por selección de sucursal + validación de stock, y Woo redirige el checkout vacío | bloqueo | validar contra el backend propio en Fase 4 |

**Diffeadas y alineadas:** header ✅, producto ✅, categoría ✅ (salvo P6/P7), mi-cuenta ✅, buscar ✅ (salvo P6/P7), carrito vacío ✅. Pendiente de feature/datos: sucursales (P9, mapa), carrito-lleno/caja (P10).

## Veredicto
El clon es **alta fidelidad y ahora con tokens (color+tipografía) idénticos a producción y medidos**, no inferidos. Las diferencias restantes son mayormente **contenido** (imágenes de producto/campaña) y un par de **íconos** (P1), no el sistema de diseño.

> Importante: el frontend se **reconstruye** en Fase 1–5 contra datos reales y la home se **re-importa pixel-perfect** desde Elementor (`elementor-dump/`). Esta tabla es el punch-list de estilo a respetar en ese rebuild; pulir P1/P4 sobre el mock actual tiene baja durabilidad.
