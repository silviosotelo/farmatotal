import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { env } from "./env.js";
import { registerTenantResolver } from "./plugins/tenant.js";
import { tenantRoutes } from "./modules/tenant/tenant.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { catalogRoutes } from "./modules/catalog/catalog.routes.js";
import { branchRoutes } from "./modules/branches/branches.routes.js";
import { orderRoutes } from "./modules/orders/orders.routes.js";
import { cmsRoutes } from "./modules/cms/cms.routes.js";
import { couponRoutes } from "./modules/coupons/coupons.routes.js";
import { customerRoutes } from "./modules/customers/customers.routes.js";
import { paymentRoutes } from "./modules/payments/payments.routes.js";
import { reviewRoutes } from "./modules/reviews/reviews.routes.js";
import { wishlistRoutes } from "./modules/wishlist/wishlist.routes.js";
import { variantRoutes } from "./modules/variants/variants.routes.js";
import { mediaRoutes } from "./modules/media/media.routes.js";
import { notificationRoutes } from "./modules/notifications/notifications.routes.js";
import { moduleRoutes } from "./modules/system/modules.routes.js";
import { pluginRoutes } from "./modules/plugins/plugins.routes.js";
import { registerBuiltinHooks } from "./modules/system/builtin-hooks.js";
import { registerErpAdapters } from "./modules/erp_sync/index.js";
import { erpSyncRoutes } from "./modules/erp_sync/erp-sync.routes.js";
import { whatsappRoutes } from "./modules/plugins/whatsapp.routes.js";
import { mailerRoutes } from "./modules/mailer/mailer.routes.js";
import { shippingRoutes } from "./modules/shipping/shipping.routes.js";
import { taxRoutes } from "./modules/tax/tax.routes.js";
import { usersRoutes } from "./modules/users/users.routes.js";
import { attributesRoutes } from "./modules/attributes/attributes.routes.js";
import { statsRoutes } from "./modules/stats/stats.routes.js";
import { stockRoutes } from "./modules/stock/stock.routes.js";
import { slidesRoutes } from "./modules/slides/slides.routes.js";
import { healthRoutes } from "./modules/health/health.routes.js";

export async function buildApp() {
  // Registra los handlers de hooks de los módulos built-in (estilo WP plugins_loaded).
  registerBuiltinHooks();
  // Registra los adapters del sincronizador ERP (Farmatotal, Woo, ...).
  registerErpAdapters();
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      transport:
        env.NODE_ENV === "production"
          ? undefined
          : { target: "pino-pretty", options: { translateTime: "HH:MM:ss.l", ignore: "pid,hostname" } },
    },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Acepta POST/PUT/PATCH sin Content-Type (body vacío) — evita 415 en logout y
  // otros endpoints que no requieren cuerpo (ej. Axios sin data).
  app.addContentTypeParser("*", { parseAs: "string" }, (_req, body, done) => {
    done(null, body || null);
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(sensible);
  await app.register(rateLimit, { max: 200, timeWindow: "1 minute" });
  await app.register(cookie);
  await app.register(cors, {
    origin: (origin, cb) => {
      // Permitir requests sin origin (curl, server-side) + allow-list + *.trycloudflare.com
      if (!origin) return cb(null, true);
      if (env.CORS_ORIGINS.includes(origin)) return cb(null, true);
      if (/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  });
  await app.register(jwt, {
    secret: { private: env.JWT_ACCESS_SECRET, public: env.JWT_ACCESS_SECRET },
  });

  // Multitenant: resuelve req.tenant (header x-tenant / dominio / default) en cada request.
  await registerTenantResolver(app);

  // Guard global: toda MUTACIÓN (POST/PUT/PATCH/DELETE) exige JWT, salvo la whitelist
  // de escrituras públicas del storefront (checkout, alta de review, pagos, auth).
  // Las lecturas (GET) quedan abiertas para el storefront.
  const PUBLIC_WRITES = new Set([
    "POST /auth/login",
    "POST /auth/register",
    "POST /auth/refresh",
    "POST /auth/logout",
    "POST /auth/bootstrap",
    "POST /orders/checkout",
    "POST /reviews",
    "POST /payments/bancard/create",
    "POST /payments/bancard/confirm",
  ]);
  const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
  app.addHook("onRequest", async (req, reply) => {
    if (!MUTATING.has(req.method)) return;
    const routePath = (req.routeOptions?.url ?? req.url).split("?")[0];
    if (PUBLIC_WRITES.has(`${req.method} ${routePath}`)) return;
    try {
      await req.jwtVerify();
    } catch {
      return reply.unauthorized("Autenticación requerida para esta operación");
    }
  });

  await app.register(swagger, {
    transform: jsonSchemaTransform,
    openapi: {
      info: { title: "Platform API", version: "0.1.0" },
      servers: [{ url: `http://localhost:${env.API_PORT}` }],
    },
  });
  await app.register(swaggerUI, { routePrefix: "/docs" });

  await app.register(healthRoutes);
  await app.register(tenantRoutes);
  await app.register(authRoutes);
  await app.register(catalogRoutes);
  await app.register(branchRoutes);
  await app.register(orderRoutes);
  await app.register(cmsRoutes);
  await app.register(couponRoutes);
  await app.register(customerRoutes);
  await app.register(paymentRoutes);
  await app.register(reviewRoutes);
  await app.register(wishlistRoutes);
  await app.register(variantRoutes);
  await app.register(mediaRoutes);
  await app.register(notificationRoutes);
  await app.register(moduleRoutes);
  await app.register(pluginRoutes);
  await app.register(erpSyncRoutes);
  await app.register(whatsappRoutes);
  await app.register(mailerRoutes);
  await app.register(shippingRoutes);
  await app.register(taxRoutes);
  await app.register(usersRoutes);
  await app.register(attributesRoutes);
  await app.register(statsRoutes);

  // Worker de la cola de emails: procesa pendientes cada 30s (no en tests).
  if (env.NODE_ENV !== "test") {
    const { processQueue } = await import("./services/mailer.js");
    setInterval(() => {
      processQueue(25).catch((e) => app.log.warn({ e: String(e) }, "mailer worker"));
    }, 30_000).unref();
  }
  await app.register(stockRoutes);
  await app.register(slidesRoutes);

  return app;
}
