# COMPLETE STORE AUDIT — apps/store/src

**Fecha:** 26 de junio de 2026

---

## Architecture Overview

**Pattern**: CMS-driven storefront with multi-theme support. Most pages are thin server shells that load content from a backend CMS via `getPage(slug)` and render it with `ChaiRender`. The real UI lives in builder blocks stored in the backend (not in the store codebase). Three themes exist: `base` (Bacola/farmacy), `ekomart`, `anvogue`.

**Backend dependency**: ALL data comes from `apps/api` at `API_URL` / `NEXT_PUBLIC_API_URL`. The store has zero local database for catalog/products (the `db.ts` / `sync/engine.ts` are legacy dead code — the store now proxies everything to the platform API).

---

## 1. PAGE ROUTES — `app/(site)/`

| Route | File | Status | Notes |
|---|---|---|---|
| `/` | `page.tsx` | **WORKING** | Loads `home` doc from CMS builder. Theme-routed. `notFound()` if no doc published. |
| `/catalogo` | `catalogo/page.tsx` | **WORKING** | Paginated product grid via `listProducts()`. Theme-routed + CMS fallback. |
| `/categorias` | `categorias/page.tsx` | **CMS-DEPENDENT** | Loads `categorias` doc from builder. `notFound()` if unpublished. |
| `/categorias/[slug]` | `categorias/[slug]/page.tsx` | **WORKING** | Resolves slug→id, fetches products. Theme-routed + `ProductGrid`. |
| `/productos/[slug]` | `productos/[slug]/page.tsx` | **WORKING** | Full product detail: gallery, actions, specs, tabs, reviews, variants, branch stock. Theme-routed + builder fallback + inline fallback. |
| `/carrito` | `carrito/page.tsx` | **CMS-DEPENDENT** | Loads `carrito` doc. `notFound()` if no CartBlock published. |
| `/caja` | `caja/page.tsx` | **CMS-DEPENDENT** | Loads `checkout` doc. `notFound()` if no CheckoutBlock published. |
| `/pago/[id]` | `pago/[id]/page.tsx` | **WORKING** | Loads `pago` doc or falls back to native `PaymentBlock` (Bancard iframe). |
| `/pago/retorno` | `pago/retorno/page.tsx` | **WORKING** | Client-side polling page. Polls `/api/payments/bancard/status/:orderId` up to 20x. Clears cart on success. |
| `/pedido-recibido` | `pedido-recibido/page.tsx` | **CMS-DEPENDENT** | Loads `pedido-recibido` doc. `notFound()` if unpublished. |
| `/mi-cuenta` | `mi-cuenta/page.tsx` | **CMS-DEPENDENT** | Loads `mi-cuenta` doc. `notFound()` if no AccountBlock published. |
| `/mi-cuenta/mis-tarjetas` | `mi-cuenta/mis-tarjetas/page.tsx` | **WORKING** | Full Bancard card management (list/add/delete). Client component with iframe SDK. |
| `/mis-favoritos` | `mis-favoritos/page.tsx` | **CMS-DEPENDENT** | Loads `mis-favoritos` doc. `notFound()` if no WishlistBlock published. |
| `/buscar` | `buscar/page.tsx` | **CMS-DEPENDENT** | Loads `buscar` doc. `notFound()` if no SearchBlock published. |
| `/rastrear-pedido` | `rastrear-pedido/page.tsx` | **CMS-DEPENDENT** | Loads `rastrear-pedido` doc. `notFound()` if no OrderTrackingBlock published. |
| `/sucursales` | `sucursales/page.tsx` | **CMS-DEPENDENT** | Loads `sucursales` doc. `notFound()` if unpublished. |
| `/contacto` | `contacto/page.tsx` | **CMS-DEPENDENT** | Loads `contacto` doc. `notFound()` if unpublished. |
| `/politica-de-privacidad` | `politica-de-privacidad/page.tsx` | **CMS-DEPENDENT** | Loads doc. `notFound()` if unpublished. |
| `/paginas/[slug]` | `paginas/[slug]/page.tsx` | **WORKING** | Generic CMS page renderer (dynamic slug). |
| `/preview/[slug]` | `preview/[slug]/page.tsx` | **WORKING** | CMS preview (no-cache, shows drafts). |
| `/ecme-test` | `ecme-test/page.tsx` | **DEV-ONLY** | UI component test page (Button, Badge, Input, Alert). |
| `not-found` | `not-found.tsx` | **WORKING** | Custom 404 page with links. |

