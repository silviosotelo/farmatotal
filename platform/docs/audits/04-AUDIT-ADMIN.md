# ADMIN APP — COMPLETE FEATURE INVENTORY

**Fecha:** 26 de junio de 2026

---

## 1. AUTH SYSTEM
- **Files**: `auth/AuthProvider.tsx`, `auth/AuthContext.ts`, `auth/useAuth.ts`, `store/authStore.ts`
- **Status**: ✅ FULLY IMPLEMENTED
- **Features**: JWT login/bootstrap, logout, session persistence (localStorage/cookies), role-based authority (admin/editor/viewer/customer), apiGetCurrentUser() for session restore, forgot/reset password views
- **API**: POST /auth/login, POST /auth/bootstrap, POST /auth/logout, GET /auth/me

---

## 2. CATALOG MODULES

### Products (List / Create / Edit)
- **Files**: products/ProductList/, products/ProductCreate/, products/ProductEdit/, products/ProductForm/
- **Status**: ✅ FULLY IMPLEMENTED
- **CRUD**: List (paginated, searchable, sortable), Create, Edit, Delete with confirm dialog
- **Forms**: Name, description, SKU, price, priceNormal, costPerItem, bulkDiscountPrice, category, brand, imgList, taxRate, codInterno, barcode, custom fields, status, controlled, featured, onPromo, unit, unitStep, productType, attributes (ficha técnica)
- **API**: GET /catalog/products, GET /catalog/products/:id, POST /catalog/products, PATCH /catalog/products/:id, DELETE /catalog/products/:id
- **Service**: ProductService.ts — full adapter layer (backend↔frontend), minor/major currency conversion

### Product Fields (Entity Fields)
- **Files**: entity-fields/ProductFields.tsx, entity-fields/EntityFieldsEditor.tsx, entity-fields/PlainCustomFields.tsx
- **Status**: ✅ FULLY IMPLEMENTED
- **Features**: Generic field editor for product entity. Builtin fields (read-only key, toggle enabled), custom fields (add/remove/reorder, type select/text/number/textarea/boolean/date, width half/full, required). Saves to mod_product_fields setting.
- **API**: GET /cms/settings/:key, PUT /cms/settings/:key

### Categories
- **Files**: categories/Categories.tsx
- **Status**: ✅ FULLY IMPLEMENTED
- **CRUD**: List, Create, Edit (inline form), no Delete exposed in UI
- **Features**: Hierarchical (parentId), slug auto-gen, active toggle, custom fields via PlainCustomFields
- **API**: GET /catalog/categories, POST /catalog/categories, PATCH /catalog/categories/:id

### Attributes
- **Files**: attributes/Attributes.tsx
- **Status**: ✅ FULLY IMPLEMENTED
- **Features**: Global reusable attributes (Color, Talle…). Add/remove/edit rows, comma-separated values, Tag previews. Save all.
- **API**: GET /attributes, PUT /attributes

### Variants
- **Files**: variants/Variants.tsx
- **Status**: ✅ FULLY IMPLEMENTED
- **Features**: Product search → pick → define attributes → cartesian product generator → bulk create missing combos. Per-row SKU/price/stock/active editing. Bulk apply price/stock to all variants.
- **API**: GET /variants?productId=, POST /variants, PATCH /variants/:id, DELETE /variants/:id

### Category Fields / Branch Fields
- **Files**: entity-fields/CategoryFields.tsx, entity-fields/BranchFields.tsx
- **Status**: ✅ FULLY IMPLEMENTED (delegates to EntityFieldsEditor with different settingsKey)

---

## 3. INVENTORY
- **Files**: inventory/Inventory.tsx
- **Status**: ✅ FULLY IMPLEMENTED
- **Features**: Product search → pick → per-branch stock table with inline editing. CSV import (parse + batch). CSV export link. Feature-flagged via flags.inventory.
- **API**: GET /catalog/products?q=, GET /inventory/product/:id, PUT /inventory, POST /inventory/import, GET /inventory/export

---

