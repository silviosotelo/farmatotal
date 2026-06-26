import { createHash } from "crypto"
import { and, eq } from "drizzle-orm"
import { db } from "../db/client.js"
import { settings } from "../db/schema/index.js"

const PLUGIN_KEY = "gw_bancard"
const STORE_KEY = `plugin_${PLUGIN_KEY}`

type BancardConfig = {
  env?: string
  publicKey?: string
  privateKey?: string
  merchantCode?: string
  publicApiUrl?: string
  storeUrl?: string
}

/** Lee la config de Bancard desde el plugin settings en la DB */
export async function getConfig(tenantId: string): Promise<BancardConfig> {
  const [row] = await db
    .select()
    .from(settings)
    .where(and(eq(settings.tenantId, tenantId), eq(settings.key, STORE_KEY)))
    .limit(1)
  return (row?.value as BancardConfig) ?? {}
}

/** URL base de Bancard vPOS según el entorno del plugin */
function baseUrl(env?: string): string {
  return env === "production"
    ? "https://vpos.infonet.com.py"
    : "https://vpos.infonet.com.py:8888"
}

/** Genera token MD5 según la documentación oficial de Bancard vPOS 2.0 */
function md5(...parts: (string | number)[]): string {
  return createHash("md5").update(parts.join("")).digest("hex")
}

/** Verifica si Bancard está habilitado (keys configuradas en el plugin) */
export async function isBancardEnabled(tenantId: string): Promise<boolean> {
  const cfg = await getConfig(tenantId)
  return Boolean(cfg.publicKey && cfg.privateKey)
}

