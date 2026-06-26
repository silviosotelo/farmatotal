# Auditoría de DB Schema — 32 Tablas

**Fecha:** 26 de junio de 2026

## Todas las tablas bajo `app.*`

### Tenants, Users, Auth
| Tabla | Columnas PK | Tenant-scoped | Notes |
|---|---|---|---|
| tenants | id (uuid) | — | Config JSONB |
| users | id (uuid) | — | Roles: admin/editor/viewer/customer |
| refresh_tokens | id (uuid) | — | FK → users |

### Catálogo
| Tabla | PK | Tenant | Unique Indexes | Missing CRUD |
|---|---|---|---|---|
| categories | id | ✅ | (tenant,slug), (tenant,flia_codigo) | — |
| brands | id | ✅ | (tenant,slug), (tenant,name) | GET by ID, PUT, DELETE |
| products | id | ✅ | (tenant,sku), (tenant,slug), (tenant,source_system,source_id) | Bulk ops |
| product_images | id | — | — | **ALL** (sin API) |
| product_variants | id | ❌ via product FK | (sku) | — |
| product_specifications | id | — | (product_id) | **NO EXISTE** (planeado) |

### Inventario
| Tabla | PK | Tenant | Notes |
|---|---|---|---|
| inventory | (product_id, branch_id) | ✅ | Composite PK |
| stock_movements | id | ⚠️ varchar(128) | **Tipos inconsistentes** — tenant_id varchar, product_id/branch_id varchar |

### Ventas
| Tabla | PK | Tenant | Missing |
|---|---|---|---|
| orders | id | ✅ | Sin tracking_number, carrier, tracking_url |
| order_lines | id | ✅ via order FK | — |
| payments | id | ✅ | Sin FK constraint a orders |
| coupons | id | ✅ | — |
| customers | id | ❌ **Sin tenant_id** | Global, no tenant-scoped |

### Contenido
| Tabla | PK | Tenant | Notes |
|---|---|---|---|
| pages (CMS) | id | ✅ | blocks JSONB |
| slides | id | ❌ **Sin tenant_id** | Global |
| media | id | ❌ **Sin tenant_id** | Global |

### Reviews y Wishlist
| Tabla | PK | Tenant |
|---|---|---|
| reviews | id | — (via product FK) |
| wishlist | id | — (via user FK) |

### Email
| Tabla | PK | Tenant | Notes |
|---|---|---|---|
| email_templates | id | ❌ **Sin tenant_id** | Global |
| email_queue | id | — | Audit |
| email_log | id | — | Audit |

### WhatsApp
| Tabla | PK | Tenant |
|---|---|---|
| wa_templates | id | ❌ Global |
| wa_workflows | id | ❌ Global |
| wa_log | id | — Audit |

### ERP Sync
| Tabla | PK | Tenant | Notes |
|---|---|---|---|
| sync_runs | id | — | Audit (sin tenant filter) |
| sync_errors | id | — | FK → sync_runs |
| erp_field_mappings | id | ✅ | UNIQUE(tenant,entity,source_name) |
| sync_cursors | kind | — | **NUNCA USADA** |

### Settings
| Tabla | PK | Notes |
|---|---|---|
| settings | (key, tenant_id) | Composite PK |

## Issues de Schema

1. **`customers`** — No `tenant_id`. Global.
2. **`slides`** — No `tenant_id`. Global.
3. **`media`** — No `tenant_id`. Global.
4. **`email_templates`** — No `tenant_id`. Global.
5. **`wa_templates` / `wa_workflows`** — No `tenant_id`. Global.
6. **`stock_movements`** — `tenant_id` es `varchar(128)` en vez de `uuid`.
7. **`stock_movements`** — `product_id` y `branch_id` son `varchar(64)` en vez de `uuid`.
8. **`payments`** — Sin FK constraint a `orders`.
9. **`product_variants`** — Sin `tenant_id` (depende de product FK).
10. **`sync_cursors`** — Definida pero nunca leída ni escrita.