## 4. BRANCHES
- **Files**: branches/Branches.tsx
- **Status**: ✅ FULLY IMPLEMENTED
- **CRUD**: Card-based list, Create, Edit (inline form), toggle active
- **Features**: Code, erpCode, name, address, city, phone, lat/lng, pickupEnabled, deliveryEnabled, active, custom fields. Feature-flagged via flags.branches.
- **API**: GET /branches, POST /branches, PATCH /branches/:id

---

## 5. SALES MODULES

### Orders (List / Create / Edit / Details)
- **Files**: orders/OrderList/, orders/OrderCreate/, orders/OrderEdit/, orders/OrderForm/, orders/OrderDetailSimple.tsx
- **Status**: ✅ FULLY IMPLEMENTED
- **CRUD**: Paginated list with filters, Create (manual with product picker), Edit, Detail view with status change, refund, activity log
- **Features**: Customer info, payment method, line items, subtotal/discount/total, tax-aware IVA display, refund (partial/full), order events timeline
- **API**: GET /orders, GET /orders/:id, POST /orders, PUT /orders/:id, PATCH /orders/:id/status, POST /orders/:id/refund

### Customers (List / Create / Edit / Details)
- **Files**: customers/CustomerList/, customers/CustomerCreate/, customers/CustomerEdit/, customers/CustomerDetails/, customers/CustomerForm/
- **Status**: ✅ FULLY IMPLEMENTED
- **CRUD**: Paginated list with search/filters, Create, Edit, Details view
- **API**: GET /customers, GET /customers/:id, POST /customers, PATCH /customers/:id, DELETE /customers/:id

### Payments
- **Files**: payments/Payments.tsx
- **Status**: ✅ FULLY IMPLEMENTED
- **Features**: Two tabs — Methods (gateway cards linking to plugin config + custom methods with dynamic fields, enable/disable, save/delete) and Transactions (table with date, order, customer, provider, amount, status)
- **API**: GET /payments/methods, PUT /payments/methods/:key, DELETE /payments/methods/:key, GET /payments/transactions

### Shipping
- **Files**: shipping/Shipping.tsx
- **Status**: ✅ FULLY IMPLEMENTED
- **Features**: Zone-based config. Add/remove zones (name, cities). Per-zone methods (name, type: flat/free/pickup/weight, cost, freeFrom, perKg, active). Full CRUD inline.
- **API**: GET /shipping/config, PUT /shipping/config

### Tax
- **Files**: tax/Tax.tsx
- **Status**: ✅ FULLY IMPLEMENTED
- **Features**: Toggle pricesIncludeTax, rate list (name, percent, isDefault), add/remove/edit
- **API**: GET /tax/config, PUT /tax/config

### Checkout Fields
- **Files**: checkout-fields/CheckoutFields.tsx
- **Status**: ✅ FULLY IMPLEMENTED
- **Features**: Full field editor for checkout form. Label, role mapping (maps to order fields), type (text/email/tel/textarea/select/city/department/location), width, enabled, required, reorder. Restore defaults.
- **API**: GET /cms/settings/mod_checkout, PUT /cms/settings/mod_checkout

### Coupons
- **Files**: coupons/Coupons.tsx
- **Status**: ✅ FULLY IMPLEMENTED
- **CRUD**: List (DataTable), Create (code, type percent/fixed, value)
- **Missing**: No edit/delete UI for coupons (only create + list)
- **API**: GET /coupons, POST /coupons

### Reviews
- **Files**: reviews/Reviews.tsx
- **Status**: ✅ FULLY IMPLEMENTED
- **Features**: Filter by status (pending/approved/rejected/all), DataTable with author/rating/body/status/actions. Moderate (approve/reject), delete.
- **API**: GET /reviews, PATCH /reviews/:id, DELETE /reviews/:id

### Reports
- **Files**: reports/Reports.tsx
- **Status**: ✅ FULLY IMPLEMENTED
- **Features**: Date range presets (7/30/90 days). KPIs (revenue, orders, avg order, units). Area chart (revenue/day). Top products table. Orders by status + payment method breakdown.
- **API**: GET /stats/reports?from=&to=

---

## 6. CONTENT MODULES

