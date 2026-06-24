export const gs = (n: number) =>
    '₲ ' + (n ?? 0).toLocaleString('es-PY').replace(/,/g, '.')

export const num = (n: number) =>
    new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(n || 0)
