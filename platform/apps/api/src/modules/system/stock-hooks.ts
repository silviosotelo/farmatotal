import type { FastifyInstance } from "fastify"
import { restoreOrderStockById } from "../../services/inventory.js"

/**
 * Hooks que restauran stock cuando se cancela o reembolsa un pedido.
 * Se registra como plugin Fastify separado para no contaminar modules.routes.
 */
export async function stockRestoreHooks(app: FastifyInstance) {
  app.decorate('restoreStockOnCancel', async (order: {
    id: string
    tenantId: string
    branchId?: string
    lines: Array<{ productId: string; quantity: number }>
  }) => {
    await restoreOrderStockById(order.id, 'cancel')
  })

  app.decorate('restoreStockOnRefund', async (order: {
    id: string
    tenantId: string
    branchId?: string
    lines: Array<{ productId: string; quantity: number }>
  }) => {
    await restoreOrderStockById(order.id, 'refund')
  })
}