---

## 2. API ROUTES — `app/(site)/api/`

### Auth (4 routes)
| Route | Method | Status |
|---|---|---|
| `/api/auth/login` | POST | **WORKING** — Proxies to `:4000/auth/login`, sets `ft_at` cookie |
| `/api/auth/register` | POST | **WORKING** — Proxies to `:4000/auth/register`, Zod validation |
| `/api/auth/me` | GET | **WORKING** — Reads `ft_at` cookie → Bearer → `:4000/auth/me` |
| `/api/auth/logout` | POST | **WORKING** — Proxies to `:4000/auth/logout`, clears cookie |

### Products/Catalog (3 routes)
| Route | Method | Status |
|---|---|---|
| `/api/products` | GET | **WORKING** — Proxies with pagination, search, filters |
| `/api/products/[slug]` | GET | **WORKING** — Proxies by-slug, composes reviews + inventory |
| `/api/categories` | GET | **WORKING** — Proxies, returns flat array |

### Checkout/Orders (2 routes)
| Route | Method | Status |
|---|---|---|
| `/api/checkout` | POST | **WORKING** — Full Zod validation, transforms front→backend shape |
| `/api/orders` | GET | **WORKING** — Proxies with auth forwarding, paginated |

### Bancard (8 routes)
| Route | Method | Status |
|---|---|---|
| `/api/payments/bancard/create` | POST | **WORKING** — Creates vPOS payment, Zod validation |
| `/api/payments/bancard/charge` | POST | **WORKING** — Token-based charge |
| `/api/payments/bancard/confirm` | POST | **WORKING** — Webhook proxy |
| `/api/payments/bancard/status/[orderId]` | GET | **WORKING** — Status for retorno polling |
| `/api/payments/bancard/rollback` | POST | **WORKING** — Rollback proxy |
| `/api/payments/bancard/users-cards` | POST | **WORKING** — List saved cards |
| `/api/payments/bancard/cards/new` | POST | **WORKING** — Init card registration |
| `/api/payments/bancard/delete-card` | POST | **WORKING** — Delete saved card |

### Other (7 routes)
| Route | Method | Status |
|---|---|---|
| `/api/wishlist` | GET/POST | **WORKING** — Hybrid localStorage + backend |
| `/api/wishlist/[productId]` | DELETE | **WORKING** — Remove from wishlist |
| `/api/search/suggest` | GET | **WORKING** — Autocomplete proxy |
| `/api/coupons/validate` | POST | **WORKING** — Coupon validation |
| `/api/branches` | GET | **WORKING** — Branch list proxy |
| `/api/site-settings` | GET | **WORKING** — Settings proxy |
| `/api/pages` | GET/POST | **WORKING** — Page listing/creation |

---

## 3. COMPONENTS

### Providers (8 files) — ALL WORKING
| File | Purpose |
|---|---|
| CartContext.tsx | localStorage cart with coupon validation. Full CRUD + coupon apply/remove. |
| AuthContext.tsx | Session management via `/api/auth/me`. Login/register/logout. |
| WishlistContext.tsx | Hybrid localStorage + backend. Merges on login. |
| CurrencyContext.tsx | Multi-currency config (money formatting). |
| ToastContext.tsx | Toast notifications using @platform/ui Notification. |
| FeatureFlagsContext.tsx | Tenant feature flags (branches/inventory/variants/units). |
| PluginConfigContext.tsx | Fetches plugin config from `:4000/plugins/multi_inventory`. |
| InventoryGate.tsx | Gates stock UI based on inventory flag. |

