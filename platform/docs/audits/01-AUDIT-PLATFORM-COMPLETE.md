# Auditoría Completa de la Plataforma FARMATOTAL

**Fecha:** 26 de junio de 2026

## Estado Actual

| Componente | Archivos | Estado |
|---|---|---|
| DB Schema | 32 tablas, 20 schema files | ✅ Funcional |
| API (Fastify) | 30+ módulos | ✅ Funcional |
| Admin (Vite+React) | 25 módulos, 156 componentes | ✅ Completo |
| Store (Next.js) | 22 rutas, 30+ API proxies | ✅ Funcional |
| Plugins | 11 plugins | ✅ Todos implementados |

## Resumen Ejecutivo

La plataforma está **funcional y operativa**. Es un monorepo pnpm + Turborepo con 3 apps (api, store, admin) y 3 packages (ui, engine, shared-types).

### Lo que funciona correctamente
- E-commerce completo: Browse → Cart → Checkout → Bancard payment → Return/Polling → Order confirmation
- Auth: Login, register, logout, JWT session management
- Catálogo: Productos, categorías, atributos, variantes
- Inventario: Stock por sucursal, import/export CSV
- Sucursales: CRUD con erpCode, pickup/delivery
- Ventas: Pedidos, clientes, pagos, envío, impuestos, cupones, reseñas, reportes
- CMS Builder visual (ChaiBuilder) con 20+ bloques
- Slides/Banners
- Media Manager
- 11 plugins todos configurables
- Pagos Bancard vPOS completos (single_buy, charge, rollback, webhooks)
- Multi-tenant por header x-tenant
- 4 themes: base, ekomart, anvogue, grostore

### Issues conocidos pendientes
- DB: `customers`, `slides`, `media`, `email_templates`, `wa_templates` sin `tenant_id`
- DB: `stock_movements` usa `varchar(128)` en vez de `uuid` para `product_id`/`branch_id`
- DB: `payments` sin FK a orders
- DB: `orders` sin columnas de tracking
- API: Sin `DELETE` para brands, customers, coupons
- API: Sin CRUD para product_images
- ErpSync: Solo importa products+categories (sin push del ERP)
- Store: Dead code (lib/auth.ts, lib/db.ts, lib/sync/, etc.)
