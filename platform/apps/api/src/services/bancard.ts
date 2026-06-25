import { createHash } from "crypto"
import { env } from "../env.js"

/** URL base de Bancard vPOS según el entorno */
function baseUrl(): string {
  return env.BANCARD_ENV === "production"
    ? "https://vpos.infonet.com.py"
    : "https://vpos.infonet.com.py:8888"
}

/** Genera token MD5 según la documentación oficial de Bancard vPOS 2.0 */
function md5(...parts: (string | number)[]): string {
  return createHash("md5").update(parts.join("")).digest("hex")
}

/** Verifica si Bancard está habilitado (keys configuradas) */
export function isBancardEnabled(): boolean {
  return Boolean(env.BANCARD_PUBLIC_KEY && env.BANCARD_PRIVATE_KEY)
}

/** 1. single_buy — Inicia proceso de pago (pago ocasional / Zimple) */
export async function singleBuy(params: {
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
}) {
  const currency = params.currency ?? "PYG"
  const token = md5(
    env.BANCARD_PRIVATE_KEY,
    params.shopProcessId,
    params.amount.toFixed(2),
    currency,
  )

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

  const body = { public_key: env.BANCARD_PUBLIC_KEY, operation }

  const res = await fetch(`${baseUrl()}/vpos/api/0.3/single_buy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<{ status: string; process_id: string }>
}

/** 2. cards/new — Catastro de tarjeta (registra tarjeta para pago con token) */
export async function cardsNew(params: {
  cardId: number
  userId: number
  userCellPhone: string
  userMail: string
  returnUrl: string
}) {
  const token = md5(
    env.BANCARD_PRIVATE_KEY,
    params.cardId,
    params.userId,
    "request_new_card",
  )

  const body = {
    public_key: env.BANCARD_PUBLIC_KEY,
    operation: {
      token,
      card_id: params.cardId,
      user_id: params.userId,
      user_cell_phone: params.userCellPhone,
      user_mail: params.userMail,
      return_url: params.returnUrl,
    },
  }

  const res = await fetch(`${baseUrl()}/vpos/api/0.3/cards/new`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<{ status: string; process_id: string }>
}

/** 3. users_cards — Lista tarjetas catastradas de un usuario */
export async function usersCards(userId: number) {
  const token = md5(env.BANCARD_PRIVATE_KEY, userId, "request_user_cards")

  const body = {
    public_key: env.BANCARD_PUBLIC_KEY,
    operation: {
      token,
      user_id: userId,
    },
  }

  const res = await fetch(`${baseUrl()}/vpos/api/0.3/users_cards`, {
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
export async function charge(params: {
  shopProcessId: number
  amount: number
  currency?: string
  aliasToken: string
  description?: string
  returnUrl: string
  cancelUrl?: string
  additionalData?: string
  billing?: Record<string, unknown>
}) {
  const currency = params.currency ?? "PYG"
  const token = md5(
    env.BANCARD_PRIVATE_KEY,
    params.shopProcessId,
    "charge",
    params.amount.toFixed(2),
    currency,
    params.aliasToken,
  )

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

  const body = { public_key: env.BANCARD_PUBLIC_KEY, operation }

  const res = await fetch(`${baseUrl()}/vpos/api/0.3/charge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<{ status: string; process_id: string }>
}

/** 5. delete — Elimina tarjeta catastrada */
export async function deleteCard(userId: number, cardToken: string) {
  const token = md5(env.BANCARD_PRIVATE_KEY, "delete_card", userId, cardToken)

  const body = {
    public_key: env.BANCARD_PUBLIC_KEY,
    operation: {
      token,
      user_id: userId,
      card_token: cardToken,
    },
  }

  const res = await fetch(`${baseUrl()}/vpos/api/0.3/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<{ status: string }>
}

/** 6. single_buy_rollback — Reversa de transacción */
export async function rollback(shopProcessId: number) {
  const token = md5(env.BANCARD_PRIVATE_KEY, shopProcessId, "rollback", "0.00")

  const body = {
    public_key: env.BANCARD_PUBLIC_KEY,
    operation: {
      token,
      shop_process_id: shopProcessId,
    },
  }

  const res = await fetch(`${baseUrl()}/vpos/api/0.3/single_buy/rollback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<{ status: string }>
}

/** 7. get_single_buy_confirmation — Consulta estado de transacción */
export async function getConfirmation(shopProcessId: number) {
  const token = md5(env.BANCARD_PRIVATE_KEY, shopProcessId, "get_confirmation")

  const body = {
    public_key: env.BANCARD_PUBLIC_KEY,
    operation: {
      token,
      shop_process_id: shopProcessId,
    },
  }

  const res = await fetch(`${baseUrl()}/vpos/api/0.3/single_buy/confirmations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const raw = await res.json() as {
    status?: string
    confirmation?: { response?: string; response_code?: string; authorization_number?: string } | null
  }
  const c = raw.confirmation ?? null
  const approved = !!c && (c.response === "S" || c.response_code === "00")
  const settled = !!c && c.response_code != null
  return { raw, confirmation: c, approved, settled }
}

/** 8. verifyConfirmationToken — Valida el token del webhook de Bancard */
export function verifyConfirmationToken(params: {
  shopProcessId: number
  amount: number
  currency?: string
  token: string
}): boolean {
  const currency = params.currency ?? "PYG"
  const expected = md5(
    env.BANCARD_PRIVATE_KEY,
    params.shopProcessId,
    "confirm",
    params.amount.toFixed(2),
    currency,
  )
  return expected === params.token
}

/** URL del JS SDK de Bancard para el iframe */
export function bancardJsUrl(): string {
  return `${baseUrl()}/checkout/javascript/dist/bancard-checkout-4.0.0.js`
}

/** URL del JS SDK de Bancard para Zimple */
export function bancardZimpleJsUrl(): string {
  return `${baseUrl()}/checkout/javascript/dist/bancard-checkout-3.0.0.js`
}
