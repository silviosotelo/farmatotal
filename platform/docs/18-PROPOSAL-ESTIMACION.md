# FARMATOTAL — Propuesta Empresarial de Desarrollo

**Fecha:** 27 de junio de 2026
**Versión:** 1.0

---

## 1. Resumen Ejecutivo

Farmatotal es una plataforma e-commerce enterprise-grade, multi-tenant, que reemplaza WordPress + WooCommerce + Elementor + ERP integrations. Actualmente tiene una base funcional sólida con core completo, admin, storefront y API. El objetivo es llevar la plataforma a producción con un tenant de referencia (1 tenant, 3 sucursales, 40K+ productos).

**Presupuesto máximo del producto:** $4,500 USD
**Tarifa de desarrollo extra:** $10-15 USD/hora

---

## 2. Lo que YA TENEMOS (base establecida)

### 2.1 API Backend (Fastify + Drizzle + PostgreSQL)

| Módulo | Estado | Detalle |
|---|---|---|
| Auth (JWT + roles) | ✅ Completo | Login, register, refresh, RBAC (admin/editor/viewer), bootstrap |
| Catálogo (products) | ✅ Completo | CRUD completo, images, specifications, ERP sourcing |
| Categorías / Brands / Tags | ✅ Completo | Jerárquicas, taxonomía unificada |
| Variantes | ✅ Completo | CRUD + generador cartesiano |
| Inventario | ✅ Completo | Stock por sucursal, import/export CSV, manager grid |
| Sucursales | ✅ Completo | CRUD + erpCode, pickup/delivery, lat/lng |
| Pedidos | ✅ Completo | Checkout, CRUD, status changes, refund, events |
| Clientes | ✅ Completo | CRUD + addresses |
| Pagos (Bancard) | ✅ Completo | single_buy, charge, rollback, cards/new, users-cards, delete-card, webhook confirm |
| Envío | ✅ Completo | Zones, methods, quotes, delivery costs |
| Impuestos | ✅ Completo | Rates, breakdown, config |
| Cupones | ✅ Parcial | CRUD + validation (falta edit/delete en admin) |
| Reseñas | ✅ Completo | CRUD + moderación |
| CMS Builder | ✅ Completo | ChaiBuilder SDK + 20+ bloques + templates + global widgets |
| Slides | ✅ Completo | CRUD |
| Media | ✅ Completo | Upload + grid/list |
| Mailer | ✅ Completo | Templates + queue + logs + config (SendGrid/SMTP) |
| WhatsApp | ✅ Completo | Templates + workflows + logs |
| Plugins | ✅ Completo | 11 plugins config-driven, Ecme Settings UI |
| ERP Sync | ⚠️ Parcial | Import products+categories, push orders (falta push desde ERP) |
| Multi-Inventory | ✅ Completo | 97 config fields, 12 sub-views |
| Reports | ✅ Completo | KPIs, charts, top products |
| Dashboard | ✅ Completo | Stats overview |
| Settings | ✅ Completo | Brand, theme, colors, header/footer |

### 2.2 Storefront (Next.js 16 SSR)

| Módulo | Estado | Detalle |
|---|---|---|
| Homepage | ✅ CMS-driven | ChaiRender + SlidesCarousel block |
| Catálogo | ✅ Funcional | Product grid paginado |
| Product Detail | ✅ Completo | Gallery, specs, tabs (reviews), variants, branch stock |
| Categorías | ✅ Funcional | By slug, grid |
| Carrito | ✅ CMS-driven | CartBlock + localStorage |
| Checkout | ✅ CMS-driven | CheckoutBlock + Bancard split (token/simple) |
| Pago | ✅ Funcional | Bancard iframe + status polling |
| Retorno | ✅ Funcional | Ecme Alert success/fail |
| Mis Tarjetas | ✅ Funcional | List/register/delete via SDK |
| Auth | ✅ Funcional | Login/register via API proxy |
| Wishlist | ✅ Funcional | Hybrid localStorage + backend |
| Búsqueda | ✅ CMS-driven | SearchBlock |
| Mi Cuenta | ✅ CMS-driven | AccountBlock |
| Header/Footer | ✅ Config-driven | Desde admin settings |
| Multi-tema | ✅ Funcional | 4 themes: base, ekomart, anvogue, grostore |
| Feature flags | ✅ Funcional | branches, inventory, variants, units |
| Multi-tenant | ✅ Funcional | x-tenant header, domain-based |

### 2.3 Admin (Vite + React)