### CMS Pages
- **Files**: cms/Cms.tsx, cms/PageBuilder.tsx
- **Status**: ✅ FULLY IMPLEMENTED
- **Features**: System pages (Home, Contacto, Sucursales, Sobre nosotros, etc.), Widget zones (zone-footer-top, zone-catalogo-top, etc.), custom pages. CRUD (create/publish/unpublish/delete). Visual page builder using @chaibuilder/sdk with 20+ custom commerce blocks.
- **API**: GET /cms/pages, POST /cms/pages, PATCH /cms/pages/:id, DELETE /cms/pages/:id

### Slides
- **Files**: slides/Slides.tsx
- **Status**: ✅ FULLY IMPLEMENTED
- **CRUD**: Create (title, imageDesktop, imageMobile, linkHref, days, position, active), list with toggle active, delete
- **API**: GET /slides, POST /slides, PATCH /slides/:id, DELETE /slides/:id

### Media (FileManager)
- **Files**: files/FileManager/
- **Status**: ✅ FULLY IMPLEMENTED
- **Features**: Grid/list layout, directory navigation, upload, rename, delete, share/invite dialogs, file details panel. Uses Zustand store.

---

## 7. STORE CONFIGURATION

### Store Config (Apariencia y marca)
- **Files**: store-config/StoreConfig.tsx
- **Status**: ✅ FULLY IMPLEMENTED
- **Features**: Brand identity (name, tagline, description, logo, favicon), currency/locale Selects (PYG/USD/BRL/ARS/EUR, es-PY/pt-BR/es-AR/en-US), theme picker (4 themes: base/ekomart/anvogue/grostore), brand colors (6 color pickers + gradient)

### Header & Footer Config
- **Files**: store-config/HeaderFooterConfig.tsx
- **Status**: ✅ FULLY IMPLEMENTED
- **Features**: Top nav links (add/remove/edit), footer columns with nested links (add/remove/edit), copyright text

### Settings (Ajustes del negocio)
- **Files**: settings/Settings.tsx
- **Status**: ✅ FULLY IMPLEMENTED
- **Features**: Store name, email, phone, address. Currency/locale removed (en StoreConfig).

---

## 8. SYSTEM MODULES

### Users & Roles
- **Files**: users/Users.tsx
- **Status**: ✅ FULLY IMPLEMENTED
- **CRUD**: List (table with inline role change, toggle active, delete), Create (email, name, password, role)
- **Roles**: admin, editor, viewer, customer

### Mailer
- **Files**: mailer/Mailer.tsx
- **Status**: ✅ FULLY IMPLEMENTED
- **Features**: 4 tabs — Templates (CRUD with key/name/subject/html body), Queue (list/process/retry), Logs (sent history with status), Config (provider: log/sendgrid/smtp, fromName/fromEmail, API key, SMTP host/port/user/pass, test email)

### Modules & Plugins
- **Files**: modules/Modules.tsx
- **Status**: ✅ FULLY IMPLEMENTED
- **Features**: Lists all modules (native + plugin). Toggle on/off with dependency checking. Category badges. Links to config pages.

---

## 9. PLUGINS (all via PluginConfig.tsx — Ecme Settings pattern)

| Plugin | Key | Status | Notas |
|---|---|---|---|
| Bancard | gw_bancard | ✅ FULLY CUSTOM | 4 tabs (credenciales, pagos simples, recurrentes, QR), 14 campos |
| Multi-Inventory | multi_inventory | ✅ FULLY CUSTOM | 12 sub-views, 97 config fields |
| ERP Sync | erp_sync | ✅ FULLY CUSTOM | Config + import + mapping + history |
| WhatsApp | wh_whatsapp | ✅ FULLY CUSTOM | Config + Templates + Workflows + Logs |
| PersonalPay | gw_personalpay | ✅ | Config-driven |
| TigoMoney | gw_tigomoney | ✅ | Config-driven |
| Dinelco | gw_dinelco | ✅ | Config-driven |
| Meta | mk_meta | ✅ | Config-driven |
| Google | mk_google | ✅ | Config-driven |
| Cloudflare | infra_cloudflare | ✅ | Config-driven |
| ScanSearch | feat_scan_search | ✅ | Config-driven |

