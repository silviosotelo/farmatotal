/**
 * Cliente Bancard vPOS (API 0.3). Port del gateway de evershop.
 * Operaciones: single_buy (crear pago), confirmations (consultar), rollback (anular).
 * Tokens = md5(private_key + shop_process_id + <suffix|amount+currency>).
 * Claves en env (BANCARD_PUBLIC_KEY/PRIVATE_KEY/ENV). Vacío = deshabilitado.
 */
import crypto from "node:crypto";
import { env } from "../env.js";

const ENVS = {
  staging: "https://vpos.infonet.com.py:8888",
  production: "https://vpos.infonet.com.py",
} as const;

export function isBancardEnabled() {
  return !!env.BANCARD_PUBLIC_KEY && !!env.BANCARD_PRIVATE_KEY;
}
function baseUrl() {
  return ENVS[env.BANCARD_ENV] ?? ENVS.staging;
}
export function bancardJsUrl() {
  return `${baseUrl()}/checkout/javascript/dist/bancard-checkout-4.0.0.js`;
}
function md5(s: string) {
  return crypto.createHash("md5").update(s, "utf8").digest("hex");
}
/** PYG no tiene centavos pero la API pide 2 decimales. */
export function fmtAmount(value: number) {
  return (Math.round(value * 100) / 100).toFixed(2);
}

async function post(path: string, body: unknown) {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return { httpStatus: res.status, ...(JSON.parse(text) as Record<string, unknown>) };
  } catch {
    return { httpStatus: res.status, status: "error", raw: text };
  }
}

export async function singleBuy(opts: {
  shopProcessId: number;
  amount: number;
  currency?: string;
  description?: string;
  returnUrl: string;
  cancelUrl: string;
}) {
  const currency = opts.currency ?? "PYG";
  const amt = fmtAmount(opts.amount);
  const token = md5(`${env.BANCARD_PRIVATE_KEY}${opts.shopProcessId}${amt}${currency}`);
  return post("/vpos/api/0.3/single_buy", {
    public_key: env.BANCARD_PUBLIC_KEY,
    operation: {
      token,
      shop_process_id: opts.shopProcessId,
      amount: amt,
      currency,
      additional_data: "",
      description: (opts.description ?? "Compra online").slice(0, 20),
      return_url: opts.returnUrl,
      cancel_url: opts.cancelUrl,
    },
  });
}

/** Verifica el token de la confirmación server-to-server de Bancard. */
export function verifyConfirmationToken(opts: {
  shopProcessId: number;
  amount: number;
  currency?: string;
  token: string;
}) {
  const currency = opts.currency ?? "PYG";
  const expected = md5(
    `${env.BANCARD_PRIVATE_KEY}${opts.shopProcessId}confirm${fmtAmount(opts.amount)}${currency}`,
  );
  return expected === opts.token;
}

export async function rollback(shopProcessId: number) {
  const token = md5(`${env.BANCARD_PRIVATE_KEY}${shopProcessId}rollback0.00`);
  return post("/vpos/api/0.3/single_buy/rollback", {
    public_key: env.BANCARD_PUBLIC_KEY,
    operation: { token, shop_process_id: shopProcessId },
  });
}

export type BancardConfirmation = {
  response?: string; // "S" = aprobada
  response_code?: string; // "00" = aprobada
  response_description?: string;
  amount?: string;
  currency?: string;
  authorization_number?: string;
  ticket_number?: string;
};

/**
 * Consulta activa del estado de una transacción (get_single_buy_confirmation).
 * No depende del webhook server-to-server: el comercio pregunta a vPOS si la
 * compra fue confirmada. Si aún no hay confirmación, `confirmation` viene null.
 */
export async function getConfirmation(shopProcessId: number) {
  const token = md5(`${env.BANCARD_PRIVATE_KEY}${shopProcessId}get_confirmation`);
  const res = (await post("/vpos/api/0.3/single_buy/confirmations", {
    public_key: env.BANCARD_PUBLIC_KEY,
    operation: { token, shop_process_id: String(shopProcessId) },
  })) as { status?: string; confirmation?: BancardConfirmation | null; messages?: unknown };
  const c = res.confirmation ?? null;
  const approved = !!c && (c.response === "S" || c.response_code === "00");
  const settled = !!c && c.response_code != null; // hay veredicto (aprobada o rechazada)
  return { raw: res, confirmation: c, approved, settled };
}
