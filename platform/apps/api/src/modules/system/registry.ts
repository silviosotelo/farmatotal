/**
 * Registro de módulos (sistema tipo plugins, estilo WordPress + WooCommerce).
 *
 * - `kind: "native"` → parte del core, siempre presente (no se desinstala).
 *   Algunos nativos son "hosts" donde los plugins se enchufan (ej. Pagos).
 * - `kind: "plugin"` → instalable/activable de forma independiente. Cada plugin
 *   vive en su propia carpeta, con sus rutas, tablas/settings y vistas (con sus
 *   sub-features). Agregar un plugin = una entrada acá (manifest auto-descriptivo).
 *
 * El manifest es la ÚNICA fuente de verdad de cada módulo: nombre, categoría,
 * config (configSchema), dependencias (dependsOn) y los hooks que dispara/escucha
 * (provides/consumes). El admin y la API leen todo de acá.
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
  | "builder"
  | "search";

/** Campo de configuración genérico de un plugin (lo renderiza PluginConfig.tsx). */
export type ConfigFieldType = "text" | "password" | "select" | "toggle" | "url" | "number";
export type ConfigField = {
  key: string;
  label: string;
  type: ConfigFieldType;
  group: string;
  options?: { value: string; label: string }[];
  placeholder?: string;
  help?: string;
};

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
  /** Schema de config (campos agrupados) que renderiza el admin genérico. */
  configSchema?: ConfigField[];
  /** Otras keys de módulo requeridas para poder activarse. */
  dependsOn?: string[];
  /** Hooks (acciones/filtros) que este módulo dispara. */
  provides?: string[];
  /** Hooks que este módulo escucha (registra handlers). */
  consumes?: string[];
  /** Si el módulo arranca activo cuando no hay estado guardado. */
  enabledByDefault?: boolean;
};

const envOpts = [
  { value: "staging", label: "Staging / Sandbox" },
  { value: "production", label: "Producción" },
];

