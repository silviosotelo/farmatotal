# Auditoría del ERP Sync Plugin — Estado Actual vs VTEX

**Fecha:** 26 de junio de 2026

## Arquitectura Correcta (VTEX-style)
```
ERP → llama NUESTRA API → crea/actualiza productos, stock, categorías
Nuestro ecommerce → lee de SU propia base
```
**No tiramos del ERP — el ERP pushea a nosotros.**

## Estado Actual del Plugin

### Backend (5 archivos core)
| Archivo | Función |
|---|---|
| adapters/types.ts | Interface ErpAdapter + registry |
| adapters/farmatotal.ts | pushOrder + fetchStock (sin import) |
| adapters/woo.ts | importProducts (sin categories/stock) |
| adapters/rest.ts | importProducts + importCategories (sin push/stock) |
| generic-import.ts | Upsert engine (products + categories) |
| mapper.ts | Field mapping engine (6 transforms) |
| push.ts | Order push (hook-driven) |
| erp-sync.routes.ts | 5 endpoints |

### Admin UI (2 archivos)
| Archivo | Función |
|---|---|
| ErpSync.tsx | Config + import buttons + mapping editor + sync history |
| ErpSyncService.ts | API client (5 functions, 1 dead code) |

### Lo que tiene
- Import de products y categories (rest adapter)
- Push de orders al ERP (farmatotal adapter)
- Sync de stock (endpoint existe, sin UI)
- Mapeo de campos configurables
- Historial de sync runs

### Lo que NO tiene
- No hay API que el ERP llame (nosotros tiramos del ERP, no al revés)
- No hay auth por API key (usa JWT del admin)
- No hay webhooks registrables
- No hay pricing sync
- No hay customer sync
- No hay batch inventory
- No hay order feed polling
- No hay retry en push fallido
- No hay delta/cursor sync (syncCursors table sin usar)

## Comparación con VTEX

| Capacidad | VTEX | Nosotros | Gap |
|---|---|---|---|
| Products CRUD push | ✅ | Solo pull (rest adapter) | CRÍTICO |
| Stock push/batch | ✅ | Endpoint sin UI, sin auto | CRÍTICO |
| Orders feed | ✅ Feed v3 + hooks | Solo push (hook-driven) | ALTO |
| Pricing sync | ✅ | ❌ | ALTO |
| Customer sync | ✅ | ❌ | MEDIO |
| Categories CRUD push | ✅ | Solo pull (rest adapter) | MEDIO |
| Webhooks registrables | ✅ | ❌ | MEDIO |
| Auth por API key | ✅ | Solo JWT | MEDIO |
| Batch inventory | ✅ | ❌ | MEDIO |
| Order tracking push | ✅ | ❌ | MEDIO |

## API Design (VTEX-style) — Pendiente de implementar

### Auth
- API keys con SHA-256 hashing, scopes, rate limit per key
- Bearer token en cada request

### Catalog (ERP → Nosotros)
- POST /erp/v1/products (upsert single)
- POST /erp/v1/products/bulk (upsert 500)
- DELETE /erp/v1/products/:sourceId
- POST /erp/v1/categories
- POST /erp/v1/brands
- POST /erp/v1/specifications
- GET /erp/v1/products, GET /erp/v1/categories

### Inventory (ERP → Nosotros)
- POST /erp/v1/inventory
- POST /erp/v1/inventory/batch (5000 items)
- GET /erp/v1/inventory

### Orders (Nosotros ← ERP)
- GET /erp/v1/orders, GET /erp/v1/orders/:id
- PATCH /erp/v1/orders/:id/status
- POST /erp/v1/orders/:id/tracking
- POST /erp/v1/orders/:id/invoice

### Pricing (ERP → Nosotros)
- POST /erp/v1/prices, POST /erp/v1/prices/bulk

### Customers (ERP → Nosotros)
- POST /erp/v1/customers, GET /erp/v1/customers

### Webhooks (Bidireccional)
- POST/DELETE/GET /erp/v1/webhooks
- HMAC-SHA256 signed, exponential backoff

## DB necesaria
- erp_api_keys (API keys con scopes)
- erp_webhooks + erp_webhook_deliveries
- order_tracking
- order_invoices
- product_specifications

## Fases de implementación
1. Core: auth + catalog + inventory + pricing
2. Orders: detail + tracking + invoices
3. Webhooks: dispatcher + retry engine
4. Admin: API key management + sync runs
5. Backward compat: import endpoint