| Módulo | Estado | Detalle |
|---|---|---|
| 25 módulos | ✅ Todos implementados | Products, Categories, Attributes, Variants, Orders, Customers, Payments, Shipping, Tax, Coupons, Reviews, Reports, CMS, Slides, Media, Settings, Modules, Users, Mailer, etc. |
| Plugin Config | ✅ Ecme Settings | 11 plugins con UI consistente |
| ChaiBuilder | ✅ Visual builder | 20+ bloques, templates, global widgets, copy/paste, motion effects |

### 2.4 DB Schema

| Capa | Estado | Detalle |
|---|---|---|
| Schema actual (32 tablas) | ⚠️ Funcional pero inconsistente | Mix de uuid/varchar, 6 tablas sin tenant_id |
| Nuevo schema propuesto (60 tablas) | 📋 Diseñado | WP+WooCommerce pattern, DML completo |

---

## 3. Lo que NECESITAMOS construir/madurar

### 3.1 DB Schema Refactor
| Tarea | Prioridad | Horas est. |
|---|---|---|
| Migrar a nuevo schema (60 tablas WP+WooCommerce) | Crítica | 120h |
| Posts + postmeta (entidad universal) | Crítica | 40h |
| Terms unificado (categories, brands, tags) | Crítica | 20h |
| Options (reemplaza settings) | Alta | 8h |
| Order items + taxes + tracking + refunds | Alta | 24h |
| Payment gateways + gateway_meta | Alta | 12h |
| Shipping zones + methods | Media | 8h |
| Tax classes + rates | Media | 8h |
| User meta + customer meta + addresses | Media | 12h |
| Migration scripts + data migration | Crítica | 32h |

### 3.2 Core Commerce Logic (Blueprint)
| Tarea | Prioridad | Horas est. |
|---|---|---|
| Money value object (BigInt) | Alta | 4h |
| Pricing engine (server-authoritative) | Crítica | 24h |
| Transactional outbox | Crítica | 16h |
| Event bus + domain events | Alta | 12h |
| Cart with optimistic locking | Alta | 16h |
| Checkout orchestration (16 steps) | Crítica | 40h |
| Inventory reservations (reserve/consume/release) | Crítica | 24h |
| 3-track status (order/payment/fulfillment) | Alta | 16h |
| Refund system (line-level) | Media | 12h |
| Order notes + tracking | Media | 8h |

### 3.3 Bancard Integration (completar)
| Tarea | Prioridad | Horas est. |
|---|---|---|
| Recurring payments (subscription billing) | Media | 24h |
| QR payment generation | Baja | 12h |
| Rate limiting per-key | Media | 4h |
| Card management flow refinements | Media | 8h |

### 3.4 ERP Sync (completar)
| Tarea | Prioridad | Horas est. |
|---|---|---|
| VTEX-style API (push from ERP) | Crítica | 80h |
| ERP API keys + auth | Crítica | 16h |
| Products push (upsert/bulk/delete) | Alta | 24h |
| Categories push | Alta | 8h |
| Inventory push + batch | Crítica | 24h |
| Orders pull + status sync | Crítica | 24h |
| Pricing push | Alta | 12h |
| Customers push | Media | 8h |
| Webhooks (register/dispatch/retry) | Alta | 24h |
| Stock reservation sync | Media | 12h |

### 3.5 Admin UI (completar)
| Tarea | Prioridad | Horas est. |
|---|---|---|
| Coupons: edit/delete UI | Media | 8h |
| Product images: admin CRUD | Alta | 12h |
| Brand: GET/PUT/DELETE endpoints + UI | Media | 8h |
| Customer: delete endpoint + UI | Baja | 4h |
| Dead code cleanup (12 archivos store) | Baja | 4h |
| Mis-tarjetas: Ecme layout refactor | Baja | 4h |

### 3.6 Storefront (completar)
| Tarea | Prioridad | Horas est. |
|---|---|---|
| Order detail page (/pedidos/[id]) | Alta | 8h |
| Error boundaries para CMS blocks | Media | 8h |
| Loading states para CMS pages | Media | 4h |
- Product reviews submission UI | Media | 8h |
| Email verification flow | Baja | 4h |

### 3.7 Security
| Tarea | Prioridad | Horas est. |
|---|---|---|
| Fix sync_runs tenant filter | Crítica | 2h |
| Fix payment_gateway_meta sensitive | Alta | 2h |
| Rate limiting global | Media | 8h |

### 3.8 Testing
| Tarea | Prioridad | Horas est. |
|---|---|---|
| Checkout unit tests | Crítica | 16h |
| Payments unit tests | Crítica | 12h |
| Inventory concurrency tests | Crítica | 12h |
| ERP sync integration tests | Alta | 16h |
| API integration tests | Alta | 20h |
| Store E2E tests | Media | 20h |