### Sections (12 files)
| File | Status | Notes |
|---|---|---|
| Header.tsx | **WORKING** | 598 lines. Full responsive header with search, cart, user menu, category nav. |
| Footer.tsx | **WORKING** | Config-driven footer. Columns/links from admin settings. |
| MiniCart.tsx | **WORKING** | Slide-over cart panel. |
| FloatingButtons.tsx | **WORKING** | WhatsApp/contact floating buttons. |
| ContactForm.tsx / ContactForm.client.tsx | **CMS-DEPENDENT** | Contact form for builder blocks. |
| PromoBanner.tsx | **CMS-DEPENDENT** | Promo banner for builder. |
| CategoryCircles.tsx | **CMS-DEPENDENT** | Category circles for builder. |
| SeleccionParaVos.tsx | **CMS-DEPENDENT** | "Selected for you" for builder. |
| SuperRombo.tsx | **CMS-DEPENDENT** | Super deal badge for builder. |
| SucursalesList.tsx | **CMS-DEPENDENT** | Branches list for sucursales page. |
| HeroSlider.tsx | **CMS-DEPENDENT** | Hero slider for builder. |
| ScanVoiceModal.tsx | **LIKELY STUB** | Voice/scan search modal. |

### Product Components (6 files) — ALL WORKING
| File | Purpose |
|---|---|
| ProductCard.tsx | Full card with price, discount badge, wishlist, add-to-cart |
| ProductGallery.tsx | Image gallery with zoom |
| ProductActions.tsx | Add to cart, quantity stepper, variant selector |
| ProductTabs.tsx | Description/info/reviews tabs (Ecme Tabs) |
| ProductSpecs.tsx | Technical specs table |
| BranchStock.tsx | Per-branch stock display |

### CMS Blocks (20+ files) — ALL WORKING
| File | Purpose |
|---|---|
| ChaiRender.tsx | Core CMS renderer — interprets builder blocks |
| ChaiClipboard.tsx | Clipboard functionality for CMS |
| CmsZone.tsx | CMS zone wrapper |
| engineSetup.ts | CMS engine configuration |
| HeaderBlocks.tsx | Header builder blocks |
| SiteChromeBlocks.tsx | Site chrome blocks |
| SearchBlock.tsx | Search functionality block |
| CatalogBlock.tsx | Product catalog block (paginated) |
| CategoryBlock.tsx | Category display block |
| ProductDetailBlock.tsx | Product detail block |
| ProductDataContext.tsx | Product data context for blocks |
| CartBlock.tsx | Cart functionality block |
| CheckoutBlock.tsx | Checkout form + order creation block |
| CheckoutMap.tsx | Map picker for delivery address |
| PaymentBlock.tsx | Bancard vPOS iframe block |
| OrderConfirmationBlock.tsx | Order confirmation display |
| OrderTrackingBlock.tsx | Order tracking block |
| AccountBlock.tsx | User account block (orders, profile) |
| AuthGate.tsx | Auth gate for protected blocks |
| WishlistBlock.tsx | Wishlist display block |
| PasswordRecoveryBlock.tsx | Password recovery block |
| BranchesBlock.tsx | Branches list block |
| BranchesMap.tsx | Branches map block |
| TailwindRuntime.tsx | Runtime Tailwind for CMS blocks |

### Sucursal Components (6 files) — ALL WORKING
| File | Purpose |
|---|---|
| SucursalContext.tsx | Branch selection context |
| SucursalModal.tsx | Branch selection modal |
| SucursalTrigger.tsx | Branch selector trigger button |
| InventoryPopup.tsx | Stock popup per branch |
| BranchStockSelector.tsx | Branch stock selector |
| ClickCollectToggle.tsx | Click & collect toggle |

