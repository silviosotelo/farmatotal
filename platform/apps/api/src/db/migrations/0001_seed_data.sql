-- Fixed seed data using actual role IDs from DB

-- 1. Admin user
INSERT INTO public.users (id, email, password_hash, first_name, last_name, display_name, status) VALUES
('00000000-0000-4000-b000-000000000001', 'admin@farmatotal.com', '$argon2id$v=19$m=65536,t=3,p=4$dGVzdA', 'Admin', 'Sistema', 'Admin Sistema', 'active')
ON CONFLICT (email) DO NOTHING;

-- 2. Role permissions (use actual role IDs from the DB)
-- super-admin (8539321d)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '8539321d-2d7c-41cb-b1ce-1f86408d1d36'::uuid, id FROM public.permissions
ON CONFLICT DO NOTHING;

-- tenant-admin (88ed3f48)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '88ed3f48-f1bc-40a3-9518-be824b646f43'::uuid, id
FROM public.permissions WHERE name != 'tenant.manage'
ON CONFLICT DO NOTHING;

-- manager (cc850f0b)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'cc850f0b-28e4-4d4f-bbd1-20c87d95ae3a'::uuid, id
FROM public.permissions
WHERE module IN ('catalog', 'cms', 'media', 'reviews')
AND action IN ('read', 'write', 'publish', 'moderate')
ON CONFLICT DO NOTHING;

-- staff (1eb37242) — solo read
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '1eb37242-9081-43bf-a1b4-f65598cde983'::uuid, id
FROM public.permissions WHERE action = 'read'
ON CONFLICT DO NOTHING;

-- 3. Tenant membership: admin user → default tenant con tenant-admin role
INSERT INTO public.tenant_memberships (user_id, tenant_id, role_id) VALUES
('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000001', '88ed3f48-f1bc-40a3-9518-be824b646f43')
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- 4. Options (use raw SQL to handle the lack of unique constraint)
INSERT INTO app.options (tenant_id, name, value) VALUES
('00000000-0000-4000-a000-000000000001', 'store_config', '{"brandName":"Farmatotal Demo","currency":"PYG","locale":"es-PY","theme":"default"}')
ON CONFLICT (tenant_id, name) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

INSERT INTO app.options (tenant_id, name, value) VALUES
('00000000-0000-4000-a000-000000000001', 'header_config', '{"topNav":[],"categories":[]}')
ON CONFLICT (tenant_id, name) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

INSERT INTO app.options (tenant_id, name, value) VALUES
('00000000-0000-4000-a000-000000000001', 'footer_config', '{"columns":[],"copyright":"2026 Farmatotal"}')
ON CONFLICT (tenant_id, name) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

INSERT INTO app.options (tenant_id, name, value) VALUES
('00000000-0000-4000-a000-000000000001', 'mod_shipping', '{"zones":[],"methods":[]}')
ON CONFLICT (tenant_id, name) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

INSERT INTO app.options (tenant_id, name, value) VALUES
('00000000-0000-4000-a000-000000000001', 'mod_tax', '{"pricesIncludeTax":false,"rates":[]}')
ON CONFLICT (tenant_id, name) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- 5. CMS pages
INSERT INTO app.posts (tenant_id, post_type, title, slug, content, status, menu_order) VALUES
('00000000-0000-4000-a000-000000000001', 'page', 'Home', 'home', '', 'publish', 0),
('00000000-0000-4000-a000-000000000001', 'page', 'Contacto', 'contacto', '', 'draft', 1),
('00000000-0000-4000-a000-000000000001', 'page', 'Sucursales', 'sucursales', '', 'draft', 2),
('00000000-0000-4000-a000-000000000001', 'slide', 'Slide 1', 'slide-1', '{"title":"Bienvenidos","subtitle":"Tu tienda online"}', 'publish', 0),
('00000000-0000-4000-a000-000000000001', 'slide', 'Slide 2', 'slide-2', '{"title":"Ofertas","subtitle":"Descubri nuestras ofertas"}', 'publish', 1),
('00000000-0000-4000-a000-000000000001', 'cms_block', 'Checkout', 'checkout', '{"blocks":[]}', 'publish', 0),
('00000000-0000-4000-a000-000000000001', 'cms_block', 'Carrito', 'carrito', '{"blocks":[]}', 'publish', 0)
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- 6. Email templates
INSERT INTO app.email_templates (tenant_id, type, subject, body_html, body_text, status) VALUES
('00000000-0000-4000-a000-000000000001', 'order_created', 'Pedido recibido', '<h1>Gracias por tu pedido</h1><p>Tu pedido {{order.number}} ha sido recibido.</p>', 'Gracias por tu pedido {{order.number}}', 'active'),
('00000000-0000-4000-a000-000000000001', 'order_paid', 'Pago confirmado', '<h1>Pago confirmado</h1><p>Tu pago por {{order.total}} ha sido recibido.</p>', 'Tu pago por {{order.total}} ha sido recibido', 'active'),
('00000000-0000-4000-a000-000000000001', 'order_shipped', 'Pedido enviado', '<h1>Tu pedido fue enviado</h1><p>Tu pedido {{order.number}} fue despachado.</p>', 'Tu pedido {{order.number}} fue despachado', 'active'),
('00000000-0000-4000-a000-000000000001', 'welcome', 'Bienvenido', '<h1>Bienvenido a Farmatotal</h1><p>Gracias por registrarte.</p>', 'Bienvenido a Farmatotal', 'active')
ON CONFLICT (tenant_id, type) DO NOTHING;

-- 7. Branch default
INSERT INTO app.branches (id, tenant_id, name, code, slug, address, city, phone, is_pickup, is_primary, status) VALUES
('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-a000-000000000001', 'Casa Central', 'CC-001', 'casa-central', 'Battilana 1278 c/ Ana Diaz', 'Asuncion', '021 200 800', true, true, 'active')
ON CONFLICT (tenant_id, code) DO NOTHING;