### 3.9 Performance
| Tarea | Prioridad | Horas est. |
|---|---|---|
| Caching layer (Redis) | Alta | 16h |
| Query optimization + indexes | Alta | 8h |
| Lazy loading (admin + store) | Media | 8h |
| Bundle optimization | Media | 8h |

---

## 4. Estimación de Horas por Fase

| Fase | Descripción | Horas | Precio @ $12.50/h |
|---|---|---|---|
| **Fase 1** | DB Schema refactor + migration | 200h | $2,500 |
| **Fase 2** | Core commerce logic (pricing, checkout, inventory, outbox) | 180h | $2,250 |
| **Fase 3** | ERP Sync (VTEX-style API) | 200h | $2,500 |
| **Fase 4** | Bancard refinements + payments hardening | 48h | $600 |
| **Fase 5** | Admin UI completions + store completions | 52h | $650 |
| **Fase 6** | Security hardening + testing | 70h | $875 |
| **Fase 7** | Performance optimization | 40h | $500 |
| **TOTAL** | | **790h** | **$9,875** |

### Presupuesto máximo: $4,500 USD

Con $4,500 a $12.50/h = **360 horas disponibles**

**Priorización para $4,500:**

| Prioridad | Fase | Horas | Precio | Acumulado |
|---|---|---|---|---|
| 🔴 Crítica | Fase 1: DB Schema refactor | 200h | $2,500 | $2,500 |
| 🔴 Crítica | Fase 2: Core commerce (parte 1) | 100h | $1,250 | $3,750 |
| 🔴 Crítica | Security fixes urgentes | 4h | $50 | $3,800 |
| 🟡 Alta | Fase 2: Core commerce (parte 2) | 56h | $700 | **$4,500** |

**Lo que entra en $4,500:**
- ✅ DB Schema completo (60 tablas)
- ✅ Migración de datos
- ✅ Core: Money, Pricing Engine, Cart, Checkout (16 steps), Inventory Reservations
- ✅ Security fixes urgentes
- ✅ 3-track status model
- ✅ Transactional outbox
- ✅ Core domain events

**Lo que queda para tarifa extra ($10-15/h):**
- ERP Sync completo: ~200h = $2,000-3,000
- Bancard refinements: ~48h = $480-720
- Admin/Store completions: ~52h = $520-780
- Testing: ~70h = $700-1,050
- Performance: ~40h = $400-600

**Total para completar todo: $4,500 + $3,800-5,150 = $8,300-9,650**

---

## 5. Roadmap Completo

### Roadmap Visual

```
MES 1 (Semanas 1-4)                     MES 2 (Semanas 5-8)
┌─────────────────────────┐             ┌─────────────────────────┐
│ FASE 1: DB Schema       │             │ FASE 3: ERP Sync        │
│ ████████████████ 200h   │             │ ██████████████████ 200h │
│ - 60 tablas             │             │ - VTEX-style API        │
│ - Migración datos       │             │ - Products push         │
│ - WP+WooCommerce pattern│             │ - Inventory batch       │
├─────────────────────────┤             │ - Orders pull           │
│ FASE 2: Core Commerce   │             │ - Webhooks + retry      │
│ ████████████████ 180h   │             │ - Pricing push          │
│ - Money (BigInt)        │             │ - Customers push        │
│ - Pricing Engine        │             ├─────────────────────────┤
│ - Cart + Optimistic     │             │ FASE 5: Admin/Store     │
│ - Checkout (16 steps)   │             │ ████████ 52h            │
│ - Inventory Reserve     │             │ - Coupons edit/delete   │
│ - 3-track Status        │             │ - Product images CRUD   │
│ - Outbox + Events       │             │ - Order detail page     │
│ - Refunds               │             │ - Reviews submit UI     │
└─────────────────────────┘             └─────────────────────────┘
                                        
MES 3 (Semanas 9-12)                    MES 4 (Semanas 13-16)
┌─────────────────────────┐             ┌─────────────────────────┐
│ FASE 4: Bancard         │             │ FASE 6: Security+Test   │
│ ████████ 48h            │             │ ████████████████ 70h    │
│ - Recurring payments    │             │ - Tenant filter fix     │
│ - QR generation         │             │ - Rate limiting         │
│ - Rate limiting/key    │             │ - Checkout tests        │
│ - Card management       │             │ - Payment tests         │
├─────────────────────────┤             │ - Inventory tests       │
│ FASE 5: Admin/Store     │             │ - ERP integration tests │
│ ████████ 52h            │             │ - API tests             │
│ - Dead code cleanup     │             │ - Store E2E tests       │
│ - Mis-tarjetas Ecme    │             ├─────────────────────────┤
│ - Error boundaries      │             │ FASE 7: Performance     │
│ - Loading states        │             │ ████████ 40h            │
│ - Reviews submit        │             │ - Redis caching         │
└─────────────────────────┘             │ - Query optimization    │
                                        │ - Lazy loading          │
                                        │ - Bundle optimization   │
                                        └─────────────────────────┘
```