### Other Components
| File | Status |
|---|---|
| QuantityStepper.tsx | **WORKING** — Decimal quantity stepper |
| ui/Carousel.tsx | **WORKING** — Generic carousel |
| ui/Breadcrumbs.tsx | **WORKING** — Breadcrumb navigation |
| ui/button.tsx | **WORKING** — Button re-export |
| cart/CartInventoryGuard.tsx | **WORKING** — Stock validation in cart |
| icons.tsx | **WORKING** — SVG icon components |
| commerce/ProductGrid.tsx | **WORKING** — Product grid for catalog/category |

---

## 4. LIB DIRECTORY

| File | Status | Notes |
|---|---|---|
| api.ts | **WORKING** | Core backend client. 531 lines. Products, categories, pages, reviews, variants, settings, store config, feature flags, header/footer config. |
| checkout.ts | **WORKING** | Client-side hooks: useShippingQuote, useTaxConfig, usePaymentMethods. Config-driven. |
| money.ts | **WORKING** | Multi-currency formatting (Intl-based). Server + client safe. |
| orderFlow.ts | **WORKING** | Inventory auto-assignment logic (most_stock, distance, etc.). |
| sucursales.ts | **WORKING** | Branch fetch, zoning, haversine distance, department mapping. |
| texts.ts | **WORKING** | Config-driven i18n strings for stock/delivery labels. |
| units.ts | **WORKING** | Decimal quantity formatting + unit step logic. |
| utils.ts | **WORKING** | cn() tailwind-merge utility. |
| tenant.ts | **WORKING** | Client-side tenant headers for multi-domain. |

---

## 5. THEMES

| Theme | Files | Status |
|---|---|---|
| base (Bacola) | Inline components + sections/Header + sections/Footer | **WORKING** — Production theme. |
| ekomart | 12 files: Chrome, Header, Footer, Home, ProductCard, Search, 4 pages, 4 sections | **WORKING** — Full theme. |
| anvogue | 15 files: Chrome, Header, Footer, Home, ProductCard, Search, Breadcrumb, 4 pages, 6 sections | **WORKING** — Full theme. |

---

## 6. TYPES

| File | Status |
|---|---|
| index.ts | **WORKING** — Product, Category, CartLine, Coupon, Order, User, Review, etc. |
| bancard.d.ts | **WORKING** — Bancard SDK type declarations |
| tailwind-browser.d.ts | **WORKING** — Tailwind browser types |

---

## DEAD CODE (pendiente de eliminar)

| File | Reason |
|---|---|
| `lib/auth.ts` | Prisma session management (replaced by backend auth) |
| `lib/db.ts` | Prisma client (only used by dead sync code) |
| `lib/product.ts` | Prisma product helpers |
| `lib/sync/engine.ts` | Old sync engine |
| `lib/sync/connectors/*` | Old sync connectors |
| `lib/data.ts` | Deprecated formatGs wrapper |
| `lib/format.ts` | Another deprecated formatGs wrapper |
| `components/BaseHome.tsx` | Old home component |
| `components/commerce/StoreHeader.tsx` | Replaced by sections/Header.tsx |
| `components/commerce/StoreFooter.tsx` | Replaced by sections/Footer.tsx |
| `components/commerce/CartPage.tsx` | Replaced by CMS CartBlock |
| `components/commerce/CheckoutPage.tsx` | Replaced by CMS CheckoutBlock |
| `components/admin/SyncPanel.tsx` | Old sync UI |
| `api/sync/route.ts` | Old sync API endpoint |

---

## MISSING

- No `/pedidos/[id]` route (no order detail page)
- No error boundaries for CMS block failures
- No loading states for CMS-dependent pages (they just notFound())
- No email verification flow
- No product reviews submission UI component (API exists but no form)
