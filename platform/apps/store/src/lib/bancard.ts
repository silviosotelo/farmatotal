/**
 * Integración con Bancard vPOS (Paraguay).
 * Documentación: https://developers.bancard.com.py/
 *
 * Flujo:
 * 1. Frontend solicita crear pago → POST /api/payments/bancard/create
 * 2. Backend llama a Bancard single_buy → obtiene token + process_id
 * 3. Frontend abre iframe/modal de Bancard con el token
 * 4. Bancard redirige a ?result=SUCCESS|FAILURE
 * 5. Frontend llama a confirmar → POST /api/payments/bancard/confirm
 * 6. Backend verifica con Bancard single_buy/confirmations
 */

const BANCARD_API_URL = process.env.BANCARD_API_URL ?? "https://vpos.infonet.com.py";
const BANCARD_PUBLIC_KEY = process.env.BANCARD_PUBLIC_KEY ?? "pk_test";
const BANCARD_PRIVATE_KEY = process.env.BANCARD_PRIVATE_KEY ?? "sk_test";

interface SingleBuyRequest {
  shop_process_id: number;
  amount: number;
  currency: string; // "PYG"
  description: string;
  return_url: string;
  cancel_url: string;
  additional_data?: string;
}

interface SingleBuyResponse {
  process_id: number;
  token: string;
  status: string;
}

interface ConfirmResponse {
  amount: number;
  currency: string;
  authorization_number: string;
  ticket_number: string;
  response_code: string;
  response_description: string;
  extended_response_description: string;
  secure_verification: string;
}

function authHash(processId: number): string {
  // SHA-1(private_key + process_id) — formato de autenticación de Bancard
  const crypto = require("crypto");
  return crypto.createHash("sha1").update(`${BANCARD_PRIVATE_KEY}${processId}`).digest("hex");
}

function encToken(): string {
  // Token codificado con la clave pública (base64)
  return Buffer.from(BANCARD_PUBLIC_KEY).toString("base64");
}

/**
 * Solicita a Bancard iniciar el checkout (single_buy).
 */
export async function createBancardCheckout(params: {
  orderId: string;
  amount: number;
  description: string;
}): Promise<{ processId: number; token: string }> {
  const shopProcessId = Date.now(); // timestamp como ID único
  const body: SingleBuyRequest = {
    shop_process_id: shopProcessId,
    amount: params.amount,
    currency: "PYG",
    description: params.description,
    return_url: `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/caja?result=SUCCESS&process_id=${shopProcessId}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/caja?result=FAILURE&process_id=${shopProcessId}`,
  };

  const response = await fetch(`${BANCARD_API_URL}/vpos/api/0.3/single_buy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${encToken()}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Bancard error ${response.status}: ${errText}`);
  }

  const data: SingleBuyResponse = await response.json();
  return { processId: data.process_id, token: data.token };
}

/**
 * Confirma un pago con Bancard (single_buy/confirmations).
 */
export async function confirmBancardPayment(processId: number): Promise<ConfirmResponse> {
  const hash = authHash(processId);
  const response = await fetch(
    `${BANCARD_API_URL}/vpos/api/0.3/single_buy/confirmations?process_id=${processId}&token=${hash}`,
    { method: "GET" }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Bancard confirm error ${response.status}: ${errText}`);
  }

  return response.json();
}

/**
 * Construye la URL del iframe de checkout de Bancard.
 */
export function getBancardCheckoutUrl(token: string): string {
  const baseUrl = process.env.NODE_ENV === "production"
    ? "https://vpos.infonet.com.py"
    : "https://vpos.infonet.com.py"; // sandbox y prod usan la misma URL, se diferencia por las credenciales
  return `${baseUrl}/vpos/embedded/${token}`;
}

/**
 * Parsea el resultado de Bancard desde la URL de callback.
 */
export function parseBancardResult(url: string): { result: string; processId: string } | null {
  try {
    const u = new URL(url);
    const result = u.searchParams.get("result");
    const processId = u.searchParams.get("process_id");
    if (result && processId) return { result, processId };
    return null;
  } catch {
    return null;
  }
}
