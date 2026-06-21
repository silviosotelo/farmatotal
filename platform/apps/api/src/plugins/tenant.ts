import type { FastifyInstance, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { tenants } from "../db/schema/index.js";

/**
 * Resolución de tenant (multitenant). Setea `req.tenant` resolviendo por:
 *  1) header `x-tenant` (slug) — para dev/admin/SSR del store,
 *  2) dominio (Host) → tenants.domain,
 *  3) fallback al tenant `DEFAULT_TENANT` (env) o 'default'.
 * Cachea por proceso (tabla chica). Toda query del core se scopea con req.tenant.id.
 *
 * Se registra con `registerTenantResolver(app)` (no como plugin encapsulado) para
 * que el hook onRequest aplique global a todas las rutas.
 */
declare module "fastify" {
  interface FastifyRequest {
    tenant: { id: string; slug: string; config: Record<string, unknown> };
  }
}

type T = { id: string; slug: string; config: Record<string, unknown> };

const cols = { id: tenants.id, slug: tenants.slug, config: tenants.config };

export async function registerTenantResolver(app: FastifyInstance): Promise<void> {
  // Sin cache: la tabla tenants es chica e indexada (slug/domain unique) → 1 lookup
  // por request, y `config` siempre fresco (clave para el editor de perfil de rubro).
  async function bySlug(slug: string): Promise<T | undefined> {
    const [row] = await db.select(cols).from(tenants).where(eq(tenants.slug, slug)).limit(1);
    return row as T | undefined;
  }

  async function byDomain(domain: string): Promise<T | undefined> {
    const [row] = await db.select(cols).from(tenants).where(eq(tenants.domain, domain)).limit(1);
    return row as T | undefined;
  }

  const defaultSlug = process.env.DEFAULT_TENANT ?? "default";

  app.addHook("onRequest", async (req) => {
    const header = (req.headers["x-tenant"] as string | undefined)?.trim();
    // Host del usuario final reenviado por el store (multi-dominio) o el host propio.
    const fwdHost = (req.headers["x-tenant-host"] as string | undefined)?.trim();
    const host = (fwdHost || req.headers.host || "").split(":")[0];
    let t: T | undefined;
    if (header) {
      // Header de slug explícito: resuelve a ese tenant o a NINGUNO (no se filtra default).
      t = await bySlug(header);
    } else {
      // Por dominio (host reenviado o propio); si no matchea, fallback al tenant default.
      if (host) t = await byDomain(host);
      if (!t) t = await bySlug(defaultSlug);
    }
    // Tenant inexistente: nil UUID → las queries scopeadas devuelven vacío (sin error de cast).
    req.tenant = t ?? { id: "00000000-0000-0000-0000-000000000000", slug: header || defaultSlug, config: {} };
  });
}

/** Id del tenant del request (para scopear queries e inserts). */
export function tid(req: FastifyRequest): string {
  return req.tenant.id;
}
