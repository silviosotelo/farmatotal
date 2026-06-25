type InventoryStock = {
  branchId: string
  stock: number
  lat?: number
  lng?: number
}

type OrderFlowConfig = {
  orderFlowOption?: string
  orderFlowCustomInventory?: string
  orderFlowFallback?: string
}

/** Auto-assign inventory based on order flow config */
export function resolveInventory(
  config: OrderFlowConfig,
  inventories: InventoryStock[],
  userLat?: number,
  userLng?: number,
): string | null {
  const option = config.orderFlowOption || 'most_stock'
  const available = inventories.filter(i => i.stock > 0)
  if (available.length === 0) return null

  switch (option) {
    case 'custom':
      return config.orderFlowCustomInventory || null
    case 'most_stock':
      return available.sort((a, b) => b.stock - a.stock)[0]?.branchId || null
    case 'lowest_stock':
      return available.sort((a, b) => a.stock - b.stock)[0]?.branchId || null
    case 'name':
      return available.sort((a, b) => a.branchId.localeCompare(b.branchId))[0]?.branchId || null
    case 'distance':
      if (!userLat || !userLng) return config.orderFlowFallback || available[0]?.branchId || null
      return available
        .map(i => ({ ...i, dist: haversineKm(userLat, userLng, i.lat || 0, i.lng || 0) }))
        .sort((a, b) => a.dist - b.dist)[0]?.branchId || null
    case 'order':
    default:
      return available[0]?.branchId || null
  }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}