### Entregables por semana

| Semana | Entregable | Horas |
|---|---|---|
| 1-2 | DB Schema DML + migrations + data migration scripts | 40h |
| 3-4 | Posts+postmeta CRUD, Terms CRUD, Options CRUD | 40h |
| 5-6 | Money, Pricing Engine, Event Bus, Outbox | 40h |
| 7-8 | Cart (optimistic locking), Checkout (16 steps), Inventory Reserve | 60h |
| 9-10 | 3-track status, Refunds, Order notes, Testing core | 40h |
| 11-12 | ERP API keys, Products push, Categories push, Inventory batch | 40h |
| 13-14 | Orders pull, Pricing push, Customers push, Webhooks | 40h |
| 15-16 | Security fixes, Admin completions, Performance | 40h |
| **TOTAL** | | **360h = $4,500** |

---

## 6. Lo que TENEMOS vs Lo que FALTA

### Lo que tenemos (54% madurez técnica)

```
✅ API con 30+ módulos funcionales
✅ Admin con 25 módulos completos
✅ Storefront con 22 rutas
✅ Bancard vPOS con 8 endpoints
✅ CMS Builder con 20+ bloques
✅ 4 themes config-driven
✅ Multi-tenant por header
✅ 11 plugins configurables
✅ DB con 32 tablas (funcional pero inconsistente)
```

### Lo que falta (46% restante)

```
❌ DB refactor a pattern WP+WooCommerce (60 tablas)
❌ Core commerce logic (pricing engine, checkout orchestration)
❌ Transactional outbox (events + webhooks)
❌ Inventory reservations (no oversell)
❌ 3-track status model
❌ ERP sync bidireccional
❌ Refund system line-level
❌ Testing (unit/integration/concurrency)
❌ Performance optimization (caching, indexes)
❌ Security hardening
```

---

## 7. Equipo Necesario

### Para $4,500 (Fase 1-2 + Security)

| Rol | Personas | Horas/semana | Duración |
|---|---|---|---|
| Senior Full-Stack (arquitecto) | 1 | 40h | 5 semanas |
| **Total** | **1 persona** | **40h/sem** | **5 semanas** |

### Para el roadmap completo ($8,300-9,650)

| Rol | Personas | Horas/semana | Duración |
|---|---|---|---|
| Senior Full-Stack (arquitecto) | 1 | 40h | 10 semanas |
| **Total** | **1 persona** | **40h/sem** | **10 semanas** |

---

## 8. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| DB migration rompe datos existentes | Media | Crítico | Migración en fases, backup antes de cada paso |
| Checkout falla en producción | Baja | Crítico | Tests de concurrencia + staging completo |
| ERP sync causa duplicados | Media | Alto | Idempotency keys + upsert por sourceId |
| Performance degrada con 40K productos | Media | Alto | Pagination + caching + indexes |
| Bancard rechaza pagos en sandbox | Alta | Bajo | Configuración correcta del portal |
| Scope creep (features extras) | Alta | Alto | Roadmap definido, change requests = extra billing |

---

## 9. Términos Comerciales

| Concepto | Precio |
|---|---|
| **Presupuesto máximo del producto** | $4,500 USD |
| **Alcance del producto** | Fase 1-2 + Security (360h) |
| **Desarrollo extra** | $10-15 USD/hora |
| **Roadmap completo** | $8,300-9,650 USD (producto + extra) |
| **Forma de pago** | 50% adelantado + 50% contra entregables |
| **Entregables** | Semanales (cada 2 semanas) |
| **Garantía** | 30 días post-entrega para bugs críticos |

---

## 10. Próximos Pasos

1. **Aprobación de la propuesta** — Revisar alcance y presupuesto
2. **Firma de contrato** — Definir hitos y pagos
3. **Kickoff** — Revisión del blueprint con el equipo
4. **Semana 1** — DB Schema refactor (DML + migration scripts)
5. **Entrega semanal** — Cada 2 semanas, demo funcional
