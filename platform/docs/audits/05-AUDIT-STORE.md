# Auditoría del Store — 22 Rutas, 30+ API Proxies

**Fecha:** 26 de junio de 2026

## Page Routes (22)

| Ruta | Estado | Notas |
|---|---|---|
| `/` | ✅ Working | CMS builder (home doc) |
| `/catalogo` | ✅ Working | Paginated product grid |
| `/categorias` | ⚠️ CMS-dependent | Necesita doc publicado |
| `/categorias/[slug]` | ✅ Working | Products by category |
| `/productos/[slug]` | ✅ Working | Full detail: gallery, specs, tabs, reviews, variants |
| `/carrito` | ⚠️ CMS-dependent | Necesita CartBlock |
| `/caja` | ⚠️ CMS-dependent | Necesita CheckoutBlock |
| `/pago/[id]` | ✅ Working | Bancard iframe |
| `/pago/retorno` | ✅ Working | Poll status + Ecme Alert |
| `/pedido-recibido` | ⚠️ CMS-dependent | Necesita OrderConfirmationBlock |
| `/mi-cuenta` | ⚠️ CMS-dependent | Necesita AccountBlock |
| `/mi-cuenta/mis-tarjetas` | ✅ Working | Bancard card management |
| `/mis-favoritos` | ⚠️ CMS-dependent | Necesita WishlistBlock |
| `/buscar` | ⚠️ CMS-dependent | Necesita SearchBlock |
| `/rastrear-pedido` | ⚠️ CMS-dependent | Necesita OrderTrackingBlock |
| `/sucursales` | ⚠️ CMS-dependent | Necesita doc publicado |
| `/contacto` | ⚠️ CMS-dependent | Necesita doc publicado |
| `/politica-de-privacidad` | ⚠️ CMS-dependent | Necesita doc publicado |
| `/paginas/[slug]` | ✅ Working | Generic CMS renderer |
| `/preview/[slug]` | ✅ Working | CMS preview (drafts) |
| `/ecme-test` | ⚠️ Dev-only | UI component test |
| `not-found` | ✅ Working | Custom 404 |

## API Routes (30+)

### Auth (4)
- POST /api/auth/login, POST /api/auth/register, GET /api/auth/me, POST /api/auth/logout

### Products/Catalog (3)
- GET /api/products, GET /api/products/[slug], GET /api/categories

### Checkout (2)
- POST /api/checkout, GET /api/orders

### Bancard (8)
- POST /api/payments/bancard/create, charge, confirm, status, rollback, cards/new, users-cards, delete-card

### Other (7)
- GET/POST /api/wishlist, DELETE /api/wishlist/[productId], GET /api/search/suggest, POST /api/coupons/validate, GET /api/branches, GET /api/site-settings, GET/POST /api/pages

## Providers (8) — ALL WORKING
- CartContext, AuthContext, WishlistContext, CurrencyContext, ToastContext, FeatureFlagsContext, PluginConfigContext, InventoryGate

## CMS Blocks (20+)
- ChaiRender, CmsZone, engineSetup, HeaderBlocks, SiteChromeBlocks, SearchBlock, CatalogBlock, CategoryBlock, ProductDetailBlock, CartBlock, CheckoutBlock, PaymentBlock, OrderConfirmationBlock, OrderTrackingBlock, AccountBlock, AuthGate, WishlistBlock, PasswordRecoveryBlock, BranchesBlock, BranchesMap

## Dead Code (12 archivos)
- lib/auth.ts, lib/db.ts, lib/product.ts, lib/sync/engine.ts, lib/sync/connectors/*, lib/data.ts, lib/format.ts
- components/BaseHome.tsx, commerce/StoreHeader.tsx, commerce/StoreFooter.tsx, commerce/CartPage.tsx, commerce/CheckoutPage.tsx
- admin/SyncPanel.tsx, api/sync/route.ts

## Missing
- Sin `/pedidos/[id]` (no order detail page)
- Sin error boundaries para CMS blocks
- Sin loading states para CMS-dependent pages
- Sin email verification flow
