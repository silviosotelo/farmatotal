import { eq } from "drizzle-orm";
import { Agent } from "undici";
import { env } from "../env.js";
import { db } from "../db/client.js";
import type { orders, orderItems, branches } from "../db/schema";
import { orderAddresses, orderShippingLines } from "../db/schema";

type OrderRow = typeof orders.$inferSelect;
type LineRow = typeof orderItems.$inferSelect;
type BranchRow = typeof branches.$inferSelect;

export function isErpPushEnabled(): boolean {
  return env.ERP_PUSH_ENABLED && !!env.ERP_SAVE_ORDER_URL;
}

function splitDoc(customerDoc: string | null): { tipo: string; nro: string } {
  if (!customerDoc) return { tipo: "1", nro: "0" };
  const [t, n] = customerDoc.split(":");
  const tipo = (t ?? "").toUpperCase() === "RUC" ? "2" : "1";
  return { tipo, nro: n || t || "0" };
}

export async function buildErpPayload(order: OrderRow, lines: LineRow[], branch?: BranchRow | null) {
  const now = new Date(order.createdAt).toISOString().replace(/\.\d+Z$/, "Z");

  const [shippingAddr] = await db
    .select()
    .from(orderAddresses)
    .where(eq(orderAddresses.orderId, order.id))
    .limit(1);

  const [shippingLine] = await db
    .select()
    .from(orderShippingLines)
    .where(eq(orderShippingLines.orderId, order.id))
    .limit(1);

  const phone = shippingAddr?.phone ?? "";
  const address = shippingAddr?.address1 ?? "SIN DIRECCION";
  const city = shippingAddr?.city ?? "SIN CIUDAD";
  const state = shippingAddr?.state ?? "SIN DEPARTAMENTO";

  const doc = splitDoc(null);

  return {
    ECO_PEDIDO_ALF: order.orderNumber,
    ECO_VENTA: [
      {
        ECO_TIPO: "1",
        ECO_MON: "1",
        ECO_FEC_PED: now,
        ECO_ESTADO: order.status,
        ECO_MET_PAGO: order.paymentMethod ?? "",
        ECO_OPC_DELIVERY: shippingLine?.methodId ?? "",
        ECO_DESCUENTO: order.discountTotal,
        ECO_CUPON: [],
        ECO_TOTAL: order.total,
      },
    ],
    ECO_DETALLE: lines.map((l, i) => ({
      EDET_NRO_ITEM: i + 1,
      EDET_SKU: l.sku,
      EDET_DESC: l.name,
      EDET_CANT: l.quantity,
      EDET_PRECIO: l.total,
    })),
    ECO_CLIENTE: [
      {
        CLI_RAZON_SOCIAL: "",
        CLI_TIPO_DOC: doc.tipo,
        CLI_NRO_DOC: doc.nro,
        CLI_TELEFONO: phone,
      },
    ],
    ECO_ENVIO: [
      {
        ECO_ENV_TIPO: shippingLine ? 1 : 2,
        ECO_ENV_DIR: address,
        ECO_ENV_CIUDAD: city,
        ECO_ENV_DEP: state,
        ECO_ENV_SUC: branch?.code ?? "",
        ECO_ENV_TEL: phone,
        ECO_LATITUD: branch?.latitude ?? 0,
        ECO_LONGITUD: branch?.longitude ?? 0,
        ECO_OBS: order.customerNote ?? "",
      },
    ],
  };
}

export type ErpPushResult = { ok: boolean; status: number; body: string };

export async function pushOrderToErp(
  order: OrderRow,
  lines: LineRow[],
  branch?: BranchRow | null,
): Promise<ErpPushResult> {
  if (!isErpPushEnabled()) {
    throw new Error("ERP push deshabilitado (ERP_PUSH_ENABLED/ERP_SAVE_ORDER_URL)");
  }
  const payload = await buildErpPayload(order, lines, branch);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (env.ERP_AUTH_TOKEN) headers.Authorization = `Bearer ${env.ERP_AUTH_TOKEN}`;

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
