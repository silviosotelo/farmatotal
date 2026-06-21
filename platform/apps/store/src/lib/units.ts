/**
 * Helpers para cantidades decimales + unidad de medida.
 *
 * Principio de diseño: NO hay flag global. Todo deriva de `product.unitStep`
 * y `product.unit`:
 *  - El incremento +/- del carrito = `product.unitStep ?? 1` (en vez de ±1).
 *  - La etiqueta de unidad (ej. "1.5 kg") se muestra SOLO cuando `unit` existe y
 *    es distinta de "unidad"; si es "unidad" o falta, se muestra el número pelado.
 *  - Productos con step=1/unit="unidad" se comportan EXACTAMENTE igual que antes.
 */

/** Formatea una cantidad hasta 3 decimales, sin ceros sobrantes (1.500 -> "1.5"). */
export function formatQty(q: number): string {
  return String(Number(q.toFixed(3)));
}

/** Etiqueta de unidad a mostrar; vacía cuando es "unidad" o no existe. */
export function unitLabel(p: { unit?: string }): string {
  return p.unit && p.unit !== "unidad" ? p.unit : "";
}

/**
 * Avanza/retrocede una cantidad por `step`, redondeando a 3 decimales para
 * evitar drift de float, con clamp al mínimo (= step).
 */
export function stepQty(q: number, step: number, dir: 1 | -1): number {
  const s = step > 0 ? step : 1;
  const next = Math.round((q + dir * s) * 1000) / 1000;
  return next < s ? s : next;
}

/**
 * Valor para el botón "−" del carrito: baja un `step` y, si caería por debajo
 * de un incremento, devuelve 0 para que `setQty` ELIMINE la línea (preserva el
 * comportamiento clásico de "−" en cantidad 1). Usar solo para el "−".
 */
export function decQty(q: number, step: number): number {
  const s = step > 0 ? step : 1;
  const next = Math.round((q - s) * 1000) / 1000;
  return next < s ? 0 : next;
}
