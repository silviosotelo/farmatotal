# Panel de administración Farmatotal — Plan de arquitectura

> 📐 Documento raíz: [`PLATFORM-VISION.md`](./PLATFORM-VISION.md). Este cubre el **pilar Admin**. El motor de sync mapeable vive en [`SYNC-ENGINE.md`](./SYNC-ENGINE.md) y el editor de páginas en [`PAGE-BUILDER.md`](./PAGE-BUILDER.md).
>
> Complemento de [`BACKEND-PLAN.md`](./BACKEND-PLAN.md). Cubre el **admin** del e-commerce: ver, gestionar, crear, editar, eliminar — pedidos, clientes, catálogo, sucursales, contenido del sitio, configuración, SEO, envíos, pagos, etc.
> Reemplaza el rol que hoy cumple **wp-admin / WooCommerce admin**.

---

## 1. Arquitectura

- **Misma app Next.js**, segmento protegido **`/admin`**. Comparte Prisma, modelos, tipos y deploy con el storefront. Nada de app separada ni framework de admin externo.
- **UI**: **custom** con **shadcn/ui** (Radix + Tailwind, mismo Tailwind v4 del front) + **TanStack Table** para grillas (orden, filtros, paginación server-side) + **Recharts** para analytics (fase 2).
  - *Por qué custom y no AdminJS/Refine*: AdminJS da CRUD genérico que choca con el estándar de pulido del proyecto; Refine agrega una capa de abstracción que estorba en cada pantalla a medida (y las pantallas que importan —pedidos, overrides— son a medida). Custom no cuesta mucho más y mantiene la coherencia visual.

### Seguridad de sesión (escribir bien desde el inicio)
- Admin y storefront **no comparten cookie**: nombres de cookie distintos (`ft_session` vs `ft_admin_session`) y chequeo de `role` en el middleware de `/admin`.
- Roles mínimos por ahora: **`admin`** y **`staff`** (no modelar permisos finos hasta que se pidan).
- `middleware.ts` protege `/admin/*` y `/api/admin/*`; 403 si no hay rol.

```prisma
model User {
  // ...campos del BACKEND-PLAN...
  role  Role  @default(CUSTOMER)
}
enum Role { CUSTOMER STAFF ADMIN }
```

---

## 2. El problema central: ERP-vs-editable

El catálogo lo manda el **ERP** (sync). Pero el admin tiene que poder **sobreescribir** datos web y **crear productos solo-web**. Sin esto, el sync pisaría cada edición. Diseño:

- El **sync escribe SOLO columnas de origen ERP** (`title`, `priceNormal`, `priceWeb`, `stock`, `controlled`, etc.).
- **Campos override** (nullable) que el sync **nunca toca**; el override gana cuando está seteado:
  - `titleOverride`, `descriptionOverride`, `slugOverride`
  - `seoTitle`, `seoDescription`
  - `images[]` (galería curada por admin)
  - `featured`, `published` (visibilidad web independiente del ERP)
- Flag **`erpSourced: boolean`** — si es `false`, es un producto **solo-web** creado en el admin y el sync lo **ignora** (no lo borra ni lo pisa).
- **UX del editor**: cada campo muestra un indicador *"sincronizado del ERP"* vs *"override web"*, con botón **"Restaurar valor del ERP"** (limpia el override). Este detalle es el carácter de todo el admin.

```prisma
model Product {
  // --- origen ERP (sync escribe) ---
  sku         String  @unique
  title       String
  priceNormal Int
  priceWeb    Int
  stock       Int     @default(0)   // suma de Inventory
  // --- overrides web (sync NO toca) ---
  titleOverride       String?
  descriptionOverride String? @db.Text
  slugOverride        String?
  seoTitle            String?
  seoDescription      String?
  featured            Boolean @default(false)
  published           Boolean @default(true)
  erpSourced          Boolean @default(true)   // false = producto solo-web
}
```

> El storefront siempre lee el **valor efectivo**: `displayTitle = titleOverride ?? title`. Helper único en `lib/product.ts`.

La misma lógica aplica, en menor medida, a **categorías** (nombre/SEO/orden override) y **sucursales** (datos no provistos por el ERP: geo, horarios, foto).

---

## 3. Módulos del admin

### v1 — MVP (lo que se construye primero)