export const MODULES: ModuleManifest[] = [
  // ──────────────── NATIVOS (core) ────────────────
  { key: "catalog", name: "Catálogo", description: "Productos, categorías y marcas.", kind: "native", category: "core", version: "1.0.0", adminPath: "/concepts/products/product-list", provides: ["catalog.search"] },
  { key: "orders", name: "Pedidos", description: "Checkout y gestión de pedidos.", kind: "native", category: "core", version: "1.0.0", adminPath: "/concepts/orders/order-list", provides: ["order.created", "order.paid", "checkout.totals"] },
  { key: "customers", name: "Clientes", description: "Base de clientes.", kind: "native", category: "core", version: "1.0.0", adminPath: "/concepts/customers/customer-list" },
  { key: "users", name: "Usuarios y roles", description: "Usuarios del panel y sus roles/permisos.", kind: "native", category: "core", version: "1.0.0", adminPath: "/concepts/users", features: ["Usuarios", "Roles", "Permisos"] },
  { key: "cms", name: "CMS / Páginas", description: "Páginas, bloques y page builder base.", kind: "native", category: "content", version: "1.0.0", adminPath: "/concepts/cms" },
  { key: "coupons", name: "Cupones", description: "Cupones de descuento.", kind: "native", category: "commerce", version: "1.0.0", adminPath: "/concepts/coupons" },
  { key: "attributes", name: "Atributos globales", description: "Catálogo de atributos reutilizables para variantes (color, talle, etc.).", kind: "native", category: "commerce", version: "1.0.0", settingsKey: "mod_attributes", adminPath: "/concepts/attributes", features: ["Atributos", "Valores"] },
  { key: "reviews", name: "Valoraciones", description: "Reseñas con moderación.", kind: "native", category: "commerce", version: "1.0.0", adminPath: "/concepts/reviews" },
  { key: "mailer", name: "Correos", description: "Plantillas, cola y logs de email.", kind: "native", category: "infra", version: "1.0.0", settingsKey: "mod_mailer", adminPath: "/concepts/mailer", consumes: ["order.created", "order.paid"] },
  {
    key: "payments", name: "Pagos", description: "Métodos nativos (efectivo, transferencia, custom). Host de pasarelas.",
    kind: "native", category: "payment", version: "1.0.0", settingsKey: "mod_payments", adminPath: "/concepts/payments",
    features: ["Efectivo", "Transferencia", "Métodos custom", "Transacciones"], provides: ["payment.confirmed"],
  },
  {
    key: "shipping", name: "Envíos", description: "Zonas de envío, tipos y lógica (peso/precio/radio).",
    kind: "native", category: "logistics", version: "1.0.0", settingsKey: "mod_shipping", adminPath: "/concepts/shipping",
    features: ["Zonas", "Tipos de envío", "Lógica/tarifas"], consumes: ["checkout.totals"],
  },
  {
    key: "tax", name: "Impuestos", description: "Tasas de impuesto (IVA) y modo de precios (incluido/agregado).",
    kind: "native", category: "commerce", version: "1.0.0", settingsKey: "mod_tax", adminPath: "/concepts/tax",
    features: ["Tasas", "IVA incluido", "Desglose"], consumes: ["checkout.totals"],
  },

  // ──────────────── PLUGINS · Pasarelas (se registran en Pagos) ────────────────
  {
    key: "gw_bancard", name: "Bancard", description: "Pasarela Bancard: pagos simples, recurrentes y QR.", kind: "plugin", category: "payment", version: "1.0.0",
    registersInto: "payments", dependsOn: ["payments"], settingsKey: "plugin_bancard", adminPath: "/concepts/plugins/bancard", features: ["Pagos simples", "Recurrentes", "QR"],
    consumes: ["payment.confirmed"],
    configSchema: [
      { key: "env", label: "Entorno", type: "select", group: "Credenciales", options: envOpts },
      { key: "publicKey", label: "Public Key", type: "password", group: "Credenciales" },
      { key: "privateKey", label: "Private Key", type: "password", group: "Credenciales" },
      { key: "simpleEnabled", label: "Habilitar pagos simples (single buy)", type: "toggle", group: "Pagos simples" },
      { key: "recurringEnabled", label: "Habilitar pagos recurrentes (alias/token)", type: "toggle", group: "Recurrentes" },
      { key: "qrEnabled", label: "Habilitar pago con QR", type: "toggle", group: "QR" },
    ],
  },
  {
    key: "gw_personalpay", name: "Personal Pay", description: "Billetera Personal Pay.", kind: "plugin", category: "payment", version: "1.0.0",
    registersInto: "payments", dependsOn: ["payments"], settingsKey: "plugin_personalpay", adminPath: "/concepts/plugins/personalpay", features: ["Billetera"],
    configSchema: [
      { key: "env", label: "Entorno", type: "select", group: "Credenciales", options: envOpts },
      { key: "merchantId", label: "Comercio ID", type: "text", group: "Credenciales" },
      { key: "apiKey", label: "API Key", type: "password", group: "Credenciales" },
      { key: "walletEnabled", label: "Habilitar pago con billetera", type: "toggle", group: "Billetera" },
    ],
  },
  {
    key: "gw_tigomoney", name: "Tigo Money", description: "Billetera Tigo Money.", kind: "plugin", category: "payment", version: "1.0.0",
    registersInto: "payments", dependsOn: ["payments"], settingsKey: "plugin_tigomoney", adminPath: "/concepts/plugins/tigomoney", features: ["Billetera"],
    configSchema: [
      { key: "env", label: "Entorno", type: "select", group: "Credenciales", options: envOpts },
      { key: "merchantId", label: "Merchant ID", type: "text", group: "Credenciales" },
      { key: "apiKey", label: "API Key", type: "password", group: "Credenciales" },
      { key: "apiSecret", label: "API Secret", type: "password", group: "Credenciales" },
      { key: "walletEnabled", label: "Habilitar pago con billetera", type: "toggle", group: "Billetera" },
    ],
  },
  {
    key: "gw_dinelco", name: "Dinelco", description: "Pasarela Dinelco (simples / recurrentes / QR).", kind: "plugin", category: "payment", version: "1.0.0",
    registersInto: "payments", dependsOn: ["payments"], settingsKey: "plugin_dinelco", adminPath: "/concepts/plugins/dinelco", features: ["Pagos simples", "Recurrentes", "QR"],
    configSchema: [
      // Dinelco/Bepsa opera sobre Cybersource (Visa) en Paraguay.
      { key: "env", label: "Entorno", type: "select", group: "Credenciales", options: envOpts },
      { key: "merchantId", label: "Merchant ID (Cybersource)", type: "text", group: "Credenciales" },
      { key: "apiKeyId", label: "API Key ID", type: "password", group: "Credenciales" },
      { key: "secretKey", label: "Shared Secret Key", type: "password", group: "Credenciales" },
      { key: "simpleEnabled", label: "Habilitar pagos simples", type: "toggle", group: "Pagos simples" },
      { key: "recurringEnabled", label: "Habilitar recurrentes", type: "toggle", group: "Recurrentes" },
      { key: "qrEnabled", label: "Habilitar QR (SIPAP)", type: "toggle", group: "QR" },
    ],
  },

  // ──────────────── PLUGINS · Mensajería / Marketing / Infra ────────────────
  {
    key: "wh_whatsapp", name: "WhatsApp", description: "Mensajería WhatsApp.", kind: "plugin", category: "messaging", version: "1.0.0",
    settingsKey: "plugin_whatsapp", adminPath: "/concepts/plugins/whatsapp", features: ["Configuración", "Plantillas", "Workflows", "Logs"], consumes: ["order.created", "order.paid"],
    configSchema: [
      { key: "apiUrl", label: "API URL", type: "url", group: "Configuración", placeholder: "https://graph.facebook.com/v20.0/<phone_id>/messages" },
      { key: "token", label: "Access Token", type: "password", group: "Configuración" },
      { key: "phoneId", label: "Phone Number ID", type: "text", group: "Configuración" },
      { key: "wabaId", label: "WABA ID", type: "text", group: "Configuración" },
    ],
  },
  {
    key: "mk_meta", name: "Meta", description: "Meta Ads, Catálogo y Conversión (Pixel/CAPI).", kind: "plugin", category: "marketing", version: "1.0.0",
    settingsKey: "plugin_meta", adminPath: "/concepts/plugins/meta", features: ["Ads", "Catálogo", "Conversión"], consumes: ["order.paid"],
    configSchema: [
      { key: "adsAccountId", label: "Ad Account ID", type: "text", group: "Ads", placeholder: "act_XXXXXXXX" },
      { key: "catalogId", label: "Catalog ID", type: "text", group: "Catálogo" },
      { key: "feedUrl", label: "Feed URL (product feed)", type: "url", group: "Catálogo" },
      { key: "pixelId", label: "Pixel ID", type: "text", group: "Conversión" },
      { key: "capiToken", label: "CAPI Access Token", type: "password", group: "Conversión" },
      { key: "testEventCode", label: "Test Event Code", type: "text", group: "Conversión", help: "Opcional, para pruebas." },
    ],
  },
  {
    key: "mk_google", name: "Google", description: "Analytics, Ads, Catálogo (Merchant) y reCAPTCHA.", kind: "plugin", category: "marketing", version: "1.0.0",
    settingsKey: "plugin_google", adminPath: "/concepts/plugins/google", features: ["Analytics", "Ads", "Catálogo", "reCAPTCHA"],
    configSchema: [
      { key: "gaMeasurementId", label: "GA4 Measurement ID", type: "text", group: "Analytics", placeholder: "G-XXXXXXX" },
      { key: "adsConversionId", label: "Ads Conversion ID", type: "text", group: "Ads", placeholder: "AW-XXXXXXXXX" },
      { key: "adsLabel", label: "Conversion Label", type: "text", group: "Ads" },
      { key: "merchantId", label: "Merchant Center ID", type: "text", group: "Catálogo" },
      { key: "feedUrl", label: "Feed URL (Merchant)", type: "url", group: "Catálogo" },
      { key: "recaptchaVersion", label: "Versión", type: "select", group: "reCAPTCHA", options: [{ value: "v3", label: "v3" }, { value: "v2", label: "v2" }] },
      { key: "recaptchaSiteKey", label: "Site Key", type: "text", group: "reCAPTCHA" },
      { key: "recaptchaSecret", label: "Secret Key", type: "password", group: "reCAPTCHA" },
    ],
  },
  {
    key: "infra_cloudflare", name: "Cloudflare", description: "Storage (R2/S3/bucket) y WAF.", kind: "plugin", category: "infra", version: "1.0.0",
    settingsKey: "plugin_cloudflare", adminPath: "/concepts/plugins/cloudflare", features: ["Storage", "WAF"],
    configSchema: [
      { key: "provider", label: "Proveedor", type: "select", group: "Storage", options: [{ value: "local", label: "Local (disco)" }, { value: "r2", label: "Cloudflare R2" }, { value: "s3", label: "Amazon S3" }] },
      { key: "bucket", label: "Bucket", type: "text", group: "Storage" },
      { key: "region", label: "Región", type: "text", group: "Storage", placeholder: "auto / us-east-1" },
      { key: "endpoint", label: "Endpoint", type: "url", group: "Storage", placeholder: "https://<acct>.r2.cloudflarestorage.com" },
      { key: "accessKeyId", label: "Access Key ID", type: "password", group: "Storage" },
      { key: "secretAccessKey", label: "Secret Access Key", type: "password", group: "Storage" },
      { key: "publicBaseUrl", label: "URL pública base", type: "url", group: "Storage", placeholder: "https://cdn.mitienda.com" },
      { key: "zoneId", label: "Zone ID", type: "text", group: "WAF" },
      { key: "apiToken", label: "API Token", type: "password", group: "WAF" },
      { key: "wafMode", label: "Modo WAF", type: "select", group: "WAF", options: [{ value: "off", label: "Off" }, { value: "monitor", label: "Monitor" }, { value: "block", label: "Block" }] },
    ],
  },

  // ──────────────── PLUGINS · Comercio / Builder ────────────────
  {
    key: "multi_inventory", name: "Multi-sucursal / Inventario", description: "Sucursales configurables, stock por sucursal, costos y radio de envío, import/export.",
    kind: "plugin", category: "logistics", version: "1.0.0", settingsKey: "plugin_multiinventory", adminPath: "/concepts/branches",
    features: ["Sucursales", "Stock por sucursal", "Costos/Radio", "Import/Export", "Logs"], enabledByDefault: true, consumes: ["order.created", "order.paid"],
    configSchema: [
      { key: "decrementOnConfirm", label: "Descontar stock al confirmar la orden", type: "toggle", group: "Stock" },
      { key: "deliverySource", label: "Sucursal de origen en delivery", type: "select", group: "Stock", options: [{ value: "nearest", label: "Más cercana al cliente" }, { value: "most_stock", label: "La de mayor stock" }] },
    ],
  },
  { key: "page_builder", name: "Editor visual", description: "Constructor de páginas estilo Elementor (Chai Builder).", kind: "plugin", category: "builder", version: "1.0.0", adminPath: "/concepts/page-builder", features: ["Builder visual", "Bloques", "Tailwind"], enabledByDefault: true },

  // ──────────────── PLUGINS · Búsqueda ────────────────
  {
    key: "feat_scan_search", name: "Escáner y voz", description: "Búsqueda por código de barras (cámara) y por voz en la tienda.",
    kind: "plugin", category: "search", version: "1.0.0", settingsKey: "plugin_scan_search", adminPath: "/concepts/plugins/scan-search",
    features: ["Escáner de barras", "Búsqueda por voz"], dependsOn: ["catalog"], enabledByDefault: true,
    configSchema: [
      { key: "scanEnabled", label: "Botón Escanear (cámara)", type: "toggle", group: "Escáner" },
      { key: "voiceEnabled", label: "Botón Voz (micrófono)", type: "toggle", group: "Voz" },
      { key: "voiceLang", label: "Idioma de voz", type: "text", group: "Voz", placeholder: "es-PY" },
      { key: "matchSku", label: "Buscar por SKU", type: "toggle", group: "Coincidencia" },
      { key: "matchBarcode", label: "Buscar por código de barras (campo barcode)", type: "toggle", group: "Coincidencia" },
      { key: "matchCodInterno", label: "Buscar por código interno", type: "toggle", group: "Coincidencia" },
    ],
  },

  // ──────────────── PLUGINS · Comercio (antes "fantasma") ────────────────
  {
    key: "wishlist", name: "Favoritos / Wishlist", description: "Lista de favoritos del cliente.", kind: "plugin", category: "commerce", version: "1.0.0",
    settingsKey: "plugin_wishlist", enabledByDefault: true, features: ["Favoritos"],
  },
  {
    key: "stock", name: "Stock en vivo (ERP)", description: "Consulta de stock en vivo contra el ERP por sucursal.", kind: "plugin", category: "logistics", version: "1.0.0",
    settingsKey: "plugin_stock", dependsOn: ["multi_inventory"], features: ["Stock ERP"],
    configSchema: [
      { key: "erpUrl", label: "URL del ERP", type: "url", group: "Conexión" },
      { key: "erpToken", label: "Token", type: "password", group: "Conexión" },
    ],
  },
  {
    key: "erp_sync", name: "Sincronizador ERP", description: "Importa productos/categorías, empuja pedidos y sincroniza stock contra cualquier ERP (adapters + mapeo configurable).",
    kind: "plugin", category: "infra", version: "1.0.0", settingsKey: "plugin_erp_sync", adminPath: "/concepts/plugins/erp-sync",
    consumes: ["order.created", "order.paid"], features: ["Importar productos", "Importar categorías", "Push de pedidos", "Sync de stock", "Mapeo de campos"],
    configSchema: [
      { key: "adapter", label: "ERP / Adapter", type: "select", group: "Conexión", options: [{ value: "rest", label: "REST genérico (JSON)" }, { value: "farmatotal", label: "ERP Farmatotal (Cybersource/REST)" }, { value: "woo", label: "WooCommerce" }] },
      { key: "baseUrl", label: "URL base", type: "url", group: "Conexión", placeholder: "https://api.miempresa.com" },
      { key: "token", label: "Token / API Key", type: "password", group: "Conexión" },
      { key: "rejectUnauthorized", label: "Validar certificado TLS", type: "toggle", group: "Conexión" },
      { key: "productsPath", label: "Path de productos (REST)", type: "text", group: "Conexión", placeholder: "/api/products" },
      { key: "categoriesPath", label: "Path de categorías (REST)", type: "text", group: "Conexión", placeholder: "/api/categories" },
      { key: "pushOrders", label: "Empujar pedidos al confirmarse", type: "toggle", group: "Sincronización" },
      { key: "autoStock", label: "Sincronizar stock automáticamente", type: "toggle", group: "Sincronización" },
    ],
  },
];
