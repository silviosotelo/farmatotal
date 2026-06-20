# Farmatotal Clone — Análisis de brechas (Gap Analysis)

Estado al 25-may-2026. Stack: Next.js 16 (App Router) + Tailwind v4. Objetivo: completar el e-commerce como **mock funcional** (front + datos simulados + interacciones), y luego planificar **backend real + admin dashboard**.

---

## A. Lo que YA está (clon actual)

**Rutas:** `/` (home), `/catalogo`, `/producto/[slug]`, `/carrito` (solo estado vacío), `/mi-cuenta` (login/registro, estático).

**Componentes:** Header (sticky, mega-menú, buscador, trigger de sucursal, drawer móvil), Footer, ProductCard, QuantityStepper, Carousel (Embla), secciones de home (HeroSlider, CategoryCircles, SuperRombo + countdown, PromoBanner, SeleccionParaVos, FloatingButtons), Sucursal (Context + Modal + Trigger), ui/button.

**Datos:** mock estático (`lib/data.ts`): ~12 productos, categorías, slides, nav. `lib/sucursales.ts`: 66 sucursales con geolocalización.

**Funciona de verdad:** selector "Sucursal más cercana" (geolocalización → haversine → localStorage), carruseles, countdown, responsive, accesibilidad.

**Limitación clave:** todo es **visual**. No hay carrito real, ni búsqueda, ni filtros, ni login, ni checkout. Los botones "Añadir al carrito", buscador, filtros y paginación son **placeholders**.

---

## B. Falta para completar el MOCK (storefront 100%)

### B.1 — Rutas/páginas faltantes
| Página | Estado | Notas |
|---|---|---|
| `/caja` (checkout) | **FALTA (crítica)** | Datos de facturación, **retiro en sucursal**, método de pago, resumen, "Realizar pedido" |
| `/pedido-recibido` (thank-you) | **FALTA** | Confirmación + nº de pedido + detalle |
| `/categoria/[slug]` | **FALTA** | Archivo de categoría (grid filtrado). El mega-menú ya enlaza a `/categoria/...` |
| `/carrito` (con items) | **Parcial** | Hoy solo "vacío". Falta tabla con items, qty, quitar, subtotal, cupón |
| `/mi-cuenta` (logueado) | **FALTA** | Dashboard, **Pedidos**, Direcciones, Detalles de cuenta, Descargas, Cerrar sesión |
| `/mis-favoritos` (wishlist) | **FALTA** | Lista de deseos (como el plugin TI Wishlist) |
| `/rastrear-pedido` | **FALTA** | Está en el nav; seguimiento de pedido |
| `/sucursales` | **FALTA** | Mapa + listado de las 66 sucursales (datos ya existen) |
| `/contacto` | **FALTA** | Form de contacto (está en el nav) |
| Resultados de búsqueda | **FALTA** | `/buscar?q=` o `/?s=` |
| Páginas legales | **FALTA** | Política de privacidad, términos (links del footer/registro) |
| `not-found` (404) | **FALTA** | 404 con branding |

### B.2 — Lógica/estado faltante (lo que lo hace "funcional")
- **Carrito (estado global)**: Context/store + `localStorage`. Agregar, cambiar cantidad, quitar, totales. **Badge del carrito en el header** (hoy fijo en "0"). **Mini-cart** (dropdown al ícono).
- **"Añadir al carrito" operativo** en ProductCard y página de producto (hoy no hacen nada) + **toast/feedback** (estilo SweetAlert, como el sitio real).
- **Búsqueda** funcional sobre el catálogo mock (por nombre/SKU). Incluye los botones **Escanear (código de barras)** y **Voz** (hoy decorativos).
- **Filtros de catálogo/categoría** operativos: rango de precio, categoría, orden, **paginación real** (hoy visual).
- **Wishlist** operativo (agregar/quitar + persistencia + página favoritos) — mismo patrón que el contexto de sucursal.
- **Auth mock**: submit de login/registro → sesión simulada en `localStorage`; el Header cambia (cuenta logueada vs invitado); proteger `/mi-cuenta`.
- **Checkout mock**: formulario + **retiro/envío por sucursal** + selección de método de pago (Bancard/tarjeta) + "Realizar pedido" → crea pedido mock → thank-you.
- **Producto completo**: galería (varias imágenes), pestañas (Descripción / Información adicional / Valoraciones), **variaciones/atributos** (si aplica), reseñas mock, "productos relacionados" (ya existe el carrusel).
- **Stock / disponibilidad**: badges "En stock / Sin stock" y, según la **sucursal seleccionada**, mostrar disponibilidad (en el real lo resuelve la API del ERP; en mock, simulado).
- **Precio**: "Precio Normal / Precio Web" (ya en ProductCard) + cupones/descuentos en carrito + el contador "Super Rombo".

