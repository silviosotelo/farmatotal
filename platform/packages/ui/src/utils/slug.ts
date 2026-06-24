export const slug = (s: string, separator = '-', fallback = '') =>
    s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, separator)
        .replace(new RegExp(`(^${separator}|${separator}$)`), '') ||
    fallback
