/**
 * Tenant del storefront para fetches del lado cliente (multitenant).
 * Client-safe (NEXT_PUBLIC_). Para multi-dominio real el tenant se deriva del
 * Host en la API; acá default 'default' / override por env.
 */
export const CLIENT_TENANT = process.env.NEXT_PUBLIC_STORE_TENANT || "default";

/** Headers con el tenant para fetch() en client components. */
export function tenantHeaders(extra?: Record<string, string>): Record<string, string> {
  return { "x-tenant": CLIENT_TENANT, ...(extra ?? {}) };
}