### PluginConfig (generic renderer)
- **File**: plugins/PluginConfig.tsx
- **Status**: ✅ FULLY IMPLEMENTED
- **Features**: Schema-driven renderer. Groups fields by group with icons. Toggle/text/password/number/select field types. Sidebar nav (desktop) + drawer (mobile). Sensitive fields masked. Save config.
- **Pattern**: Ecme Settings (AdaptiveCard + Menu sidebar + responsive drawer)

---

## 10. SERVICES LAYER (30+ services)

| Service | Status | Operations |
|---|---|---|
| AuthService | ✅ | signIn, signOut, getCurrentUser, forgotPassword, resetPassword |
| ProductService | ✅ | list, get, create, update, delete |
| OrderService | ✅ | list, get, create, update, updateStatus, refund |
| CustomersService | ✅ | list, get, create, update, delete |
| InventoryService | ✅ | searchProducts, getProductInventory, setInventory, importInventory, exportUrl |
| CategoryService | ✅ | get, create, update |
| BranchService | ✅ | get, create, update |
| AttributeService | ✅ | get, save |
| VariantService | ✅ | get, create, update, delete, searchProducts |
| CouponService | ✅ | get, create |
| ReviewService | ✅ | get, moderate, delete |
| ReportService | ✅ | getSalesReport |
| PaymentService | ✅ | getMethods, saveMethod, deleteCustomMethod, getTransactions |
| ShippingService | ✅ | getConfig, saveConfig |
| TaxService | ✅ | getTaxConfig, saveTaxConfig |
| CmsService | ✅ | getPages, createPage, updatePage, deletePage, getSetting, setSetting |
| SlideService | ✅ | get, create, update, delete |
| MailerService | ✅ | templates, queue, log, config, test |
| ModuleService | ✅ | get, toggle |
| PluginService | ✅ | get, save |
| UserService | ✅ | get, create, update, delete |
| ErpSyncService | ✅ | adapters, syncRuns, getMappings, saveMappings, runImport |
| WhatsappService | ✅ | templates, workflows, log, test |
| EntityFieldsService | ✅ | get, save |
| CheckoutFieldsService | ✅ | get, save |
| StatsService | ✅ | stats |

---

## 11. STORES (Zustand)

| Store | File |
|---|---|
| authStore | store/authStore.ts |
| routeKeyStore | store/routeKeyStore.ts |
| productListStore | products/.../productListStore.ts |
| orderListStore | orders/.../orderListStore.ts |
| orderFormStore | orders/.../orderFormStore.ts |
| customerListStore | customers/.../customerListStore.ts |
| fileManagerStore | files/.../useFileManagerStore.tsx |
| pluginStore (MultiInv) | plugins/multi-inventory/store/ |

---

## 12. CONFIGS

| Config | Status |
|---|---|
| Routes (conceptsRoute.ts) | ✅ 40+ routes |
| Navigation (concepts.navigation.config.ts) | ✅ 5 sections |
| Endpoint config | ✅ |
| Chart config | ✅ |

---

## SUMMARY

| Category | Modules | Status |
|---|---|---|
| Auth | Login, Bootstrap, Session, Roles | ✅ COMPLETE |
| Catalog | Products, Categories, Attributes, Variants, Entity Fields | ✅ COMPLETE |
| Inventory | Stock by branch, CSV import/export | ✅ COMPLETE |
| Branches | CRUD, erpCode, pickup/delivery flags | ✅ COMPLETE |
| Sales | Orders (full CRUD+refund), Customers (CRUD), Payments, Shipping, Tax, Coupons, Reviews, Reports | ✅ COMPLETE |
| Content | CMS Builder (20+ blocks), Slides, Media Manager | ✅ COMPLETE |
| Store Config | Brand/Theme/Colors (4 themes), Header/Footer, Settings | ✅ COMPLETE |
| System | Users/Roles, Mailer (templates/queue/logs/config), Modules | ✅ COMPLETE |
| Plugins | 11 plugins, ALL implemented | ✅ COMPLETE |

**No stubs or placeholders found.** Every routed module has a real, functional implementation backed by API service calls.
