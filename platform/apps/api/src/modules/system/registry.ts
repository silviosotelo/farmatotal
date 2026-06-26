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
  sensitive?: boolean;
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
  registersInto?: string;
  settingsKey?: string;
  adminPath?: string;
  features?: string[];
  configSchema?: ConfigField[];
  dependsOn?: string[];
  provides?: string[];
  consumes?: string[];
  enabledByDefault?: boolean;
  /** Tenant config flags que este plugin controla al activarse/desactivarse. */
  controlsFlags?: string[];
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
      { key: "env", label: "Entorno", type: "select", group: "Credenciales", options: envOpts, help: "Staging para pruebas, Producción para pagos reales" },
      { key: "publicKey", label: "Public Key", type: "password", group: "Credenciales", sensitive: true, help: "Clave pública de Bancard vPOS" },
      { key: "privateKey", label: "Private Key", type: "password", group: "Credenciales", sensitive: true, help: "Clave privada de Bancard vPOS (nunca compartir)" },
      { key: "merchantCode", label: "Código de comercio", type: "text", group: "Credenciales", help: "Código de comercio asignado por Bancard" },
      { key: "publicApiUrl", label: "URL pública del API", type: "text", group: "Credenciales", help: "URL pública del backend (para generar el webhook). Ej: https://api.tudominio.com" },
      { key: "storeUrl", label: "URL de la tienda", type: "text", group: "Credenciales", help: "URL del storefront (para retorno después del pago). Ej: https://tienda.tudominio.com" },
      { key: "_webhookUrl", label: "URL de confirmación del pago (copiar y pegar en el portal de Bancard)", type: "text", group: "Credenciales", help: "Esta URL se genera automáticamente. Copiala y pegala en la configuración de tu app en https://comercios.bancard.com.py", sensitive: false },
      { key: "simpleEnabled", label: "Habilitar pagos simples", type: "toggle", group: "Pagos simples", help: "Pagos únicos con tarjeta de crédito/débito" },
      { key: "simpleCurrency", label: "Moneda", type: "select", group: "Pagos simples", options: [{ value: "PYG", label: "Guaraní (PYG)" }, { value: "USD", label: "Dólar (USD)" }] },
      { key: "simpleMaxAmount", label: "Monto máximo por pago", type: "number", group: "Pagos simples", help: "Límite máximo por transacción (0 = sin límite)" },
      { key: "simpleAllowGuests", label: "Permitir pago sin registro", type: "toggle", group: "Pagos simples" },
      { key: "recurringEnabled", label: "Habilitar pagos recurrentes", type: "toggle", group: "Recurrentes", help: "Pagos periódicos con alias/token de tarjeta" },
      { key: "recurringInterval", label: "Intervalo de cobro", type: "select", group: "Recurrentes", options: [{ value: "monthly", label: "Mensual" }, { value: "weekly", label: "Semanal" }, { value: "yearly", label: "Anual" }] },
      { key: "recurringMaxRetries", label: "Reintentos máximos", type: "number", group: "Recurrentes", help: "Cantidad de reintentos si falla el cobro" },
      { key: "qrEnabled", label: "Habilitar pago con QR", type: "toggle", group: "QR", help: "Generar código QR para pagos presenciales" },
      { key: "qrExpiration", label: "Expiración del QR (segundos)", type: "number", group: "QR", help: "Tiempo de vida del código QR" },
      { key: "qrMaxAmount", label: "Monto máximo QR", type: "number", group: "QR" },
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
    kind: "plugin", category: "logistics", version: "1.0.0", settingsKey: "plugin_multiinventory", adminPath: "/concepts/plugins/multi-inventory",
    features: ["Sucursales", "Stock por sucursal", "Costos/Radio", "Import/Export", "Logs"], enabledByDefault: true, consumes: ["order.created", "order.paid"],
    controlsFlags: ["branches", "inventory"],
    configSchema: [
      // General
      { key: "inventoryPrices", label: "Precios por inventario", type: "toggle", group: "General" },
      { key: "inventoryPricesModifyWhenSelected", label: "Mostrar precio del inventario seleccionado", type: "toggle", group: "General" },
      { key: "defaultInventory", label: "Inventario por defecto", type: "select", group: "General", placeholder: "ID del inventario" },
      { key: "hideProductsInCategories", label: "Ocultar productos no disponibles en categorías", type: "toggle", group: "General" },
      { key: "inventoryRequired", label: "Requerir selección de inventario antes de agregar al carrito", type: "toggle", group: "General" },
      { key: "inventoryAllowEmptyProducts", label: "Permitir productos sin datos de inventario", type: "toggle", group: "General" },

      // Carrito
      { key: "showInventoryInCartAndCheckout", label: "Mostrar inventario en carrito y checkout", type: "toggle", group: "Carrito" },
      { key: "restrictInventoryCart", label: "Restringir carrito a un solo inventario", type: "toggle", group: "Carrito" },
      { key: "restrictInventoryCartText", label: "Mensaje al eliminar productos por cambio de inventario", type: "text", group: "Carrito" },
      { key: "mixedCartInfo", label: "Mostrar aviso de carrito mixto", type: "toggle", group: "Carrito" },
      { key: "mixedCartInfoText", label: "Texto de carrito mixto", type: "text", group: "Carrito" },
      { key: "cartShowSwitchInventory", label: "Mostrar botón Cambiar inventario en carrito", type: "toggle", group: "Carrito" },

      // Stock
      { key: "modifyStockQuantity", label: "Mostrar solo stock del inventario seleccionado", type: "toggle", group: "Stock" },
      { key: "reduceManualOrdersStock", label: "Descontar stock en pedidos manuales", type: "toggle", group: "Stock" },
      { key: "restockUnpaidOrdersStock", label: "Reponer stock al cancelar pedidos impagos", type: "toggle", group: "Stock" },
      { key: "reduceStockOnPendingPayments", label: "Descontar stock en estado pendiente", type: "toggle", group: "Stock" },
      { key: "backendEditDisable", label: "Deshabilitar edición de stock en edición de producto", type: "toggle", group: "Stock" },
      { key: "showInventoriesInProductsBackend", label: "Mostrar columna de inventario en lista de productos", type: "toggle", group: "Stock" },
      { key: "decrementOnConfirm", label: "Descontar stock al confirmar la orden", type: "toggle", group: "Stock" },
      { key: "deliverySource", label: "Sucursal de origen en delivery", type: "select", group: "Stock", options: [{ value: "nearest", label: "Más cercana al cliente" }, { value: "most_stock", label: "La de mayor stock" }] },

      // Click & Collect
      { key: "clickCollectEnable", label: "Habilitar Click & Collect", type: "toggle", group: "Click & Collect" },
      { key: "deliveryInventory", label: "ID de inventario de delivery", type: "text", group: "Click & Collect" },
      { key: "clickCollectShowDeliveryInPopup", label: "Mostrar delivery en popup", type: "toggle", group: "Click & Collect" },
      { key: "clickCollectOverrideDeliveryAddress", label: "Sobrescribir dirección de envío con inventario", type: "toggle", group: "Click & Collect" },
      { key: "clickCollectDeliveryShippingMethods", label: "Métodos de envío permitidos (delivery)", type: "text", group: "Click & Collect", placeholder: "Separados por coma" },
      { key: "clickCollectPickupShippingMethods", label: "Métodos de envío permitidos (retiro)", type: "text", group: "Click & Collect", placeholder: "Separados por coma" },
      { key: "clickCollectDeliveryPaymentGateways", label: "Pasarelas de pago permitidas (delivery)", type: "text", group: "Click & Collect", placeholder: "Separados por coma" },
      { key: "clickCollectPickupPaymentGateways", label: "Pasarelas de pago permitidas (retiro)", type: "text", group: "Click & Collect", placeholder: "Separados por coma" },

      // Página de producto
      { key: "productPageEnable", label: "Mostrar inventarios en página de producto", type: "toggle", group: "Página de producto" },
      { key: "productPageValidateStock", label: "Validar stock en tiempo real", type: "toggle", group: "Página de producto" },
      { key: "productPageHideEmptyInventories", label: "Ocultar inventarios sin stock", type: "toggle", group: "Página de producto" },
      { key: "productPageDisplay", label: "Modo de visualización", type: "select", group: "Página de producto", options: [
        { value: "radio", label: "Radio" },
        { value: "select", label: "Select" },
        { value: "label", label: "Label" },
        { value: "labelPopup", label: "Label + Popup" },
        { value: "hidden", label: "Oculto" },
        { value: "text", label: "Texto" },
        { value: "textOnlySelected", label: "Texto (solo seleccionado)" },
      ] },
      { key: "productPageStockDisplay", label: "Visualización de stock", type: "select", group: "Página de producto", options: [
        { value: "count", label: "Cantidad" },
        { value: "inout", label: "Disponible / No disponible" },
        { value: "hidden", label: "Oculto" },
      ] },
      { key: "productPageOrder", label: "Orden de inventarios", type: "select", group: "Página de producto", options: [
        { value: "order", label: "Orden manual" },
        { value: "name", label: "Nombre" },
        { value: "most_stock", label: "Mayor stock" },
        { value: "lowest_stock", label: "Menor stock" },
      ] },

      // Popup
      { key: "popupEnable", label: "Habilitar popup de selección", type: "toggle", group: "Popup" },
      { key: "popupLayout", label: "Layout del popup", type: "select", group: "Popup", options: [
        { value: "1", label: "Layout 1" },
        { value: "2", label: "Layout 2" },
        { value: "3", label: "Layout 3" },
      ] },
      { key: "popupShowAutomatically", label: "Mostrar automáticamente en primera visita", type: "toggle", group: "Popup" },
      { key: "popupHideClose", label: "Forzar selección (sin botón cerrar)", type: "toggle", group: "Popup" },
      { key: "popupShowStock", label: "Mostrar stock en popup", type: "toggle", group: "Popup" },
      { key: "popupDisableGeolocation", label: "Deshabilitar geolocalización del navegador", type: "toggle", group: "Popup" },
      { key: "popupShowSearch", label: "Mostrar búsqueda de dirección", type: "toggle", group: "Popup" },
      { key: "popupMiles", label: "Usar millas en vez de kilómetros", type: "toggle", group: "Popup" },
      { key: "popupMaxResults", label: "Máximo de resultados mostrados", type: "number", group: "Popup" },
      { key: "popupBackgroundColor", label: "Color de fondo del popup", type: "text", group: "Popup" },
      { key: "popupTextColor", label: "Color de texto del popup", type: "text", group: "Popup" },
      { key: "popupButtonBackgroundColor", label: "Color de fondo del botón", type: "text", group: "Popup" },
      { key: "popupButtonTextColor", label: "Color de texto del botón", type: "text", group: "Popup" },

      // Order Flow
      { key: "orderFlowOption", label: "Auto-asignación de inventario", type: "select", group: "Order Flow", options: [
        { value: "custom", label: "Personalizado" },
        { value: "most_stock", label: "Mayor stock" },
        { value: "lowest_stock", label: "Menor stock" },
        { value: "name", label: "Nombre" },
        { value: "order", label: "Orden manual" },
        { value: "distance", label: "Distancia" },
        { value: "country", label: "País" },
      ] },
      { key: "orderFlowAlwaysUse", label: "Siempre usar auto-asignación", type: "toggle", group: "Order Flow" },
      { key: "orderFlowSplitOrders", label: "Dividir pedidos por inventario", type: "toggle", group: "Order Flow" },
      { key: "orderFlowCustomInventory", label: "ID de inventario personalizado", type: "text", group: "Order Flow" },
      { key: "orderFlowFallback", label: "Inventario de respaldo (modo país)", type: "text", group: "Order Flow" },

      // Envío por radio
      { key: "radiusShipping", label: "Habilitar envío por radio", type: "toggle", group: "Envío por radio" },
      { key: "radiusShippingUseMiles", label: "Usar millas en vez de kilómetros", type: "toggle", group: "Envío por radio" },
      { key: "radiusShippingFeesEnable", label: "Habilitar tarifas por distancia", type: "toggle", group: "Envío por radio" },
      { key: "radiusShippingFeesLabel", label: "Etiqueta de tarifa", type: "text", group: "Envío por radio" },
      { key: "radiusShippingDistanceEnable", label: "Bloquear checkout fuera del radio", type: "toggle", group: "Envío por radio" },
      { key: "radiusShippingDistanceRadius", label: "Radio máximo (km)", type: "number", group: "Envío por radio" },
      { key: "radiusShippingDistanceMessage", label: "Mensaje de error fuera de radio", type: "text", group: "Envío por radio" },

      // Costos de envío
      { key: "deliveryCosts", label: "Habilitar costos de envío por inventario", type: "toggle", group: "Costos de envío" },
      { key: "deliveryCostsText", label: "Plantilla de etiqueta de tarifa", type: "text", group: "Costos de envío" },

      // Textos
      { key: "textsInventoryLabel", label: "Texto: etiqueta de inventario", type: "text", group: "Textos" },
      { key: "textsStock", label: "Texto: stock", type: "text", group: "Textos" },
      { key: "textsLeftInStock", label: "Texto: quedan en stock", type: "text", group: "Textos" },
      { key: "textsInStock", label: "Texto: en stock", type: "text", group: "Textos" },
      { key: "textsOutOfStock", label: "Texto: sin stock", type: "text", group: "Textos" },
      { key: "textsNotInStock", label: "Texto: no disponible", type: "text", group: "Textos" },
      { key: "textsNotEnoughStock", label: "Texto: stock insuficiente", type: "text", group: "Textos" },
      { key: "textsNoInventorySelected", label: "Texto: inventario no seleccionado", type: "text", group: "Textos" },
      { key: "textsDeliveryTime", label: "Texto: tiempo de entrega", type: "text", group: "Textos" },
      { key: "textsSelectStore", label: "Texto: seleccionar tienda", type: "text", group: "Textos" },
      { key: "textsLocalPickup", label: "Texto: retiro en local", type: "text", group: "Textos" },
      { key: "textsDelivery", label: "Texto: delivery", type: "text", group: "Textos" },

      // Usuarios de inventario
      { key: "inventoryUsers", label: "Habilitar acceso por usuario a inventarios", type: "toggle", group: "Usuarios de inventario" },
      { key: "inventoryUsersOrdersBackend", label: "Limitar pedidos del backend a inventarios asignados", type: "toggle", group: "Usuarios de inventario" },

      // Log
      { key: "loggingEnabled", label: "Registrar cambios de stock", type: "toggle", group: "Log" },
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
