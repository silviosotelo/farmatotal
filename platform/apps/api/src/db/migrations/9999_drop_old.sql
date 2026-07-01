-- =============================================================================
-- Drop old tables before creating V2
-- =============================================================================
-- Eliminar tablas viejas que quedaron del schema anterior (en public y app schemas)
-- Solo tablas que sabemos que existen de la versión anterior

-- Public schema old tables
DROP TABLE IF EXISTS public.wishlist CASCADE;
DROP TABLE IF EXISTS public.slides CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.email_templates CASCADE;
DROP TABLE IF EXISTS public.email_queue CASCADE;
DROP TABLE IF EXISTS public.email_log CASCADE;
DROP TABLE IF EXISTS public.wa_templates CASCADE;
DROP TABLE IF EXISTS public.wa_workflows CASCADE;
DROP TABLE IF EXISTS public.wa_log CASCADE;
DROP TABLE IF EXISTS public.sync_runs CASCADE;
DROP TABLE IF EXISTS public.sync_errors CASCADE;
DROP TABLE IF EXISTS public.erp_field_mappings CASCADE;
DROP TABLE IF EXISTS public.sync_cursors CASCADE;

-- App schema old tables (from old schema that used app.* prefix)
DROP TABLE IF EXISTS app.wishlist CASCADE;
DROP TABLE IF EXISTS app.slides CASCADE;
DROP TABLE IF EXISTS app.settings CASCADE;
DROP TABLE IF EXISTS app.email_templates CASCADE;
DROP TABLE IF EXISTS app.email_queue CASCADE;
DROP TABLE IF EXISTS app.email_log CASCADE;
DROP TABLE IF EXISTS app.wa_templates CASCADE;
DROP TABLE IF EXISTS app.wa_workflows CASCADE;
DROP TABLE IF EXISTS app.wa_log CASCADE;
DROP TABLE IF EXISTS app.sync_runs CASCADE;
DROP TABLE IF EXISTS app.sync_errors CASCADE;
DROP TABLE IF EXISTS app.erp_field_mappings CASCADE;
DROP TABLE IF EXISTS app.sync_cursors CASCADE;
DROP TABLE IF EXISTS app.tenants CASCADE;
DROP TABLE IF EXISTS app.users CASCADE;
DROP TABLE IF EXISTS app.refresh_tokens CASCADE;
DROP TABLE IF EXISTS app.categories CASCADE;
DROP TABLE IF EXISTS app.brands CASCADE;
DROP TABLE IF EXISTS app.products CASCADE;
DROP TABLE IF EXISTS app.product_images CASCADE;
DROP TABLE IF EXISTS app.variants CASCADE;
DROP TABLE IF EXISTS app.branches CASCADE;
DROP TABLE IF EXISTS app.inventory CASCADE;
DROP TABLE IF EXISTS app.stock_movements CASCADE;
DROP TABLE IF EXISTS app.orders CASCADE;
DROP TABLE IF EXISTS app.order_lines CASCADE;
DROP TABLE IF EXISTS app.payments CASCADE;
DROP TABLE IF EXISTS app.coupons CASCADE;
DROP TABLE IF EXISTS app.customers CASCADE;
DROP TABLE IF EXISTS app.pages CASCADE;
DROP TABLE IF EXISTS app.media CASCADE;
DROP TABLE IF EXISTS app.reviews CASCADE;
DROP TABLE IF EXISTS app.currencies CASCADE;
DROP TABLE IF EXISTS app.countries CASCADE;
DROP TABLE IF EXISTS app.posts CASCADE;
DROP TABLE IF EXISTS app.post_meta CASCADE;

-- Public schema old tables that conflict with new V2 schema
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.refresh_tokens CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;
