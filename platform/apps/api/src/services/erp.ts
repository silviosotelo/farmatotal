import { Agent } from "undici";
import { env } from "../env.js";
import type { orders, orderLines, branches } from "../db/schema";

type OrderRow = typeof orders.$inferSelect;
type LineRow = typeof orderLines.$inferSelect;
type BranchRow = typeof branches.$inferSelect;

export function isErpPushEnabled(): boolean {
  return env.ERP_PUSH_ENABLED && !!env.ERP_SAVE_ORDER_URL;
}

/** Mapea customerDoc "CI:123" / "RUC:456" → {tipo, nro} en el formato del ERP. */
function splitDoc(customerDoc: string | null): { tipo: string; nro: string } {
  if (!customerDoc) return { tipo: "1", nro: "0" };
  const [t, n] = customerDoc.split(":");
  // ERP: 1 = CI, 2 = RUC (convención del save_order legado)
  const tipo = (t ?? "").toUpperCase() === "RUC" ? "2" : "1";
  return { tipo, nro: n || t || "0" };
}

/** Construye el body ECO_* idéntico al contrato save_order del ERP Farmatotal. */
export function buildErpPayload(order: OrderRow, lines: LineRow[], branch?: BranchRow | null) {
  const doc = splitDoc(order.customerDoc);
  const addr = (order.shippingAddress ?? {}) as Record<string, unknown>;
  const now = new Date(order.createdAt).toISOString().replace(/\.\d+Z$/, "Z");

  return {
    // ECO_PEDIDO en el legado = 400000 + post_id; acá usamos el number de la orden.
    ECO_PEDIDO_ALF: order.number,
    ECO_VENTA: [
      {
        ECO_TIPO: "1",
        ECO_MON: "1",
        ECO_FEC_PED: now,
        ECO_ESTADO: order.status,
        ECO_MET_PAGO: order.paymentMethod,
        ECO_OPC_DELIVERY: order.shippingMethod,
        ECO_DESCUENTO: order.discount,
        ECO_CUPON: order.couponCode ? [order.couponCode] : [],
        ECO_TOTAL: order.total,
      },
    ],
    ECO_DETALLE: lines.map((l, i) => ({
      EDET_NRO_ITEM: i + 1,
      EDET_SKU: l.sku,
      EDET_DESC: l.title,
      EDET_CANT: l.quantity,
      EDET_PRECIO: l.lineTotal,
    })),
    ECO_CLIENTE: [
      {
        CLI_RAZON_SOCIAL: order.customerName,
        CLI_TIPO_DOC: doc.tipo,
        CLI_NRO_DOC: doc.nro,
        CLI_TELEFONO: order.customerPhone ?? "",
      },
    ],
    ECO_ENVIO: [
      {
        ECO_ENV_TIPO: order.shippingMethod === "delivery" ? 1 : 2,
        ECO_ENV_DIR: (addr.address as string) ?? "SIN DIRECCION",
        ECO_ENV_CIUDAD: (addr.city as string) ?? "SIN CIUDAD",
        ECO_ENV_DEP: (addr.state as string) ?? "SIN DEPARTAMENTO",
        ECO_ENV_SUC: branch?.code ?? "",
        ECO_ENV_TEL: order.customerPhone ?? "",
        ECO_LATITUD: branch?.lat ?? 0,
        ECO_LONGITUD: branch?.lng ?? 0,
        ECO_OBS: order.notes ?? "",
      },
    ],
  };
}

export type ErpPushResult = { ok: boolean; status: number; body: string };

/**
 * Envía la orden al ERP. A diferencia del legado (sslverify=false, sin auth),
 * acá: token propio (Authorization: Bearer) + validación de certificado por defecto.
 */
export async function pushOrderToErp(
  order: OrderRow,
  lines: LineRow[],
  branch?: BranchRow | null,
): Promise<ErpPushResult> {
  if (!isErpPushEnabled()) {
    throw new Error("ERP push deshabilitado (ERP_PUSH_ENABLED/ERP_SAVE_ORDER_URL)");
  }
  const payload = buildErpPayload(order, lines, branch);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (env.ERP_AUTH_TOKEN) headers.Authorization = `Bearer ${env.ERP_AUTH_TOKEN}`;

  // Validación de cert configurable (default ON). Sólo se relaja si lo piden explícito.
  const dispatcher = env.ERP_REJECT_UNAUTHORIZED
    ? undefined
    : new Agent({ connect: { rejectUnauthorized: false } });

  const res = await fetch(env.ERP_SAVE_ORDER_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    // @ts-expect-error undici dispatcher no está en los tipos de fetch DOM
    dispatcher,
  });
  const body = await res.text().catch(() => "");
  return { ok: res.ok, status: res.status, body: body.slice(0, 2000) };
}
