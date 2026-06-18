/**
 * Registro de módulos (sistema tipo plugins).
 *
 * - `kind: "native"` → parte del core, siempre presente (no se desinstala).
 *   Algunos nativos son "hosts" donde los plugins se enchufan (ej. Pagos).
 * - `kind: "plugin"` → instalable/activable de forma independiente. Cada plugin
 *   vive en su propia carpeta, con sus rutas, tablas/settings y vistas (con sus
 *   sub-features). Agregar un plugin = una entrada acá + su carpeta.
 *
 * IMPORTANTE: cada integración/pasarela es su PROPIO plugin (NO se juntan).
 */
export type ModuleKind = "native" | "plugin";
export type ModuleCategory =
  | "core"
  | "commerce"
  | "content"
  | "messaging"
  | "marketing"
  | "payment"
  | "logistics"
  | "infra"
  | "builder";

export type ModuleManifest = {
  key: string;
  name: string;
  description: string;
  kind: ModuleKind;
  category: ModuleCategory;
  version: string;
  /** Para pasarelas: se registra dentro del módulo nativo "payments". */
  registersInto?: string;
  /** Setting key donde guarda su config. */
  settingsKey?: string;
  /** Ruta del admin (si tiene vista propia). */
  adminPath?: string;
  /** Sub-features que expone (tabs de su vista). */
  features?: string[];
};

