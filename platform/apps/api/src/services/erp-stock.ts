/**
 * Cliente de stock EN VIVO del ERP de Farmatotal.
 * Replica el POST que hacía stock-validation.php del WordPress.
 */
import { Agent } from "undici";

const ERP_URL =
  "https://api.farmatotal.com.py/farma/next/ecommerce/producto/stock";

// La red corporativa hace MITM TLS; Node no confía en el cert del proxy.
// Dispatcher que ignora el cert SOLO para las llamadas al ERP (no global).
const erpDispatcher = new Agent({
  connect: { rejectUnauthorized: false },
});

export type ErpStockLine = {
  stk_articulo: string;
  stk_descripcion: string;
  stk_cant_act: number;
  stk_cant_sol: number;
  stk_sucursal: number;
  has_stock: string; // "true" | "false"
  is_valid: string;
  message: string;
};

export type ErpStockResult = {
  success: boolean;
  value?: ErpStockLine[];
};

export async function queryErpStock(
  erpCode: string,
  sku: string,
  quantity = 1,
): Promise<ErpStockResult> {
  const payload = {
    STK_SUCURSAL: erpCode,
    STK_DETALLE: [
      {
        STK_NRO_ITEM: 1,
        STK_ARTICULO: sku,
        STK_CANTIDAD: quantity,
        STK_PORC_DCTO: 0,
        STK_COD_PROMO: 0,
      },
    ],
  };

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(ERP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
      // @ts-expect-error undici dispatcher no está en los tipos de fetch global
      dispatcher: erpDispatcher,
    });
    if (!res.ok) return { success: false };
    return (await res.json()) as ErpStockResult;
  } catch {
    return { success: false };
  } finally {
    clearTimeout(t);
  }
}