### B.3 — Datos mock a ampliar
- Catálogo realista: **categorías con muchos productos**, cada producto con galería, descripción, atributos, relacionados, reseñas.
- **Pedidos mock**, **usuario mock**, **direcciones mock** (para el dashboard de Mi Cuenta).
- Cupones mock.

### B.4 — UX transversal
- **Toasts/notificaciones** (añadido al carrito, errores) — el real usa SweetAlert2 (ya hay token para ello).
- Estados de **carga / vacío / error** consistentes.
- **Breadcrumbs** como componente reutilizable (hoy duplicado por página).

> **Estimación mock:** B.1 + B.2 son el grueso. El carrito (estado) + checkout + categoría/búsqueda + Mi Cuenta logueado son los 4 bloques grandes. Todo se puede hacer con datos simulados y `localStorage`, sin backend.

---

## C. Falta para el BACKEND real

### C.0 — Decisión de arquitectura (definir primero)
- **Opción A — WooCommerce headless (recomendada para reusar lo existente):** el WordPress/WooCommerce actual sigue de backend; el front Next.js consume la **Store API / REST de WooCommerce** (productos, carrito, checkout, pedidos) + JWT. Reusa: catálogo, pagos (Bancard), **stock por API del ERP**, multi-inventory (sucursales), sincronizador. Menos trabajo nuevo.
- **Opción B — Backend propio:** API Node/Next + base de datos propia + auth + pagos + integración ERP. Mucho más trabajo; duplica WooCommerce. Solo si se quiere salir de WordPress.

### C.1 — Servicios/APIs necesarios
- **Catálogo**: listar/detalle/categorías/búsqueda/filtros (Woo Store API o propio + índice tipo FiboSearch/Elasticsearch).
- **Carrito + Checkout**: carrito de servidor o carrito cliente + API de creación de pedido.
- **Auth**: login/registro/JWT/sesión + **login social** (Facebook/Google, ya presente en el real).
- **Pagos**: **Bancard** (Paraguay) + el gateway custom de pago.
- **Stock en tiempo real**: integrar la **API del ERP** (`api.farmatotal.com.py/farma/next/ecommerce/producto/stock`) — ya existe.
- **Sucursales / multi-inventory**: disponibilidad y retiro por sucursal (hoy lo maneja el plugin).
- **Precios/descuentos**: alimentados por el **sincronizador ERP→Woo** (el servicio Node `FarmatotalSync`).
- **Pedidos**: persistencia, estados, **notificaciones (email + WhatsApp)** — ya usan WhatsApp.

### C.2 — Riesgos/heredados a resolver (de la operación actual)
- El **sincronizador** debe correr como servicio resiliente (watchdog + alertas) — hoy se cae y no se recupera solo.
- Conectividad estable a la base de datos (remote MySQL).
- Rendimiento de la home sin caché (hoy ~16 s) — el front headless lo resolvería (render estático/ISR).

---

## D. Falta para el ADMIN DASHBOARD

- **Auth + roles** (admin, staff, sucursal).
- **Productos**: alta/edición o lectura desde ERP/Woo; **inventario por sucursal**.
- **Pedidos**: listado, detalle, **cambio de estado**, preparación/retiro por sucursal.
- **Clientes**.
- **Descuentos/promos**: cupones, "Super Rombo", precio web — gestión de campañas.
- **Sucursales**: alta/edición, coordenadas, horarios.
- **Reportes/analytics**: ventas, stock, productos top.
- **Contenido**: banners/sliders del home, categorías destacadas.
- **Monitoreo del sincronizador**: panel de salud del sync ERP↔Woo (estado, última corrida, errores) — muy relevante dado el incidente reciente.

---

## E. Roadmap sugerido (orden)
1. **Mock storefront completo** (este front): carrito+estado → checkout → categoría/búsqueda → Mi Cuenta logueado → wishlist/sucursales/contacto → pulido (toasts/estados). *Sin backend.*
2. **Decisión de arquitectura** (A: headless Woo / B: backend propio).
3. **Integración backend** por bloques: catálogo → auth → carrito/checkout → pagos (Bancard) → stock ERP → pedidos/notificaciones.
4. **Admin dashboard** + **monitoreo del sincronizador**.

> El mock (paso 1) sirve como **especificación viva** y UI definitiva: al conectar el backend (paso 3) se reemplazan los datos simulados por llamadas reales sin rehacer la UI.
