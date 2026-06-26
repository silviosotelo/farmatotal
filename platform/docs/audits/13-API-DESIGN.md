# API Design — Basada en el nuevo DB Schema

**Principio:** REST sobre las 18 capas del schema. Cada dominio es un módulo. Auth JWT para admin, API keys para ERP, public para storefront.

---

## Auth

### Admin Auth (JWT)
| Method | Path | Auth | Body |
|---|---|---|---|
| POST | /auth/login | None | {email, password} |
| POST | /auth/register | None | {email, password, name} |
| POST | /auth/refresh | Cookie | {refreshToken} |
| POST | /auth/logout | JWT | — |
| GET | /auth/me | JWT | — |
| POST | /auth/forgot-password | None | {email} |
| POST | /auth/reset-password | None | {token, password} |
| POST | /auth/bootstrap | None | {email, password, name} (solo si no hay users) |

### ERP Auth (API Key)
| Method | Path | Auth | Body |
|---|---|---|---|
| POST | /erp/v1/auth/keys | JWT (admin) | {name, scopes} → returns plaintext key ONCE |
| GET | /erp/v1/auth/keys | JWT (admin) | List keys (sin plaintext) |
| DELETE | /erp/v1/auth/keys/:id | JWT (admin) | Revoke key |
| Todas las /erp/v1/* routes | Bearer API key | Header: Authorization: Bearer ft_live_xxx |

---

## Posts (contenido universal)

| Method | Path | Auth | Query/Body |
|---|---|---|---|
| GET | /posts | JWT | ?type=product&status=published&page=1&perPage=50&search= |
| GET | /posts/:id | JWT | — |
| GET | /posts/by-slug/:type/:slug | JWT/Public | — |
| POST | /posts | JWT | {type, title, slug, content, excerpt, parentId, status} |
| PATCH | /posts/:id | JWT | Partial update |
| DELETE | /posts/:id | JWT | Soft delete (deleted_at) |
| GET | /posts/:id/meta | JWT | List all meta |
| POST | /posts/:id/meta | JWT | {key, value} |
| PUT | /posts/:id/meta/:key | JWT | {value} upsert |
| DELETE | /posts/:id/meta/:key | JWT | Remove meta |

---

## Terms (categorías, marcas, tags, atributos)

| Method | Path | Auth | Query/Body |
|---|---|---|---|
| GET | /terms | JWT | ?taxonomy=product_cat&parentId= |
| GET | /terms/tree/:taxonomy | JWT/Public | Tree structure |
| GET | /terms/:id | JWT | — |
| POST | /terms | JWT | {taxonomy, name, slug, parentId, description} |
| PATCH | /terms/:id | JWT | Partial update |
| DELETE | /terms/:id | JWT | Soft delete |
| POST | /posts/:postId/terms | JWT | {termId} — assign term to post |
| DELETE | /posts/:postId/terms/:termId | JWT | Unassign |
| GET | /terms/:id/meta | JWT | List meta |
| POST | /terms/:id/meta | JWT | {key, value} |
| DELETE | /terms/:id/meta/:key | JWT | Remove |

---

## Options (settings)

| Method | Path | Auth | Query/Body |
|---|---|---|---|
| GET | /options/:name | JWT | — |
| GET | /options | JWT | List all (autoload=true) |
| PUT | /options/:name | JWT | {value} upsert |
| DELETE | /options/:name | JWT | Remove |

---

## Products

| Method | Path | Auth | Query/Body |
|---|---|---|---|
| GET | /products | JWT/Public | ?page=&perPage=&search=&categoryId=&brandId=&status=&featured=&sort= |
| GET | /products/:id | JWT/Public | — |
| GET | /products/by-slug/:slug | JWT/Public | — |
| POST | /products | JWT | {sku, title, slug, priceNormal, priceWeb, ...} |
| PATCH | /products/:id | JWT | Partial update |
| DELETE | /products/:id | JWT | Soft delete |
| GET | /products/:id/images | JWT/Public | — |
| POST | /products/:id/images | JWT | {url, alt, position, isPrimary} |
| DELETE | /products/:id/images/:imageId | JWT | — |
| GET | /products/:id/variations | JWT/Public | — |
| POST | /products/:id/variations | JWT | {sku, title, priceNormal, priceWeb, attributes} |
| PATCH | /variations/:id | JWT | Partial update |
| DELETE | /variations/:id | JWT | — |
| GET | /products/:id/specifications | JWT/Public | — |
| POST | /products/:id/specifications | JWT | {specs: [{group, label, value}], replaceAll} |

---

## Branches & Inventory

| Method | Path | Auth | Query/Body |
|---|---|---|---|
| GET | /branches | JWT/Public | ?active=true |
| GET | /branches/:id | JWT | — |
| POST | /branches | JWT | {code, name, address, ...} |
| PATCH | /branches/:id | JWT | Partial update |
| DELETE | /branches/:id | JWT | Soft delete |
| GET | /branches/:id/inventory | JWT | Stock for branch |
| GET | /inventory/product/:productId | JWT | Stock across all branches |
| PUT | /inventory | JWT | {productId, branchId, stock} upsert |
| GET | /inventory/export | JWT | CSV export |
| POST | /inventory/import | JWT | CSV import |
| GET | /inventory/manager | JWT | Grid products×branches |
| GET | /branches/delivery-cost | Public | ?branchId= |
| POST | /branches/check-radius | Public | {lat, lng} |

---

## Orders

| Method | Path | Auth | Query/Body |
|---|---|---|---|
| POST | /orders/checkout | Public | {billing, lines, paymentMethod, shippingMethod, ...} |
| GET | /orders | JWT | ?status=&page=&search=&createdSince= |
| GET | /orders/:id | JWT | — |
| GET | /orders/by-number/:number | Public | Track order |
| PATCH | /orders/:id/status | JWT | {status, note} |
| POST | /orders/:id/refund | JWT | {amount, reason} |
| GET | /orders/:id/tracking | JWT/Public | List tracking entries |
| POST | /orders/:id/tracking | JWT/ERP | {carrier, trackingNumber, trackingUrl} |
| GET | /orders/:id/notes | JWT | Internal notes |
| POST | /orders/:id/notes | JWT | {content, isCustomerNote} |
| GET | /orders/:id/meta | JWT | — |
| POST | /orders/:id/meta | JWT | {key, value} |

---

## Payments

| Method | Path | Auth | Query/Body |
|---|---|---|---|
| GET | /payment-gateways | JWT | List gateways |
| POST | /payment-gateways | JWT | {gatewayKey, title, description} |
| PATCH | /payment-gateways/:id | JWT | {enabled, title, sortOrder} |
| DELETE | /payment-gateways/:id | JWT | — |
| GET | /payment-gateways/:id/meta | JWT | List meta (sensitive masked) |
| PUT | /payment-gateways/:id/meta/:key | JWT | {value, isSensitive} |
| POST | /payments/bancard/create | JWT | {orderId} |
| POST | /payments/bancard/confirm | None (token) | Bancard webhook |
| GET | /payments/bancard/status/:orderId | JWT | — |
| POST | /payments/bancard/charge | JWT | {shopProcessId, amount, aliasToken, ...} |
| POST | /payments/bancard/rollback | JWT | {shopProcessId} |
| POST | /payments/bancard/cards/new | JWT | {cardId, userId, ...} |
| POST | /payments/bancard/users-cards | JWT | {userId} |
| POST | /payments/bancard/delete-card | JWT | {userId, cardToken} |
| GET | /payments/transactions | JWT | ?page=&status= |

---

## Coupons

| Method | Path | Auth | Query/Body |
|---|---|---|---|
| GET | /coupons | JWT | ?active=&page= |
| GET | /coupons/:id | JWT | — |
| POST | /coupons | JWT | {code, discountType, amount, ...} |
| PATCH | /coupons/:id | JWT | Partial update |
| DELETE | /coupons/:id | JWT | Soft delete |
| GET | /coupons/validate/:code | Public | ?subtotal= |
| GET | /coupons/:id/usages | JWT | Usage history |

---

## Shipping

| Method | Path | Auth | Query/Body |
|---|---|---|---|
| GET | /shipping/zones | JWT | — |
| POST | /shipping/zones | JWT | {name, sortOrder} |
| PATCH | /shipping/zones/:id | JWT | — |
| DELETE | /shipping/zones/:id | JWT | — |
| POST | /shipping/zones/:id/locations | JWT | {locationCode, locationType} |
| DELETE | /shipping/zones/:id/locations/:locId | JWT | — |
| GET | /shipping/methods | JWT | — |
| POST | /shipping/methods | JWT | {methodKey, title} |
| POST | /shipping/zones/:id/methods | JWT | {methodId, cost, freeFrom} |
| PATCH | /shipping/zone-methods/:id | JWT | {cost, freeFrom, enabled} |
| GET | /shipping/quote | Public | ?city=&subtotal= |

---

## Tax

| Method | Path | Auth | Query/Body |
|---|---|---|---|
| GET | /tax/classes | JWT | — |
| POST | /tax/classes | JWT | {name, slug} |
| GET | /tax/rates | JWT | — |
| POST | /tax/rates | JWT | {name, rate, taxClassId, isDefault} |
| PATCH | /tax/rates/:id | JWT | — |
| DELETE | /tax/rates/:id | JWT | — |
| GET | /tax/breakdown | Public | ?subtotal= |

---

## Customers

| Method | Path | Auth | Query/Body |
|---|---|---|---|
| GET | /customers | JWT | ?search=&page= |
| GET | /customers/:id | JWT | — |
| POST | /customers | JWT | {email, firstName, lastName, docNumber, ...} |
| PATCH | /customers/:id | JWT | Partial update |
| DELETE | /customers/:id | JWT | Soft delete |
| GET | /customers/:id/addresses | JWT | — |
| POST | /customers/:id/addresses | JWT | {type, address1, city, ...} |
| DELETE | /customers/:id/addresses/:addrId | JWT | — |
| GET | /customers/:id/meta | JWT | — |
| POST | /customers/:id/meta | JWT | {key, value} |

---

## Users (staff)

| Method | Path | Auth | Query/Body |
|---|---|---|---|
| GET | /users | JWT (admin) | — |
| POST | /users | JWT (admin) | {email, name, password, role} |
| PATCH | /users/:id | JWT (admin) | {name, role, active} |
| DELETE | /users/:id | JWT (admin) | Soft delete |
| GET | /users/:id/meta | JWT | — |
| POST | /users/:id/meta | JWT | {key, value} |

---

## Reviews

| Method | Path | Auth | Query/Body |
|---|---|---|---|
| GET | /reviews | Public | ?productId=&status=approved |
| GET | /reviews/all | JWT | ?status=&page= |
| POST | /reviews | Public | {productId, author, email, rating, title, body} |
| PATCH | /reviews/:id | JWT | {status: approved/rejected} |
| DELETE | /reviews/:id | JWT | — |

---

## Media

| Method | Path | Auth | Query/Body |
|---|---|---|---|
| GET | /media | JWT | ?page= |
| POST | /media/register | JWT | {url, filename, mime, size, alt} |
| POST | /media/upload | JWT | multipart/form-data |
| GET | /media/file/:name | Public | Serve file |
| DELETE | /media/:id | JWT | — |

---

## CMS Pages (usa posts con type=cms_page)

| Method | Path | Auth | Query/Body |
|---|---|---|---|
| GET | /cms/pages | JWT | — |
| GET | /cms/pages/by-slug/:slug | JWT/Public | — |
| POST | /cms/pages | JWT | {title, slug, blocks, seo, published} |
| PATCH | /cms/pages/:id | JWT | Partial update |
| DELETE | /cms/pages/:id | JWT | — |
| GET | /cms/blocks | JWT | Block types catalog |

---

## Email

| Method | Path | Auth | Query/Body |
|---|---|---|---|
| GET | /mailer/templates | JWT | — |
| POST | /mailer/templates | JWT | {key, name, subject, bodyHtml} |
| PATCH | /mailer/templates/:id | JWT | — |
| DELETE | /mailer/templates/:id | JWT | — |
| GET | /mailer/queue | JWT | ?status= |
| POST | /mailer/queue/:id/retry | JWT | — |
| POST | /mailer/process | JWT | Process queue |
| GET | /mailer/log | JWT | — |
| GET | /mailer/config | JWT | — |
| PUT | /mailer/config | JWT | {provider, fromName, fromEmail, ...} |
| POST | /mailer/test | JWT | {to} |

---

## WhatsApp

| Method | Path | Auth | Query/Body |
|---|---|---|---|
| GET | /whatsapp/templates | JWT | — |
| POST | /whatsapp/templates | JWT | {name, category, content} |
| PATCH | /whatsapp/templates/:id | JWT | — |
| DELETE | /whatsapp/templates/:id | JWT | — |
| GET | /whatsapp/workflows | JWT | — |
| POST | /whatsapp/workflows | JWT | {name, trigger, templateName} |
| PATCH | /whatsapp/workflows/:id | JWT | — |
| DELETE | /whatsapp/workflows/:id | JWT | — |
| GET | /whatsapp/log | JWT | — |
| POST | /whatsapp/test | JWT | {toPhone} |

---

## ERP Integration (VTEX-style, API key auth)

### Catalog
| Method | Path | Scope | Body |
|---|---|---|---|
| POST | /erp/v1/products | catalog | {sourceId, sku, title, priceNormal, priceWeb, ...} |
| POST | /erp/v1/products/bulk | catalog | {products: [...max 500]} |
| DELETE | /erp/v1/products/:sourceId | catalog | Soft delete |
| GET | /erp/v1/products | catalog | ?page=&perPage=&updatedSince= |
| POST | /erp/v1/categories | catalog | {sourceId, name, parentId, ...} |
| GET | /erp/v1/categories | catalog | — |
| POST | /erp/v1/brands | catalog | {sourceId, name, ...} |
| POST | /erp/v1/specifications | catalog | {productSourceId, specs: [...], replaceAll} |

### Inventory
| Method | Path | Scope | Body |
|---|---|---|---|
| POST | /erp/v1/inventory | inventory | {items: [{sku, branchCode, stock}]} |
| POST | /erp/v1/inventory/batch | inventory | {branchCode, items: [...max 5000]} |
| GET | /erp/v1/inventory | inventory | ?sku=&branchCode= |

### Orders
| Method | Path | Scope | Query/Body |
|---|---|---|---|
| GET | /erp/v1/orders | orders | ?status=&createdSince=&page= |
| GET | /erp/v1/orders/:id | orders | — |
| PATCH | /erp/v1/orders/:id/status | orders | {status, note} |
| POST | /erp/v1/orders/:id/tracking | orders | {carrier, trackingNumber, trackingUrl} |
| POST | /erp/v1/orders/:id/invoice | orders | {invoiceNumber, invoiceDate, ...} |

### Pricing
| Method | Path | Scope | Body |
|---|---|---|---|
| POST | /erp/v1/prices | pricing | {sku, priceNormal, priceWeb} |
| POST | /erp/v1/prices/bulk | pricing | {prices: [...max 2000]} |

### Customers
| Method | Path | Scope | Body |
|---|---|---|---|
| POST | /erp/v1/customers | customers | {sourceId, email, firstName, ...} |
| GET | /erp/v1/customers | customers | ?search=&page= |

### Webhooks
| Method | Path | Scope | Body |
|---|---|---|---|
| POST | /erp/v1/webhooks | webhooks | {url, events} |
| GET | /erp/v1/webhooks | webhooks | — |
| DELETE | /erp/v1/webhooks/:id | webhooks | — |

### Sync
| Method | Path | Scope | Query |
|---|---|---|---|
| POST | /erp/v1/import | catalog | {entity, maxRecords} |
| GET | /erp/v1/sync/runs | catalog | ?kind=&status= |
| GET | /erp/v1/sync/status/:runId | catalog | — |

---

## Modules & Plugins

| Method | Path | Auth | Query/Body |
|---|---|---|---|
| GET | /modules | JWT | List all modules |
| PATCH | /modules/:key | JWT | {enabled} toggle |
| GET | /modules/:key/status | JWT | — |
| GET | /plugins/:key | JWT | Plugin config (sensitive masked) |
| PUT | /plugins/:key | JWT | {enabled, values} |

---

## Stats

| Method | Path | Auth | Query |
|---|---|---|---|
| GET | /stats/overview | JWT | Dashboard KPIs |
| GET | /stats/reports | JWT | ?from=&to= Sales reports |

---

## Health

| Method | Path | Auth |
|---|---|---|
| GET | /health | None |
| GET | /health/db | None |

---

## Resumen: ~120 endpoints

| Dominio | Endpoints | Auth |
|---|---|---|
| Auth | 8 | Mixed |
| ERP Auth | 3 | JWT |
| Posts + meta | 11 | JWT |
| Terms + meta | 11 | JWT |
| Options | 4 | JWT |
| Products + images + variations + specs | 15 | JWT/Public |
| Branches + Inventory | 13 | JWT/Public |
| Orders + items + tracking + notes + meta | 13 | JWT/Public |
| Payments + gateways + Bancard | 17 | JWT/None |
| Coupons + usages | 7 | JWT/Public |
| Shipping zones + methods | 11 | JWT/Public |
| Tax classes + rates | 7 | JWT/Public |
| Customers + addresses + meta | 10 | JWT |
| Users + meta | 5 | JWT (admin) |
| Reviews | 5 | JWT/Public |
| Media | 5 | JWT/Public |
| CMS Pages | 6 | JWT/Public |
| Email | 11 | JWT |
| WhatsApp | 10 | JWT |
| ERP v1 (catalog+inventory+orders+pricing+customers+webhooks+sync) | 22 | API Key |
| Modules + Plugins | 5 | JWT |
| Stats | 2 | JWT |
| Health | 2 | None |
| **TOTAL** | **~189** | |

---

## Patrones de diseño

### Metadata API pattern
Todas las entidades principales tienen endpoints `/meta`:
```
GET    /posts/:id/meta           → lista todos los meta
POST   /posts/:id/meta           → agrega un meta
PUT    /posts/:id/meta/:key      → upsert por key
DELETE /posts/:id/meta/:key      → elimina por key
```

### Soft delete pattern
```
DELETE /products/:id → SET deleted_at = now()
GET /products → WHERE deleted_at IS NULL
```

### Tenant scoping
Todas las queries incluyen `WHERE tenant_id = tid(req)`.
El middleware de tenant extrae el tenant del header `x-tenant` o del JWT.

### Sensitive fields
```
GET /payment-gateways/:id/meta → is_sensitive=true → "••••••••"
PUT /payment-gateways/:id/meta/:key → {value, isSensitive}
```

### Rate limiting
- Admin API: 200 req/min global
- Bancard create: 5 req/min per IP
- ERP API: configurable per key (default 1000/min)

### Pagination
```
GET /products?page=1&perPage=50
→ { data: [...], page: 1, perPage: 50, total: 1234, totalPages: 25 }
```