export const MODULES: ModuleManifest[] = [
  // ──────────────── NATIVOS (core) ────────────────
  { key: "catalog", name: "Catálogo", description: "Productos, categorías y marcas.", kind: "native", category: "core", version: "1.0.0", adminPath: "/concepts/products/product-list" },
  { key: "orders", name: "Pedidos", description: "Checkout y gestión de pedidos.", kind: "native", category: "core", version: "1.0.0", adminPath: "/concepts/orders/order-list" },
  { key: "customers", name: "Clientes", description: "Base de clientes.", kind: "native", category: "core", version: "1.0.0", adminPath: "/concepts/customers/customer-list" },
  { key: "users", name: "Usuarios y roles", description: "Usuarios del panel y sus roles/permisos.", kind: "native", category: "core", version: "1.0.0", adminPath: "/concepts/users", features: ["Usuarios", "Roles", "Permisos"] },
  { key: "cms", name: "CMS / Páginas", description: "Páginas, bloques y page builder base.", kind: "native", category: "content", version: "1.0.0", adminPath: "/concepts/cms" },
  { key: "coupons", name: "Cupones", description: "Cupones de descuento.", kind: "native", category: "commerce", version: "1.0.0", adminPath: "/concepts/coupons" },
  { key: "attributes", name: "Atributos globales", description: "Catálogo de atributos reutilizables para variantes (color, talle, etc.).", kind: "native", category: "commerce", version: "1.0.0", settingsKey: "mod_attributes", adminPath: "/concepts/attributes", features: ["Atributos", "Valores"] },
  { key: "reviews", name: "Valoraciones", description: "Reseñas con moderación.", kind: "native", category: "commerce", version: "1.0.0", adminPath: "/concepts/reviews" },
  { key: "mailer", name: "Correos", description: "Plantillas, cola y logs de email.", kind: "native", category: "infra", version: "1.0.0", settingsKey: "mod_mailer", adminPath: "/concepts/mailer" },
  {
    key: "payments", name: "Pagos", description: "Métodos nativos (efectivo, transferencia, custom). Host de pasarelas.",
    kind: "native", category: "payment", version: "1.0.0", settingsKey: "mod_payments", adminPath: "/concepts/payments",
    features: ["Efectivo", "Transferencia", "Métodos custom", "Transacciones"],
  },
  {
    key: "shipping", name: "Envíos", description: "Zonas de envío, tipos y lógica (peso/precio/radio).",
    kind: "native", category: "logistics", version: "1.0.0", settingsKey: "mod_shipping", adminPath: "/concepts/shipping",
    features: ["Zonas", "Tipos de envío", "Lógica/tarifas"],
  },
  {
    key: "tax", name: "Impuestos", description: "Tasas de impuesto (IVA) y modo de precios (incluido/agregado).",
    kind: "native", category: "commerce", version: "1.0.0", settingsKey: "mod_tax", adminPath: "/concepts/tax",
    features: ["Tasas", "IVA incluido", "Desglose"],
  },

  // ──────────────── PLUGINS · Pasarelas (se registran en Pagos) ────────────────
  { key: "gw_bancard", name: "Bancard", description: "Pasarela Bancard: pagos simples, recurrentes y QR.", kind: "plugin", category: "payment", version: "1.0.0", registersInto: "payments", settingsKey: "plugin_bancard", adminPath: "/concepts/plugins/bancard", features: ["Pagos simples", "Recurrentes", "QR"] },
  { key: "gw_personalpay", name: "Personal Pay", description: "Billetera Personal Pay.", kind: "plugin", category: "payment", version: "1.0.0", registersInto: "payments", settingsKey: "plugin_personalpay", adminPath: "/concepts/plugins/personalpay", features: ["Billetera"] },
  { key: "gw_tigomoney", name: "Tigo Money", description: "Billetera Tigo Money.", kind: "plugin", category: "payment", version: "1.0.0", registersInto: "payments", settingsKey: "plugin_tigomoney", adminPath: "/concepts/plugins/tigomoney", features: ["Billetera"] },
  { key: "gw_dinelco", name: "Dinelco", description: "Pasarela Dinelco (simples / recurrentes / QR).", kind: "plugin", category: "payment", version: "1.0.0", registersInto: "payments", settingsKey: "plugin_dinelco", adminPath: "/concepts/plugins/dinelco", features: ["Pagos simples", "Recurrentes", "QR"] },

  // ──────────────── PLUGINS · Mensajería / Marketing / Infra ────────────────
  { key: "wh_whatsapp", name: "WhatsApp", description: "Mensajería WhatsApp.", kind: "plugin", category: "messaging", version: "1.0.0", settingsKey: "plugin_whatsapp", adminPath: "/concepts/plugins/whatsapp", features: ["Configuración", "Plantillas", "Workflows", "Logs"] },
  { key: "mk_meta", name: "Meta", description: "Meta Ads, Catálogo y Conversión (Pixel/CAPI).", kind: "plugin", category: "marketing", version: "1.0.0", settingsKey: "plugin_meta", adminPath: "/concepts/plugins/meta", features: ["Ads", "Catálogo", "Conversión"] },
  { key: "mk_google", name: "Google", description: "Analytics, Ads, Catálogo (Merchant) y reCAPTCHA.", kind: "plugin", category: "marketing", version: "1.0.0", settingsKey: "plugin_google", adminPath: "/concepts/plugins/google", features: ["Analytics", "Ads", "Catálogo", "reCAPTCHA"] },
  { key: "infra_cloudflare", name: "Cloudflare", description: "Storage (R2/S3/bucket) y WAF.", kind: "plugin", category: "infra", version: "1.0.0", settingsKey: "plugin_cloudflare", adminPath: "/concepts/plugins/cloudflare", features: ["Storage", "WAF"] },

  // ──────────────── PLUGINS · Comercio / Builder ────────────────
  { key: "multi_inventory", name: "Multi-sucursal / Inventario", description: "Sucursales configurables, stock por sucursal, costos y radio de envío, import/export.", kind: "plugin", category: "logistics", version: "1.0.0", settingsKey: "plugin_multiinventory", adminPath: "/concepts/branches", features: ["Sucursales", "Stock por sucursal", "Costos/Radio", "Import/Export", "Logs"] },
  { key: "page_builder", name: "Editor visual", description: "Constructor de páginas estilo Elementor (Chai Builder).", kind: "plugin", category: "builder", version: "1.0.0", adminPath: "/concepts/page-builder", features: ["Builder visual", "Bloques", "Tailwind"] },
];
