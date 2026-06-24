# FARMATOTAL Platform — Arquitectura Completa

## Monorepo Structure

```
platform/
├── apps/
│   ├── api/          # Backend REST API (Fastify + Drizzle ORM)
│   ├── store/        # Storefront (Next.js 16 SSR)
│   └── admin/        # Admin Panel (Vite + React SPA)
├── packages/
│   ├── engine/       # Page builder schema-first (Elementor-parity)
│   ├── shared-types/ # Zod schemas + TypeScript types
│   └── ui/           # Ecme UI component library
├── docker-compose.yml
├── pnpm-workspace.yaml
└── turbo.json
```

**Stack**: Node.js ≥22, pnpm workspaces, Turborepo, TypeScript, PostgreSQL 16, Redis 7, MinIO (S3).

---

## apps/api — Backend (Fastify)

Puerto: 4000 | ORM: Drizzle | Auth: JWT + Argon2

### 26 Módulos

| Módulo | Endpoint | Función |
|---|---|---|
| auth | `/auth/*` | Login, register, refresh, bootstrap |
| catalog | `/catalog/*` | Productos, categorías, marcas |
| orders | `/orders/*` | Checkout, pedidos, estados, reembolsos |
| payments | `/payments/*` | Bancard vPOS (gateway Paraguay) |
| customers | `/customers/*` | CRUD clientes |
| branches | `/branches/*` | Sucursales físicas |
| inventory | `/inventory/*` | Stock por sucursal |
| shipping | `/shipping/*`` | Métodos de envío por zona |
| tax | `/tax/*` | Reglas de impuestos |
| coupons | `/coupons/*` | Cupones de descuento |
| reviews | `/reviews/*` | Reseñas de productos |
| wishlist | `/wishlist/*` | Lista de favoritos |
| cms | `/cms/*` | Páginas CMS (Puck/Chai), settings key-value |
| slides | `/slides/*` | Sliders del homepage |
| media | `/media/*` | Uploads a MinIO |
| mailer | `/mailer/*` | Cola BullMQ para emails |
| whatsapp | `/whatsapp/*` | Integración WhatsApp |
| erp_sync | `/erp-sync/*` | Sincronización con ERP legacy |
| users | `/users/*` | Gestión de usuarios/roles |
| attributes | `/attributes/*` | Atributos de producto |
| stock | `/stock/*` | Niveles de inventario |
| stats | `/stats/*` | Dashboard statistics |
| plugins | `/plugins/*` | Sistema de plugins + config |
| notifications | `/notifications/*` | Push/email |
| system | `/modules/*` | Módulos nativos, feature flags |
| health | `/health` | Health check |

### DB Schema (20 tablas)
tenants, users, products, categories, brands, variants, branches, orders, customers, reviews, wishlist, coupons, slides, cms, media, mailer, whatsapp, sync, attributes, stock

### Multi-tenant
Header `x-tenant` → resolución de tenant → todas las queries scoped por `tenant.id`.

### Auth Guard
Todas las rutas mutantes requieren JWT excepto whitelist (login, register, checkout, reviews, payments, auth bootstrap).

---

## apps/store — Storefront (Next.js 16)

Puerto: 3000 | Rendering: SSR (App Router)

### 22 Rutas

| Ruta | Función |
|---|---|
| `/` | Homepage (CMS blocks rendered) |
| `/catalogo` | Catálogo de productos |
| `/categorias/[slug]` | Categorías |
| `/productos/[slug]` | Detalle de producto |
| `/carrito` | Carrito de compras |
| `/caja` + `/pago` | Checkout + Bancard |
| `/buscar` | Búsqueda |
| `/mi-cuenta` | Cuenta del cliente |
| `/mis-favoritos` | Wishlist |
| `/sucursales` | Mapa de sucursales (Leaflet) |
| `/contacto` | Formulario de contacto |
| `/paginas/[slug]` | Páginas CMS dinámicas |
| `/rastrear-pedido` | Tracking de pedido |
| `/pedido-recibido` | Confirmación de pedido |
| `/recuperar-contrasena` | Password recovery |
| `/politica-de-privacidad` | Privacy policy |
| `/preview` | CMS preview |

### CMS (ChaiRender — Elementor-like)
- **ChaiRender** (SSR): Renderiza `pages.blocks[]` usando `@platform/engine`. Soporta:
  - Drag-and-drop editor (ChaiBuilderEditor SDK)
  - Section/Column/Widget hierarchy (flat `_parent` nesting)
  - Widget panel, Settings panel, Navigator/tree view
  - Responsive editing (device toggle + per-breakpoint controls)
  - Global settings (ChaiThemeConfigPanel)
  - **Template library** (save/load/export patterns)
  - **Copy/paste elements** (clipboard context)
  - **Motion effects** (11 entrance animations + 6 hover effects)
  - **Custom CSS per widget** (textarea libre)
  - **Global widgets** (reusables across pages)
  - **Inline preview** (iframe, no nueva tab)
  - **CSS Grid/Flexbox visual controls** (container widget)
  - Repeater fields, Dynamic content/tags, History/Undo
  - Display conditions (device, auth, date range)
  - Save/Publish workflow

### 3 Temas
- `base` (Bacola) — Farmacia/grocery, naranja, denso
- `ekomart` — Mercado moderno, verde, amplio
- `anvogue` — Multipropósito, minimalista

Colores white-label inyectados como CSS variables desde admin (`store_config.colors`).

### API Layer
Server-side client en `src/lib/api.ts` que habla con `apps/api`. Multi-tenant via `x-tenant` header.

---

## apps/admin — Panel Admin (Vite + React)

Puerto: 5173 | UI: Ecme | State: Zustand + SWR

### Entry Chain
```
index.html → main.tsx → App.tsx → Theme → BrowserRouter → AuthProvider → Layout → Views
```

### Auth
JWT en localStorage, auto-refresh en 401/419/440, 2 roles (ADMIN, USER).

### 25 Módulos

| Sección | Módulos |
|---|---|
| **Catálogo** | Productos (CRUD), Categorías, Atributos, Variantes, Inventario, Sucursales, Campos dinámicos (producto/categoría/sucursal/checkout) |
| **Ventas** | Pedidos (CRUD), Clientes (CRUD), Pagos, Envíos, Impuestos, Cupones, Reseñas, Reportes |
| **Contenido** | CMS Pages + PageBuilder (ChaiBuilder D&D), Slides/Banners, Biblioteca de medios |
| **Tienda** | Apariencia (StoreConfig), Header/Footer, Ajustes del negocio |
| **Sistema** | Usuarios/roles, Correos (Mailer), Módulos y plugins |

### CMS Builder (ChaiBuilder)
20+ bloques: Hero, ProductGrid, HomeDeals, Banner, CategoryShowcase, SlidesCarousel, Cart, Checkout, ProductDetail, Catalog, etc.

Engine adapter: widgets schema-first de `@platform/engine` → ChaiBuilder blocks.

### Feature Flags
`branches`, `inventory`, `variants`, `units` — ocultan/muestran nav items según tenant.

### HTTP Layer
```
Services → ApiService.fetchDataWithAxios() → AxiosBase
  ├─ Request: Bearer token + x-tenant header
  ├─ Response: auto-refresh on 401/419/440
  └─ Backend: Vite proxy (dev) or VITE_API_URL (prod)
```

### Layout System
PostLoginLayout (sidebar/header/footer) con 6 variantes: CollapsibleSide, StackedSide, FrameLessSide, TopBarClassic, ContentOverlay, Blank.

---

## packages/engine — Page Builder Schema-First

### 5 Pilares

| Módulo | Función |
|---|---|
| Schema types | `WidgetSchema`, `PropDef`, `StyleBinding`, `DynamicValue`, `Responsive<T>` |
| Registry | `Map<string, WidgetSchema>` — `registerWidget()`, `getWidget()` |
| Bindings | Dynamic value system (resolución en runtime) |
| CSS compiler | Genera CSS scoped (`.ft-el-<id>`) con responsive `@media` |
| Render | `renderEngineBlock()` — lookup → bindings → CSS → render |

### 6 Widgets Core
heading, button, image, text, container (acceptsChildren), loop (data-bound products)

### Flujo
Schema → `resolveBindings()` → `compileCss()` → `renderWidget()`. Mismo código en admin canvas y store SSR.

---

## packages/ui — Librería de UI (Ecme)

- **40 UI Components**: Alert, Avatar, Badge, Button, Card, Carousel, Checkbox, DatePicker, Dialog, Drawer, Dropdown, Form, Input, InputGroup, Menu, Pagination, Progress, Radio, Segment, Select, Skeleton, Slider, Spinner, Steps, Switcher, Table, Tabs, Tag, TimeInput, Timeline, Toast, Tooltip, Upload
- **39 Shared Components**: ActionLink, AdaptiveCard, AuthorityCheck, AutoComplete, Chart, ConfirmDialog, Container, DataTable, DebouceInput, EmptyState, Loading, NumericInput, PasswordInput, RichTextEditor, etc.
- **Utils**: `gs()` (Guaraní formatter), `slug()`, `notify()`, `CountrySelect`
- **Estilos**: 35 CSS files + Tailwind + dark mode

---

## packages/shared-types — Contratos API

| Archivo | Contenido |
|---|---|
| auth.ts | Role enum, LoginInput, RegisterInput, SessionUser |
| catalog.ts | ProductDTO, ProductInput, CategoryDTO, BrandDTO, pagination |
| blocks.ts | 20 block types para CMS (Hero, Heading, Text, ProductGrid, etc.) |

---

## Flujo de Datos Completo

```
1. Admin edita páginas con ChaiBuilder → blocks[] → POST /cms/pages
2. API almacena en PostgreSQL → GET /cms/pages/by-slug/:slug
3. Store fetchea SSR → ChaiRender → @platform/engine render
4. White-label: admin StoreConfig → CSS vars en :root (SSR)
5. Multi-tenant: store x-tenant → API resolve → queries scoped
6. Pagos: checkout → Bancard vPOS → webhook → order update
7. ERP: erp_sync module ↔ sistema legacy (productos + pedidos)
```

---

## Infraestructura

### Docker (dev)
```yaml
PostgreSQL 16: localhost:5434 → farmatotal_app
Redis 7:       localhost:6379 → BullMQ queues
MinIO:         localhost:9000/9001 → S3 file storage
```

### Scripts
```bash
pnpm dev          # Turborepo arranca los 3 apps
pnpm build        # Build all
pnpm db:gen       # Generate Drizzle migrations
pnpm db:push      # Push schema to DB
```

### Deploy
GitHub Actions → Docker build → push → auto-deploy en runners.

---

## Dependencias Clave

| Paquete | Versión | Uso |
|---|---|---|
| React | 19.2.x | UI framework |
| Vite | 7.1.x | Admin build |
| Next.js | 16.x | Store SSR |
| Fastify | 5.x | API server |
| Drizzle ORM | — | DB queries |
| Zustand | 5.x | State management |
| SWR | 2.3.x | Data fetching |
| React Hook Form | 7.53 | Forms |
| Zod | 4.1 | Validation |
| TanStack Table | 8.20 | Data tables |
| ChaiBuilder SDK | 4.0-beta.51 | Visual page builder |
| Tailwind CSS | 4.0 | Styling |
| i18next | 26.3 | Internationalization |
| ApexCharts | 4.7 | Charts |
| Prisma | — | Store DB (auth/sessions) |
| Payload CMS | — | Store headless CMS |
