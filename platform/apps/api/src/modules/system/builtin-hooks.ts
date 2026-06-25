/**
 * Registro de los handlers de hooks de los módulos built-in. Se llama una vez al
 * arrancar la API. Cada handler declara su `module` → solo corre si está activo
 * para el tenant (gating estilo WP "plugin activo").
 *
 * Acá viven las conexiones que ANTES eran llamadas directas hardcodeadas:
 *  - multi_inventory: descuenta stock por sucursal al confirmar la orden.
 */
import { registerAction } from "./hooks.js";
import { decrementOrderStock, restoreOrderStockById } from "../../services/inventory.js";
import { erpPushOrder } from "../erp_sync/push.js";

let registered = false;

export function registerBuiltinHooks() {
  if (registered) return; // idempotente (evita doble registro en hot-reload)
  registered = true;

  // multi_inventory — descuento de stock al confirmar.
  // En órdenes NO online (contraentrega/transferencia) se confirma al crearse.
  registerAction(
    "order.created",
    async (ctx) => {
      if (ctx.paymentMethod === "online") return; // online descuenta en order.paid
      await decrementOrderStock(ctx.orderId as string);
    },
    { module: "multi_inventory" },
  );
  // En órdenes online, al aprobarse el pago.
  registerAction(
    "order.paid",
    async (ctx) => {
      await decrementOrderStock(ctx.orderId as string);
    },
    { module: "multi_inventory" },
  );

  // erp_sync — push de pedidos al ERP (gateado por módulo activo + config.pushOrders).
  // No-online: al crearse. Online: al aprobarse el pago.
  registerAction(
    "order.created",
    async (ctx) => {
      if (ctx.paymentMethod === "online") return;
      await erpPushOrder(ctx.tenantId, ctx.orderId as string);
    },
    { module: "erp_sync" },
  );
  registerAction(
    "order.paid",
    async (ctx) => {
      await erpPushOrder(ctx.tenantId, ctx.orderId as string);
    },
    { module: "erp_sync" },
  );

  // multi_inventory — restaurar stock al cancelar un pedido.
  registerAction(
    "order.cancelled",
    async (ctx) => {
      await restoreOrderStockById(ctx.orderId as string, 'cancel');
    },
    { module: "multi_inventory" },
  );

  // multi_inventory — restaurar stock al reembolsar un pedido.
  registerAction(
    "order.refunded",
    async (ctx) => {
      await restoreOrderStockById(ctx.orderId as string, 'refund');
    },
    { module: "multi_inventory" },
  );
}
