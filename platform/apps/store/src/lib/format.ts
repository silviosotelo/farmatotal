/** Format an integer as Guaraníes: 68000 -> "₲ 68.000" */
export function formatGs(value: number): string {
  return "₲ " + (value ?? 0).toLocaleString("es-PY").replace(/,/g, ".");
}
