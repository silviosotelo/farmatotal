# Auditoría de Rutas API — CRUD Completo

**Fecha:** 26 de junio de 2026

## Matriz CRUD por entidad

| Entidad | List | Get | Create | Update | Delete | Falta |
|---|---|---|---|---|---|---|
| tenants | GET /tenant | — | — | PATCH /tenant/config | — | Create/Delete |
| users | GET /users | /auth/me | POST /users | PATCH /users/:id | DELETE /users/:id | — |
| categories | GET /catalog/categories | tree | POST | PATCH | DELETE | — |
| brands | GET /catalog/brands | — | POST | **NO** | **NO** | PUT, DELETE |
| products | GET /catalog/products | GET + by-slug | POST | PATCH | DELETE | Bulk ops, images |
| product_images | **SIN API** | — | — | — | — | CRUD completo |
| branches | GET /branches | — | POST | PATCH | **NO** | DELETE |
| inventory | GET /inventory/product/:id | — | PUT (upsert) | PUT | **NO** | — |
| orders | GET /orders | GET + by-number | POST /checkout | PATCH status | — | Full update, DELETE |
| order_lines | — (nested) | — | via checkout | — | — | — |
| payments | GET /transactions | GET /status/:id | POST /bancard/create | auto | — | — |
| coupons | GET /coupons | — | POST | PATCH | **NO** | DELETE |
| customers | GET /customers | GET /:id | POST | PATCH | DELETE | — |
| reviews | GET /reviews/all | — | POST | PATCH (moderate) | DELETE | GET by ID |
| slides | GET /slides | — | POST | PATCH | DELETE | — |
| pages (CMS) | GET /cms/pages | GET by-slug | POST | PATCH | DELETE | — |
| settings | GET by key | — | PUT (upsert) | PUT | **NO** | List all |
| media | GET /media | serve | POST | **NO** | DELETE | Update |
| mailer templates | GET | — | POST | PATCH | DELETE | — |
| mailer queue | GET | — | — | POST /retry | — | — |
| wa templates | GET | — | POST | PATCH | DELETE | — |
| wa workflows | GET | — | POST | **NO** | DELETE | PATCH |
| erp_field_mappings | GET by entity | — | PUT (replace) | PUT | — | — |
| erp_sync runs | GET | — | — | — | — | Audit table |

## Endpoints de Pagos (Bancard)

| Endpoint | Method | Auth | Estado |
|---|---|---|---|
| /payments/bancard/create | POST | Tenant | ✅ |
| /payments/bancard/confirm | POST | None (token) | ✅ |
| /payments/bancard/status/:orderId | GET | Tenant | ✅ |
| /payments/bancard/charge | POST | Tenant | ✅ |
| /payments/bancard/rollback | POST | Tenant | ✅ |
| /payments/bancard/cards/new | POST | Tenant | ✅ |
| /payments/bancard/users-cards | POST | Tenant | ✅ |
| /payments/bancard/delete-card | POST | Tenant | ✅ |
| /payments/methods | GET/PUT/DELETE | Tenant | ✅ |
| /payments/transactions | GET | Tenant | ✅ |

## Endpoints de ERP Sync (actuales)

| Endpoint | Method | Estado |
|---|---|---|
| /erp-sync/adapters | GET | ⚠️ Sin tenant filter |
| /erp-sync/runs | GET | ⚠️ Sin tenant filter |
| /erp-sync/mappings | GET/PUT | ✅ |
| /erp-sync/import | POST | ✅ (solo products+categories) |
| /erp-sync/sync-stock | POST | ✅ (sin UI trigger) |

## Gaps de CRUD

| Entidad | Falta |
|---|---|
| brands | GET by ID, PUT, DELETE |
| product_images | CRUD completo |
| branches | DELETE |
| coupons | DELETE |
| customers | DELETE (existe en API pero no en admin) |
| settings | List all |
| orders | Full update (no solo status) |
| wa_workflows | PATCH |