| Módulo | Capacidades | Notas de datos |
|---|---|---|
| **Pedidos** | Listar/filtrar (estado, fecha, sucursal, cliente), ver detalle, cambiar estado, reembolso, imprimir/comprobante, **re-enviar al ERP** | Origen propio (DB). Máquina de estados del `OrderStatus`. |
| **Catálogo (overrides)** | Editor por producto (overrides + SEO + imágenes + featured/published), **crear producto solo-web**, búsqueda/filtros | ERP-vs-editable (§2). Precio/stock read-only si `erpSourced`. |
| **Clientes** | Listar/buscar, ver perfil + direcciones + historial de pedidos, editar datos básicos, desactivar | Origen propio. |
| **Configuración del sitio** | Hero slides, banners promo, categorías destacadas (círculos), datos de contacto/footer | Reemplaza `src/lib/data.ts` por tabla `SiteSetting` (key/JSON). |
| **Cupones** | CRUD (código, %, vigencia, activo) | Tabla `Coupon`. |
| **Reseñas** | Moderar (aprobar/ocultar/eliminar) | Tabla `Review`. |
| **Monitor de sync ERP** | Ver `ErpSyncLog`, estado última corrida, **disparar sync manual** (full/delta/stock) | Reusa patrón del dashboard del sync Node actual. |

### Fase 2 — después del MVP

| Módulo | Capacidades |
|---|---|
| **Analytics** | Ventas por período, ticket promedio, top productos/categorías, conversión, gráficos (Recharts). |
| **Sucursales** | CRUD completo, geo en mapa, horarios, ver inventario por sucursal. |
| **Media library** | Subir/organizar imágenes (storage local → luego S3/Cloud), asignar a productos/banners. |
| **Páginas (CMS)** | Editar contenido de páginas estáticas (privacidad, contacto, etc.) con editor rich-text. |
| **SEO** | Edición masiva de meta por producto/categoría, `sitemap.xml`, `robots.txt`, Open Graph. |
| **Envíos** | Zonas, métodos (retiro en sucursal vs delivery), costos por zona. |
| **Formas de pago** | Habilitar/deshabilitar métodos, configurar credenciales Bancard (entorno, keys), contra-entrega. |

---

## 4. Superficie de API del admin (`/api/admin/*`)

Todas detrás del guard de rol. Reusan TanStack Table → paginación/orden/filtro server-side.

| Ruta | Método | Para |
|---|---|---|
| `/api/admin/orders` | GET | grilla pedidos (`?status&from&to&branch&q&sort&page`) |
| `/api/admin/orders/[id]` | GET/PATCH | detalle / cambiar estado / reembolso |
| `/api/admin/orders/[id]/erp-push` | POST | reenviar pedido al ERP |
| `/api/admin/products` | GET/POST | grilla / crear solo-web |
| `/api/admin/products/[id]` | PATCH/DELETE | overrides, SEO, imágenes / borrar solo-web |
| `/api/admin/products/[id]/reset-field` | POST | restaurar campo al valor ERP |
| `/api/admin/customers` | GET | grilla clientes |
| `/api/admin/customers/[id]` | GET/PATCH | perfil + historial |
| `/api/admin/coupons` | GET/POST/PATCH/DELETE | CRUD cupones |
| `/api/admin/reviews` | GET/PATCH/DELETE | moderación |
| `/api/admin/settings` | GET/PUT | SiteSetting (hero, banners, footer, etc.) |
| `/api/admin/sync` | GET/POST | log de sync / disparar manual |

```prisma
model SiteSetting {
  key       String   @id          // "hero_slides", "promo_banners", "footer", ...
  value     Json
  updatedAt DateTime @updatedAt
}
```

---

## 5. Orden de implementación (encaja con las fases del BACKEND-PLAN)

El admin se construye **en paralelo** a medida que existen los datos:

1. Tras **Fase 1–2** del backend (infra + catálogo): **Monitor de sync** + **Catálogo (overrides)**.
2. Tras **Fase 4** (auth + roles): guard de `/admin`, **Clientes**.
3. Tras **Fase 5** (checkout/pedidos): **Pedidos** (el módulo más usado a diario).
4. Transversal: **Configuración del sitio**, **Cupones**, **Reseñas**.
5. **Fase 2 del admin** (analytics, media, CMS, SEO, envíos, pagos UI) una vez estable el MVP.

---

## 6. Preguntas abiertas

| # | Pregunta | ¿Bloquea? |
|---|---|---|
| A | **Alcance del MVP**: ¿confirmás/reordenás/recortás la lista v1 de §3? | Sí (define qué se construye primero). |
| B | ¿Quiénes usan el admin y necesitan más roles que `admin`/`staff` (ej. solo-pedidos, solo-catálogo)? | No (se empieza con 2 roles). |
| C | Storage de **media**: ¿local en el server, o nube (S3/Cloudflare R2)? | No para MVP (local); sí para fase 2. |
| D | ¿Edición de **precios/stock** desde el admin debe poder pisar al ERP, o el ERP siempre manda? | Parcial (define si stock es read-only). |

---

*Relacionado: [`BACKEND-PLAN.md`](./BACKEND-PLAN.md), `GAP-ANALYSIS.md`, `src/lib/data.ts` (→ `SiteSetting`), `src/types/index.ts`.*
