import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { settings } from "../../db/schema";
import { MODULES } from "../system/registry.js";

/**
 * Config genérica por plugin (almacenamiento). Cada plugin define sus campos
 * agrupados en "tabs"; el admin los renderiza. NO es una vista única: cada
 * plugin tiene su propia ruta/vista que consume /plugins/:key.
 */
type FieldDef = {
  key: string;
  label: string;
  type: "text" | "password" | "select" | "toggle" | "url";
  group: string;
  options?: { value: string; label: string }[];
  placeholder?: string;
  help?: string;
};

const envOpts = [
  { value: "staging", label: "Staging / Sandbox" },
  { value: "production", label: "Producción" },
];

// Definiciones de campos por plugin (key del registry → campos).
const PLUGIN_DEFS: Record<string, FieldDef[]> = {
  // ── Pasarelas ──
  gw_bancard: [
    { key: "env", label: "Entorno", type: "select", group: "Credenciales", options: envOpts },
    { key: "publicKey", label: "Public Key", type: "password", group: "Credenciales" },
    { key: "privateKey", label: "Private Key", type: "password", group: "Credenciales" },
    { key: "simpleEnabled", label: "Habilitar pagos simples (single buy)", type: "toggle", group: "Pagos simples" },
    { key: "recurringEnabled", label: "Habilitar pagos recurrentes (alias/token)", type: "toggle", group: "Recurrentes" },
    { key: "qrEnabled", label: "Habilitar pago con QR", type: "toggle", group: "QR" },
  ],
  gw_personalpay: [
    { key: "env", label: "Entorno", type: "select", group: "Credenciales", options: envOpts },
    { key: "merchantId", label: "Comercio ID", type: "text", group: "Credenciales" },
    { key: "apiKey", label: "API Key", type: "password", group: "Credenciales" },
    { key: "walletEnabled", label: "Habilitar pago con billetera", type: "toggle", group: "Billetera" },
  ],
  gw_tigomoney: [
    { key: "env", label: "Entorno", type: "select", group: "Credenciales", options: envOpts },
    { key: "merchantId", label: "Merchant ID", type: "text", group: "Credenciales" },
    { key: "apiKey", label: "API Key", type: "password", group: "Credenciales" },
    { key: "apiSecret", label: "API Secret", type: "password", group: "Credenciales" },
    { key: "walletEnabled", label: "Habilitar pago con billetera", type: "toggle", group: "Billetera" },
  ],
  gw_dinelco: [
    // Dinelco/Bepsa opera sobre Cybersource (Visa) en Paraguay.
    { key: "env", label: "Entorno", type: "select", group: "Credenciales", options: envOpts },
    { key: "merchantId", label: "Merchant ID (Cybersource)", type: "text", group: "Credenciales" },
    { key: "apiKeyId", label: "API Key ID", type: "password", group: "Credenciales" },
    { key: "secretKey", label: "Shared Secret Key", type: "password", group: "Credenciales" },
    { key: "simpleEnabled", label: "Habilitar pagos simples", type: "toggle", group: "Pagos simples" },
    { key: "recurringEnabled", label: "Habilitar recurrentes", type: "toggle", group: "Recurrentes" },
    { key: "qrEnabled", label: "Habilitar QR (SIPAP)", type: "toggle", group: "QR" },
  ],

  // ── Integraciones ──
  wh_whatsapp: [
    { key: "apiUrl", label: "API URL", type: "url", group: "Configuración", placeholder: "https://graph.facebook.com/v20.0/<phone_id>/messages" },
    { key: "token", label: "Access Token", type: "password", group: "Configuración" },
    { key: "phoneId", label: "Phone Number ID", type: "text", group: "Configuración" },
    { key: "wabaId", label: "WABA ID", type: "text", group: "Configuración" },
  ],
  mk_meta: [
    { key: "adsAccountId", label: "Ad Account ID", type: "text", group: "Ads", placeholder: "act_XXXXXXXX" },
    { key: "catalogId", label: "Catalog ID", type: "text", group: "Catálogo" },
    { key: "feedUrl", label: "Feed URL (product feed)", type: "url", group: "Catálogo" },
    { key: "pixelId", label: "Pixel ID", type: "text", group: "Conversión" },
    { key: "capiToken", label: "CAPI Access Token", type: "password", group: "Conversión" },
    { key: "testEventCode", label: "Test Event Code", type: "text", group: "Conversión", help: "Opcional, para pruebas." },
  ],
  mk_google: [
    { key: "gaMeasurementId", label: "GA4 Measurement ID", type: "text", group: "Analytics", placeholder: "G-XXXXXXX" },
    { key: "adsConversionId", label: "Ads Conversion ID", type: "text", group: "Ads", placeholder: "AW-XXXXXXXXX" },
    { key: "adsLabel", label: "Conversion Label", type: "text", group: "Ads" },
    { key: "merchantId", label: "Merchant Center ID", type: "text", group: "Catálogo" },
    { key: "feedUrl", label: "Feed URL (Merchant)", type: "url", group: "Catálogo" },
    { key: "recaptchaVersion", label: "Versión", type: "select", group: "reCAPTCHA", options: [{ value: "v3", label: "v3" }, { value: "v2", label: "v2" }] },
    { key: "recaptchaSiteKey", label: "Site Key", type: "text", group: "reCAPTCHA" },
    { key: "recaptchaSecret", label: "Secret Key", type: "password", group: "reCAPTCHA" },
  ],
  infra_cloudflare: [
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
};

const STORE_KEY = (k: string) => `plugin_${k}`;

async function readVals(key: string): Promise<Record<string, unknown>> {
  const [row] = await db.select().from(settings).where(eq(settings.key, STORE_KEY(key))).limit(1);
  return (row?.value as Record<string, unknown>) ?? {};
}

export async function pluginRoutes(app: FastifyInstance) {
  app.get("/plugins/:key", { schema: { params: z.object({ key: z.string() }) } }, async (req, reply) => {
    const mod = MODULES.find((m) => m.key === req.params.key && m.kind === "plugin");
    if (!mod) return reply.notFound("Plugin no encontrado");
    const fields = PLUGIN_DEFS[mod.key] ?? [];
    const values = await readVals(mod.key);
    return reply.send({
      key: mod.key,
      name: mod.name,
      description: mod.description,
      features: mod.features ?? [],
      fields,
      enabled: (values.enabled as boolean) ?? false,
      values,
    });
  });

  app.put(
    "/plugins/:key",
    { schema: { params: z.object({ key: z.string() }), body: z.object({ enabled: z.boolean().optional(), values: z.record(z.unknown()) }) } },
    async (req, reply) => {
      const mod = MODULES.find((m) => m.key === req.params.key && m.kind === "plugin");
      if (!mod) return reply.notFound("Plugin no encontrado");
      const value = { enabled: req.body.enabled ?? false, ...req.body.values };
      await db
        .insert(settings)
        .values({ key: STORE_KEY(mod.key), value })
        .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
      return reply.send({ ok: true, key: mod.key });
    },
  );
}