/** 1. single_buy — Inicia proceso de pago (pago ocasional / Zimple) */
export async function singleBuy(
  tenantId: string,
  params: {
    shopProcessId: number
    amount: number
    currency?: string
    description?: string
    returnUrl: string
    cancelUrl?: string
    additionalData?: string
    preauthorization?: boolean
    billing?: Record<string, unknown>
    zimple?: boolean
    testClient?: boolean
  },
) {
  const cfg = await getConfig(tenantId)
  const currency = params.currency ?? "PYG"
  const token = md5(cfg.privateKey, params.shopProcessId, params.amount.toFixed(2), currency)

  const operation: Record<string, unknown> = {
    token,
    shop_process_id: params.shopProcessId,
    amount: params.amount.toFixed(2),
    currency,
    description: (params.description ?? "Pago").substring(0, 20),
    return_url: params.returnUrl,
    cancel_url: params.cancelUrl ?? params.returnUrl,
  }

  if (params.additionalData) operation.additional_data = params.additionalData
  if (params.preauthorization) operation.preauthorization = "S"
  if (params.billing) operation.billing = params.billing
  if (params.zimple) operation.zimple = "S"
  if (params.testClient) operation.test_client = "S"

  const body = { public_key: cfg.publicKey, operation }

  const res = await fetch(`${baseUrl(cfg.env)}/vpos/api/0.3/single_buy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<{ status: string; process_id: string }>
}

/** 2. cards/new — Catastro de tarjeta (registra tarjeta para pago con token) */
export async function cardsNew(
  tenantId: string,
  params: {
    cardId: number
    userId: number
    userCellPhone: string
    userMail: string
    returnUrl: string
  },
) {
  const cfg = await getConfig(tenantId)
  const token = md5(cfg.privateKey, params.cardId, params.userId, "request_new_card")

  const body = {
    public_key: cfg.publicKey,
    operation: {
      token,
      card_id: params.cardId,
      user_id: params.userId,
      user_cell_phone: params.userCellPhone,
      user_mail: params.userMail,
      return_url: params.returnUrl,
    },
  }

  const res = await fetch(`${baseUrl(cfg.env)}/vpos/api/0.3/cards/new`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<{ status: string; process_id: string }>
}

/** 3. users_cards — Lista tarjetas catastradas de un usuario */
export async function usersCards(tenantId: string, userId: number) {
  const cfg = await getConfig(tenantId)
  const token = md5(cfg.privateKey, userId, "request_user_cards")

  const body = {
    public_key: cfg.publicKey,
    operation: { token, user_id: userId },
  }

  const res = await fetch(`${baseUrl(cfg.env)}/vpos/api/0.3/users_cards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<{
    status: string
    data: Array<{ card_id: number; card_token: string; mask: string; brand: string; expiry: string }>
  }>
}

/** 4. charge — Pago con token (catastro previo) */
export async function charge(
  tenantId: string,
  params: {
    shopProcessId: number
    amount: number
    currency?: string
    aliasToken: string
    description?: string
    returnUrl: string
    cancelUrl?: string
    additionalData?: string
    billing?: Record<string, unknown>
  },
) {
  const cfg = await getConfig(tenantId)
  const currency = params.currency ?? "PYG"
  const token = md5(cfg.privateKey, params.shopProcessId, "charge", params.amount.toFixed(2), currency, params.aliasToken)

  const operation: Record<string, unknown> = {
    token,
    shop_process_id: params.shopProcessId,
    amount: params.amount.toFixed(2),
    currency,
    alias_token: params.aliasToken,
    description: (params.description ?? "Pago").substring(0, 20),
    return_url: params.returnUrl,
    cancel_url: params.cancelUrl ?? params.returnUrl,
  }

  if (params.additionalData) operation.additional_data = params.additionalData
  if (params.billing) operation.billing = params.billing

  const body = { public_key: cfg.publicKey, operation }

  const res = await fetch(`${baseUrl(cfg.env)}/vpos/api/0.3/charge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<{ status: string; process_id: string }>
}

/** 5. delete — Elimina tarjeta catastrada */
export async function deleteCard(tenantId: string, userId: number, cardToken: string) {
  const cfg = await getConfig(tenantId)
  const token = md5(cfg.privateKey, "delete_card", userId, cardToken)

  const body = {
    public_key: cfg.publicKey,
    operation: { token, user_id: userId, card_token: cardToken },
  }

  const res = await fetch(`${baseUrl(cfg.env)}/vpos/api/0.3/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<{ status: string }>
}

/** 6. single_buy_rollback — Reversa de transacción */
export async function rollback(tenantId: string, shopProcessId: number) {
  const cfg = await getConfig(tenantId)
  const token = md5(cfg.privateKey, shopProcessId, "rollback", "0.00")

  const body = {
    public_key: cfg.publicKey,
    operation: { token, shop_process_id: shopProcessId },
  }

  const res = await fetch(`${baseUrl(cfg.env)}/vpos/api/0.3/single_buy/rollback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<{ status: string }>
}

/** 7. get_single_buy_confirmation — Consulta estado de transacción */
export async function getConfirmation(tenantId: string, shopProcessId: number) {
  const cfg = await getConfig(tenantId)
  const token = md5(cfg.privateKey, shopProcessId, "get_confirmation")

  const body = {
    public_key: cfg.publicKey,
    operation: { token, shop_process_id: shopProcessId },
  }

  const res = await fetch(`${baseUrl(cfg.env)}/vpos/api/0.3/single_buy/confirmations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const raw = await res.json() as {
    status?: string
    confirmation?: { response?: string; response_code?: string; authorization_number?: string } | null
  }
  const c = raw.confirmation ?? null
  const approved = !!c && (c.response_code === "0" || c.response_code === "00")
  const settled = !!c && c.response_code != null
  return { raw, confirmation: c, approved, settled }
}

/** 8. verifyConfirmationToken — Valida el token del webhook de Bancard */
export async function verifyConfirmationToken(
  tenantId: string,
  params: {
    shopProcessId: number
    amount: number
    currency?: string
    token: string
  },
): Promise<boolean> {
  const cfg = await getConfig(tenantId)
  const currency = params.currency ?? "PYG"
  const expected = md5(cfg.privateKey, params.shopProcessId, "confirm", params.amount.toFixed(2), currency)
  return expected === params.token
}

/** URL del JS SDK de Bancard para el iframe */
export async function bancardJsUrl(tenantId: string): Promise<string> {
  const cfg = await getConfig(tenantId)
  return `${baseUrl(cfg.env)}/checkout/javascript/dist/bancard-checkout-4.0.0.js`
}

/** URL del JS SDK de Bancard para Zimple */
export async function bancardZimpleJsUrl(tenantId: string): Promise<string> {
  const cfg = await getConfig(tenantId)
  return `${baseUrl(cfg.env)}/checkout/javascript/dist/bancard-checkout-3.0.0.js`
}
